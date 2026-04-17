/**
 * Webhook handlers - Payment webhooks from Flutterwave
 */

import * as functions from 'firebase-functions';
import * as flutterwaveService from '../services/flutterwave';
import * as invoicing from '../services/invoicing';
import { NAIRA_RATE, OVERPAYMENT_TOLERANCE_FACTOR } from '../types';
import {
  checkoutRepo,
  userRepo,
  transactionRepo,
  serverTimestamp,
  newBatch,
} from '../repositories';

export const flutterwaveWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const signature = (
      req.header('verif-hash') || req.header('x-flutterwave-signature') || ''
    ).trim();
    const rawBody = (req.rawBody || Buffer.from(JSON.stringify(req.body))).toString('utf8');

    if (!flutterwaveService.validateWebhookSignature(rawBody, signature)) {
      functions.logger.warn('Invalid Flutterwave webhook signature');
      res.status(401).send('Invalid signature');
      return;
    }

    const payload = req.body as any;
    const event = payload?.event;
    const data = payload?.data;
    const txRef = String(data?.tx_ref || '');

    if (event !== 'charge.completed' || !txRef) {
      res.status(200).send('Ignored');
      return;
    }

    // Handle failed charges
    if (data?.status !== 'successful') {
      await checkoutRepo.merge(txRef, {
        status: 'failed',
        updatedAt: serverTimestamp(),
        providerPayload: data || null,
      });
      res.status(200).send('Recorded failed payment');
      return;
    }

    // Get checkout session
    const sessionSnap = await checkoutRepo.getSnapByTxRef(txRef);
    if (!sessionSnap.exists) {
      functions.logger.error('No checkout session for txRef', { txRef });
      res.status(404).send('Session not found');
      return;
    }

    const session = sessionSnap.data() as {
      userId: string;
      items: any[];
      totalAmountNgn: number;
      status: string;
      expiresAt?: any;
    };

    // Check if already processed or in progress
    if (session.status === 'completed' || session.status === 'processing') {
      res.status(200).send('Already processed');
      return;
    }

    // Check if session expired
    if (session.expiresAt && typeof session.expiresAt.toMillis === 'function') {
      if (session.expiresAt.toMillis() < Date.now()) {
        await checkoutRepo.merge(txRef, { status: 'expired', updatedAt: serverTimestamp() });
        res.status(200).send('Session expired');
        return;
      }
    }

    // Validate payment details
    const paymentCurrency = String(data?.currency || '').toUpperCase();
    if (paymentCurrency !== 'NGN') {
      await checkoutRepo.merge(txRef, {
        status: 'invalid_currency',
        updatedAt: serverTimestamp(),
        providerPayload: data || null,
      });
      res.status(400).send('Invalid currency');
      return;
    }

    // Round to integer NGN to avoid float comparison issues from Flutterwave
    const paidAmount = Math.round(Number(data?.amount || 0));
    const maxAcceptable = Math.round(session.totalAmountNgn * OVERPAYMENT_TOLERANCE_FACTOR);
    if (!Number.isFinite(paidAmount) || paidAmount < session.totalAmountNgn || paidAmount > maxAcceptable) {
      await checkoutRepo.merge(txRef, {
        status: 'amount_mismatch',
        updatedAt: serverTimestamp(),
        paidAmount,
      });
      functions.logger.error('Amount mismatch', {
        txRef,
        expected: session.totalAmountNgn,
        paidAmount,
      });
      res.status(400).send('Amount mismatch');
      return;
    }

    // Mark session as processing to prevent retry loops
    await checkoutRepo.merge(txRef, { status: 'processing', updatedAt: serverTimestamp() });

    // Create purchase records with deterministic IDs
    const batchWrite = newBatch();
    const now = serverTimestamp();

    // Exchange rate used at checkout time (stored in session for audit trail)
    const exchangeRate = (session as any).exchangeRateNgnPerUsd || NAIRA_RATE;

    for (const item of session.items) {
      const txnId = `${txRef}_${item.id}`;
      const listingId = String(item.listingId || item.id);
      const itemPriceUsd = Number(item.price || 0);
      const itemPriceNgn = Math.round(itemPriceUsd * exchangeRate);

      batchWrite.set(transactionRepo.ref(txnId), {
        trackId: listingId,
        buyerId: session.userId,
        sellerId: item.uploaderId,
        priceUsd: itemPriceUsd,
        amountNgn: itemPriceNgn,
        exchangeRateNgnPerUsd: exchangeRate,
        trackTitle: item.title,
        licenseTierId: item.licenseTierId || 'basic',
        licenseTierTitle: item.licenseTierTitle || 'Basic',
        status: 'completed',
        paymentProvider: 'flutterwave',
        flutterwaveTxRef: txRef,
        createdAt: now,
      });

      batchWrite.set(userRepo.purchaseRef(session.userId, txnId), {
        trackId: listingId,
        title: item.title,
        artist: item.artist,
        priceUsd: itemPriceUsd,
        amountNgn: itemPriceNgn,
        exchangeRateNgnPerUsd: exchangeRate,
        uploaderId: item.uploaderId,
        audioUrl: item.audioUrl || '',
        coverUrl: item.coverUrl || '',
        licenseTierId: item.licenseTierId || 'basic',
        licenseTierTitle: item.licenseTierTitle || 'Basic',
        purchasedAt: now,
      });
    }

    batchWrite.set(
      checkoutRepo.ref(txRef),
      {
        status: 'completed',
        providerTransactionId: data?.id || null,
        paidAmount,
        updatedAt: now,
      },
      { merge: true }
    );

    await batchWrite.commit();

    // Send receipt email (non-blocking)
    try {
      const userData = await userRepo.getById(session.userId);
      const recipientEmail = String(userData?.email || '').trim();
      const recipientName = String(userData?.fullName || userData?.name || 'Shoouts User').trim();

      if (recipientEmail) {
        const exchangeRateForEmail = (session as any).exchangeRateNgnPerUsd || NAIRA_RATE;
        const lineItems = session.items.map((item) => {
          const usd = Number(item.price || 0);
          const lineNgn = Math.round(usd * exchangeRateForEmail);
          const licenseTitle = String(item.licenseTierTitle || 'Basic').trim();
          return {
            description: `${item.title} by ${item.artist} (${licenseTitle} license)`,
            qty: 1,
            unitAmountNgn: lineNgn,
            totalAmountNgn: lineNgn,
          };
        });

        await invoicing.createReceiptEmail({
          userId: session.userId,
          recipientEmail,
          recipientName,
          lineItems,
          totalChargedNgn: paidAmount,
          subject: 'Shoouts Purchase Receipt',
          invoicePrefix: 'PUR',
          notes: `Payment reference: ${txRef}`,
        });
      }
    } catch (emailError) {
      functions.logger.error('Purchase email/invoice generation failed', emailError);
    }

    res.status(200).send('Processed');
  } catch (error) {
    functions.logger.error('flutterwaveWebhook failed', error);
    res.status(500).send('Internal error');
  }
});
