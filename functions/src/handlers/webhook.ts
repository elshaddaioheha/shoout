/**
 * Webhook handlers - Payment webhooks from Flutterwave
 */

import * as functions from 'firebase-functions';
import * as flutterwaveService from '../services/flutterwave';
import * as invoicing from '../services/invoicing';
import { getDb, serverTimestamp, batch } from '../utils/firebase';
import { NAIRA_RATE } from '../types';

/**
 * flutterwaveWebhook - Processes Flutterwave charge.completed webhooks
 */
export const flutterwaveWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // Verify webhook signature
    const signature = (
      req.header('verif-hash') ||
      req.header('x-flutterwave-signature') ||
      ''
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

    // Only process charge.completed events
    if (event !== 'charge.completed' || !txRef) {
      res.status(200).send('Ignored');
      return;
    }

    const db = getDb();

    // Handle failed charges
    if (data?.status !== 'successful') {
      await db.collection('checkoutSessions').doc(txRef).set(
        {
          status: 'failed',
          updatedAt: serverTimestamp(),
          providerPayload: data || null,
        },
        { merge: true }
      );
      res.status(200).send('Recorded failed payment');
      return;
    }

    // Get checkout session
    const sessionRef = db.collection('checkoutSessions').doc(txRef);
    const sessionSnap = await sessionRef.get();

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

    // Check if already processed
    if (session.status === 'completed') {
      res.status(200).send('Already processed');
      return;
    }

    // Check if session expired
    if (session.expiresAt && typeof session.expiresAt.toMillis === 'function') {
      if (session.expiresAt.toMillis() < Date.now()) {
        await sessionRef.set(
          {
            status: 'expired',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        res.status(200).send('Session expired');
        return;
      }
    }

    // Validate payment details
    const paymentCurrency = String(data?.currency || '').toUpperCase();
    if (paymentCurrency !== 'NGN') {
      await sessionRef.set(
        {
          status: 'invalid_currency',
          updatedAt: serverTimestamp(),
          providerPayload: data || null,
        },
        { merge: true }
      );
      res.status(400).send('Invalid currency');
      return;
    }

    const paidAmount = Number(data?.amount || 0);
    if (!Number.isFinite(paidAmount) || paidAmount < session.totalAmountNgn) {
      await sessionRef.set(
        {
          status: 'amount_mismatch',
          updatedAt: serverTimestamp(),
          paidAmount,
        },
        { merge: true }
      );
      functions.logger.error('Amount mismatch', {
        txRef,
        expected: session.totalAmountNgn,
        paidAmount,
      });
      res.status(400).send('Amount mismatch');
      return;
    }

    // Create purchase records
    const batchWrite = batch();
    const now = serverTimestamp();

    for (const item of session.items) {
      const txnRef = db.collection('transactions').doc();
      batchWrite.set(txnRef, {
        trackId: item.id,
        buyerId: session.userId,
        sellerId: item.uploaderId,
        amount: item.price,
        trackTitle: item.title,
        status: 'completed',
        paymentProvider: 'flutterwave',
        flutterwaveTxRef: txRef,
        createdAt: now,
      });

      const purchaseRef = db
        .collection('users')
        .doc(session.userId)
        .collection('purchases')
        .doc();

      batchWrite.set(purchaseRef, {
        trackId: item.id,
        title: item.title,
        artist: item.artist,
        price: item.price,
        uploaderId: item.uploaderId,
        audioUrl: item.audioUrl || '',
        coverUrl: item.coverUrl || '',
        purchasedAt: now,
      });
    }

    batchWrite.set(
      sessionRef,
      {
        status: 'completed',
        providerTransactionId: data?.id || null,
        paidAmount,
        updatedAt: now,
      },
      { merge: true }
    );

    await batchWrite.commit();

    // Send receipt email
    try {
      const userRef = db.collection('users').doc(session.userId);
      const userSnap = await userRef.get();
      const userData = userSnap.data() as Record<string, any> | undefined;
      const recipientEmail = String(userData?.email || '').trim();
      const recipientName = String(userData?.fullName || userData?.name || 'Shoouts User').trim();

      if (recipientEmail) {
        const lineItems = session.items.map((item) => {
          const usd = Number(item.price || 0);
          const lineNgn = Math.round(usd * NAIRA_RATE);
          return {
            description: `${item.title} by ${item.artist}`,
            qty: 1,
            unitAmountNgn: lineNgn,
            totalAmountNgn: lineNgn,
          };
        });

        const subtotal = lineItems.reduce((sum, line) => sum + line.totalAmountNgn, 0);
        const vat = Math.round(subtotal * 0.075);
        const total = subtotal + vat;

        await invoicing.createInvoiceAndSendEmail({
          userId: session.userId,
          recipientEmail,
          recipientName,
          lineItems,
          subject: 'Shoouts Purchase Receipt & Invoice',
          invoicePrefix: 'PUR',
          notes: `Payment reference: ${txRef}`,
        });
      }
    } catch (emailError) {
      functions.logger.error('Purchase email/invoice generation failed', emailError);
      // Don't fail the webhook if email fails
    }

    res.status(200).send('Processed');
  } catch (error) {
    functions.logger.error('flutterwaveWebhook failed', error);
    res.status(500).send('Internal error');
  }
});
