/**
 * Subscription handlers - Subscription activation and downgrade
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as invoicing from '../services/invoicing';
import { OVERPAYMENT_TOLERANCE_FACTOR } from '../types';
import { userRepo, paymentRepo, serverTimestamp } from '../repositories';
import {
  isValidPlan,
  isFreePlan,
  isPaidPlan,
  SubscriptionPlan,
  BillingCycle,
} from '../subscriptions/catalog';
import {
  activate,
  getExpectedAmountNgn,
  calculateExpiryDate,
  downgradeExpiredSubscriptions as bulkDowngrade,
} from '../subscriptions/lifecycle';

export const activateSubscriptionTier = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const authHeader = String(req.header('authorization') || '');
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Missing bearer token' });
      return;
    }

    const idToken = authHeader.slice('Bearer '.length).trim();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userId = decoded.uid;

    const planId = String(req.body?.planId || '').trim();
    const billingCycleRaw = String(req.body?.billingCycle || 'monthly').toLowerCase();
    const billingCycle: BillingCycle = billingCycleRaw === 'annual' ? 'annual' : 'monthly';
    const txRef = String(req.body?.txRef || '').trim();

    if (!planId || !isValidPlan(planId)) {
      res.status(400).json({ success: false, error: 'Invalid or missing planId' });
      return;
    }

    const plan = planId as SubscriptionPlan;
    const expectedAmountNgn = getExpectedAmountNgn(plan, billingCycle);
    const free = isFreePlan(plan);

    if (!free && !txRef) {
      res.status(400).json({ success: false, error: 'txRef is required for paid plans' });
      return;
    }

    let verifiedAmountNgn = expectedAmountNgn;
    let providerTransactionId: string | null = null;

    if (!free) {
      const flutterwaveService = await import('../services/flutterwave');

      // Idempotency: only skip if fully completed. Re-verify if stuck in processing.
      const existing = await paymentRepo.getByTxRef(txRef);
      if (existing) {
        const e = existing as Record<string, any>;
        if (e.status === 'completed') {
          res.status(200).json({ success: true, alreadyProcessed: true, planId: e.planId });
          return;
        }
        // processing status = previous attempt may have failed mid-flight. Re-verify below.
      }

      // Mark as processing before verification
      await paymentRepo.merge(txRef, {
        userId, planId, billingCycle,
        status: 'processing',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      try {
        const verifyPayload = await flutterwaveService.verifyFlutterwaveTransaction(txRef);
        const paymentData = verifyPayload?.data;
        const paymentStatus = String(paymentData?.status || '').toLowerCase();
        const paymentCurrency = String(paymentData?.currency || '').toUpperCase();
        // Round to integer NGN to avoid float comparison issues
        const paidAmount = Math.round(Number(paymentData?.amount || 0));
        const maxAcceptable = Math.round(expectedAmountNgn * OVERPAYMENT_TOLERANCE_FACTOR);

        if (paymentStatus !== 'successful') {
          res.status(400).json({ success: false, error: 'Payment not successful' });
          return;
        }
        if (String(paymentData?.tx_ref || '') !== txRef) {
          res.status(400).json({ success: false, error: 'txRef mismatch' });
          return;
        }
        if (paymentCurrency !== 'NGN') {
          res.status(400).json({ success: false, error: 'Invalid payment currency' });
          return;
        }
        if (!Number.isFinite(paidAmount) || paidAmount < expectedAmountNgn || paidAmount > maxAcceptable) {
          res.status(400).json({ success: false, error: 'Paid amount is invalid or out of range' });
          return;
        }

        verifiedAmountNgn = paidAmount;
        providerTransactionId = String(paymentData?.id || '');
      } catch (error) {
        functions.logger.error('Payment verification failed', error);
        res.status(400).json({ success: false, error: 'Unable to verify payment' });
        return;
      }
    }

    // Activate via lifecycle module — rollback on failure
    try {
      await activate(userId, {
        planId: plan,
        billingCycle,
        txRef: free ? undefined : txRef,
        verifiedAmountNgn,
        providerTransactionId,
        actor: 'user',
      });
    } catch (activationError) {
      if (!free && txRef) {
        await paymentRepo.merge(txRef, { status: 'failed', updatedAt: serverTimestamp() });
      }
      throw activationError;
    }

    // Send invoice (non-blocking)
    try {
      const userData = await userRepo.getById(userId);
      const recipientEmail = String(userData?.email || decoded.email || '').trim();
      const recipientName = String(userData?.fullName || userData?.name || 'Shoouts User').trim();

      if (recipientEmail && !free) {
        await invoicing.createReceiptEmail({
          userId,
          recipientEmail,
          recipientName,
          lineItems: [{
            description: `Subscription: ${planId} (${billingCycle})`,
            qty: 1,
            unitAmountNgn: verifiedAmountNgn,
            totalAmountNgn: verifiedAmountNgn,
          }],
          totalChargedNgn: verifiedAmountNgn,
          subject: `Shoouts Subscription Update: ${planId}`,
          invoicePrefix: 'SUB',
          notes: `Your plan is active until ${calculateExpiryDate(billingCycle).toISOString()}.`,
        });
      }
    } catch (emailError) {
      functions.logger.error('Subscription email/invoice generation failed', emailError);
    }

    res.status(200).json({ success: true, planId, billingCycle });
  } catch (error: any) {
    functions.logger.error('activateSubscriptionTier failed', error);
    res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
});

export const downgradeExpiredSubscriptions = onSchedule(
  { schedule: 'every 24 hours' },
  async () => {
    await bulkDowngrade();
  }
);
