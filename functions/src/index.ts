import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import * as functions from 'firebase-functions';
import * as functionsV1 from 'firebase-functions/v1';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import PDFDocument from 'pdfkit';
import {
  buildMailQueuePayload,
  calculateSubscriptionExpiryDate,
  firestoreExpiredSubscriptionDocPatch,
  firestoreExpiredUserRolePatch,
  invoiceStoragePath,
  type SubscriptionBillingCycle,
} from './subscriptionLifecycle';

admin.initializeApp();
const db = admin.firestore();

type AdminRole = 'admin' | 'moderator' | 'auditor';

function getUserRoleFromContext(context: any): AdminRole | null {
  return (context?.auth?.token?.role as AdminRole) ?? null;
}

function assertRole(context: any, allowedRoles: AdminRole[], message?: string) {
  const role = getUserRoleFromContext(context);
  if (!role || !allowedRoles.includes(role)) {
    throw new functions.https.HttpsError('permission-denied', message || 'Insufficient privileges');
  }
}

async function logAdminAction(params: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  details?: any;
}) {
  await db.collection('moderationLog').add({
    actorId: params.actorId,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    reason: params.reason || null,
    details: params.details || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

type CheckoutItem = {
  id: string;
  title: string;
  artist: string;
  price: number;
  uploaderId: string;
  audioUrl?: string;
  coverUrl?: string;
};

type CreateCheckoutSessionData = {
  items: CheckoutItem[];
  totalAmountUsd: number;
};

type GetCheckoutStatusData = {
  txRef: string;
};

const NAIRA_RATE = 1600;

/** Canonical USD list prices; Flutterwave charges Math.round(usd * NAIRA_RATE) in NGN. */
const SUBSCRIPTION_PLAN_PRICING_USD: Record<string, { monthly: number; annualTotal: number }> = {
  vault: { monthly: 0, annualTotal: 0 },
  vault_pro: { monthly: 13962 / NAIRA_RATE, annualTotal: (13962 * 12) / NAIRA_RATE },
  studio: { monthly: 27000 / NAIRA_RATE, annualTotal: (22950 * 12) / NAIRA_RATE },
  hybrid: { monthly: 34906 / NAIRA_RATE, annualTotal: (29670 * 12) / NAIRA_RATE },
};

/** License add-on SKUs must match `app/listing/[id].tsx` LICENSE_OPTIONS (USD). */
const LICENSE_USD_PRICES: Record<string, number> = {
  mp3_tagged: 4.95,
  wav_2_free: 24.99,
  unlimited_wav_4_free: 32.99,
  unlimited_stems_9_free: 51.99,
};

const LICENSE_SKUS_ORDERED = Object.keys(LICENSE_USD_PRICES).sort((a, b) => b.length - a.length);

const CART_TOTAL_EPSILON = 0.02;

function parseCartItemId(rawId: string): { uploadId: string; licenseSku: string | null } {
  for (const sku of LICENSE_SKUS_ORDERED) {
    const suf = '_' + sku;
    if (rawId.endsWith(suf)) {
      return { uploadId: rawId.slice(0, -suf.length), licenseSku: sku };
    }
  }
  return { uploadId: rawId, licenseSku: null };
}

async function resolveCheckoutLine(raw: CheckoutItem): Promise<CheckoutItem> {
  const uploaderId = String(raw.uploaderId || '').trim();
  const { uploadId, licenseSku } = parseCartItemId(String(raw.id || '').trim());
  if (!uploadId || !uploaderId) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid cart item');
  }

  const snap = await db.collection('users').doc(uploaderId).collection('uploads').doc(uploadId).get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Listing not found');
  }

  const d = snap.data() as Record<string, any>;
  if (d.isPublic !== true) {
    throw new functions.https.HttpsError('failed-precondition', 'Listing is not public');
  }

  let priceUsd: number;
  if (licenseSku && LICENSE_USD_PRICES[licenseSku] != null) {
    priceUsd = LICENSE_USD_PRICES[licenseSku];
  } else {
    priceUsd = Number(d.price);
  }

  if (!Number.isFinite(priceUsd) || priceUsd < 0) {
    throw new functions.https.HttpsError('failed-precondition', 'Invalid listing price');
  }

  priceUsd = Math.round(priceUsd * 100) / 100;

  return {
    id: raw.id,
    uploaderId,
    title: String(d.title || raw.title || 'Track'),
    artist: String(d.uploaderName || d.artist || raw.artist || 'Artist'),
    price: priceUsd,
    audioUrl: String(d.audioUrl || raw.audioUrl || ''),
    coverUrl: String(d.coverUrl || raw.coverUrl || ''),
  };
}

const FREE_SUBSCRIPTION_PLANS = new Set(['vault']);
const EMAIL_COLLECTION = process.env.FIREBASE_TRIGGER_EMAIL_COLLECTION || 'mail';

function expectedAmountInNgn(totalUsd: number): number {
  return Math.round(totalUsd * NAIRA_RATE);
}

function getFlutterwaveSecret(): string {
  return process.env.FLUTTERWAVE_SECRET_HASH || functions.config()?.flutterwave?.secret_hash || '';
}

function getFlutterwaveSecretKey(): string {
  return process.env.FLUTTERWAVE_SECRET_KEY || functions.config()?.flutterwave?.secret_key || '';
}

function getExpectedSubscriptionAmountNgn(planId: string, billingCycle: SubscriptionBillingCycle): number {
  const pricing = SUBSCRIPTION_PLAN_PRICING_USD[planId];
  if (!pricing) {
    throw new functions.https.HttpsError('invalid-argument', `Unsupported planId: ${planId}`);
  }
  const usd = billingCycle === 'annual' ? pricing.annualTotal : pricing.monthly;
  return Math.round(usd * NAIRA_RATE);
}

function verifyWebhookSignature(rawBody: string, signature: string | undefined, secret: string): boolean {
  if (!signature || !secret) return false;
  const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return hash === signature;
}

function calculateSubscriptionExpiry(billingCycle: SubscriptionBillingCycle): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(calculateSubscriptionExpiryDate(billingCycle));
}

type InvoiceLine = { description: string; qty: number; unitAmountNgn: number; totalAmountNgn: number };

async function renderInvoicePdfBuffer(params: {
  invoiceNumber: string;
  issuedTo: string;
  email: string;
  issuedAt: Date;
  lineItems: InvoiceLine[];
  subtotalNgn: number;
  vatNgn: number;
  totalNgn: number;
  notes?: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('SHOOUTS TAX INVOICE', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Invoice No: ${params.invoiceNumber}`);
    doc.text(`Issued: ${params.issuedAt.toISOString()}`);
    doc.text(`Bill To: ${params.issuedTo}`);
    doc.text(`Email: ${params.email}`);
    doc.moveDown(1);

    doc.fontSize(12).text('Items', { underline: true });
    doc.moveDown(0.4);
    params.lineItems.forEach((line) => {
      doc
        .fontSize(10)
        .text(`${line.description}  | Qty: ${line.qty}  | Unit: NGN ${line.unitAmountNgn.toLocaleString()}  | Total: NGN ${line.totalAmountNgn.toLocaleString()}`);
    });

    doc.moveDown(1);
    doc.fontSize(11).text(`Subtotal: NGN ${params.subtotalNgn.toLocaleString()}`);
    doc.text(`VAT (7.5%): NGN ${params.vatNgn.toLocaleString()}`);
    doc.fontSize(13).text(`Grand Total: NGN ${params.totalNgn.toLocaleString()}`, { underline: true });
    if (params.notes) {
      doc.moveDown(1);
      doc.fontSize(10).text(`Notes: ${params.notes}`);
    }
    doc.moveDown(1);
    doc.fontSize(9).text('Shoouts Finance • This document is system generated.', { align: 'left' });
    doc.end();
  });
}

async function createInvoiceAndGetUrl(params: {
  userId: string;
  invoiceNumber: string;
  issuedTo: string;
  email: string;
  lineItems: InvoiceLine[];
  subtotalNgn: number;
  vatNgn: number;
  totalNgn: number;
  notes?: string;
}): Promise<string> {
  const buffer = await renderInvoicePdfBuffer({
    invoiceNumber: params.invoiceNumber,
    issuedTo: params.issuedTo,
    email: params.email,
    issuedAt: new Date(),
    lineItems: params.lineItems,
    subtotalNgn: params.subtotalNgn,
    vatNgn: params.vatNgn,
    totalNgn: params.totalNgn,
    notes: params.notes,
  });

  const bucket = admin.storage().bucket();
  const filePath = invoiceStoragePath(params.userId, params.invoiceNumber);
  const file = bucket.file(filePath);
  await file.save(buffer, {
    resumable: false,
    contentType: 'application/pdf',
    metadata: { cacheControl: 'private, max-age=3600' },
  });

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 1000 * 60 * 60 * 24 * 30,
  });
  return signedUrl;
}

async function queueEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  await db.collection(EMAIL_COLLECTION).add({
    ...buildMailQueuePayload(params),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

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
    const billingCycle: SubscriptionBillingCycle = billingCycleRaw === 'annual' ? 'annual' : 'monthly';
    const txRef = String(req.body?.txRef || '').trim();

    if (!planId) {
      res.status(400).json({ success: false, error: 'planId is required' });
      return;
    }

    const expectedAmountNgn = getExpectedSubscriptionAmountNgn(planId, billingCycle);
    const isFreeTier = expectedAmountNgn === 0 && FREE_SUBSCRIPTION_PLANS.has(planId);
    if (expectedAmountNgn > 0 && !txRef) {
      res.status(400).json({ success: false, error: 'txRef is required for paid plans' });
      return;
    }

    let verifiedAmountNgn = expectedAmountNgn;
    let providerTransactionId: string | null = null;

    if (!isFreeTier) {
      const secretKey = getFlutterwaveSecretKey();
      if (!secretKey) {
        functions.logger.error('FLUTTERWAVE_SECRET_KEY is not configured');
        res.status(500).json({ success: false, error: 'Payment verification is unavailable' });
        return;
      }

      const paymentRef = db.collection('subscriptionPayments').doc(txRef);
      const existingPaymentSnap = await paymentRef.get();

      if (existingPaymentSnap.exists) {
        const existing = existingPaymentSnap.data() as Record<string, any>;
        if (existing.userId === userId && existing.planId === planId && existing.status === 'completed') {
          res.status(200).json({ success: true, alreadyProcessed: true, planId });
          return;
        }
      }

      const verifyUrl = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`;
      const verifyResponse = await fetch(verifyUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!verifyResponse.ok) {
        functions.logger.error('Flutterwave verify request failed', { status: verifyResponse.status, txRef });
        res.status(400).json({ success: false, error: 'Unable to verify payment' });
        return;
      }

      const verifyPayload = (await verifyResponse.json()) as any;
      const paymentData = verifyPayload?.data || {};
      const paymentStatus = String(paymentData?.status || '').toLowerCase();
      const paymentCurrency = String(paymentData?.currency || '').toUpperCase();
      const paidAmount = Number(paymentData?.amount || 0);

      if (verifyPayload?.status !== 'success' || paymentStatus !== 'successful') {
        res.status(400).json({ success: false, error: 'Payment not successful' });
        return;
      }

      if (String(paymentData?.tx_ref || '') !== txRef) {
        res.status(400).json({ success: false, error: 'txRef mismatch' });
        return;
      }

      if (!Number.isFinite(paidAmount) || paidAmount < expectedAmountNgn) {
        res.status(400).json({ success: false, error: 'Paid amount is invalid' });
        return;
      }

      if (paymentCurrency !== 'NGN') {
        res.status(400).json({ success: false, error: 'Invalid payment currency' });
        return;
      }

      verifiedAmountNgn = paidAmount;
      providerTransactionId = String(paymentData?.id || '');
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const expiresAt = isFreeTier ? null : calculateSubscriptionExpiry(billingCycle);
    const subscriptionStatus = isFreeTier ? 'trial' : 'active';
    const userRef = db.collection('users').doc(userId);
    const subscriptionRef = userRef.collection('subscription').doc('current');
    const batch = db.batch();

    batch.set(
      subscriptionRef,
      {
        tier: planId,
        status: subscriptionStatus,
        isSubscribed: !isFreeTier,
        billingCycle: isFreeTier ? null : billingCycle,
        expiresAt,
        amountNgn: verifiedAmountNgn,
        provider: isFreeTier ? 'internal' : 'flutterwave',
        txRef: isFreeTier ? null : txRef,
        providerTransactionId,
        updatedAt: now,
        activatedAt: now,
      },
      { merge: true }
    );

    batch.set(
      userRef,
      {
        role: planId,
        lastSubscribedAt: now,
        subscriptionStatus,
      },
      { merge: true }
    );

    if (!isFreeTier) {
      const paymentRef = db.collection('subscriptionPayments').doc(txRef);
      batch.set(
        paymentRef,
        {
          userId,
          planId,
          billingCycle,
          status: 'completed',
          amountNgn: verifiedAmountNgn,
          expectedAmountNgn,
          provider: 'flutterwave',
          providerTransactionId,
          updatedAt: now,
          createdAt: now,
        },
        { merge: true }
      );
    }

    await batch.commit();

    try {
      const userSnap = await userRef.get();
      const userData = userSnap.data() as Record<string, any> | undefined;
      const recipientEmail = String(userData?.email || decoded.email || '').trim();
      const recipientName = String(userData?.fullName || userData?.name || 'Shoouts User').trim();

      if (recipientEmail) {
        const subtotal = verifiedAmountNgn;
        const vat = Math.round(subtotal * 0.075);
        const total = subtotal + vat;
        const invoiceNumber = `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        const invoiceUrl = await createInvoiceAndGetUrl({
          userId,
          invoiceNumber,
          issuedTo: recipientName,
          email: recipientEmail,
          lineItems: [
            {
              description: `Subscription: ${planId} (${isFreeTier ? 'trial' : billingCycle})`,
              qty: 1,
              unitAmountNgn: subtotal,
              totalAmountNgn: subtotal,
            },
          ],
          subtotalNgn: subtotal,
          vatNgn: vat,
          totalNgn: total,
          notes: isFreeTier
            ? 'Your account is currently on the free/trial Vault tier.'
            : `Your plan is active until ${expiresAt?.toDate().toISOString()}.`,
        });

        await queueEmail({
          to: recipientEmail,
          subject: `Shoouts Subscription Update: ${planId}`,
          text: `Hi ${recipientName}, your subscription is now ${planId} (${subscriptionStatus}). Invoice: ${invoiceUrl}`,
          html: `<p>Hi ${recipientName},</p><p>Your subscription is now <strong>${planId}</strong> (${subscriptionStatus}).</p><p>Invoice: <a href="${invoiceUrl}">Download PDF invoice</a></p>`,
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

export const createCheckoutSession = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const userId = context.auth.uid;
  const rawItems = (data?.items || []) as CheckoutItem[];
  const clientTotalUsd = Number(data?.totalAmountUsd || 0);

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Cart is empty');
  }

  if (!Number.isFinite(clientTotalUsd) || clientTotalUsd <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid cart total');
  }

  const items: CheckoutItem[] = [];
  for (const raw of rawItems) {
    items.push(await resolveCheckoutLine(raw));
  }

  const serverTotalUsd = Math.round(items.reduce((sum, i) => sum + i.price, 0) * 100) / 100;
  if (Math.abs(serverTotalUsd - clientTotalUsd) > CART_TOTAL_EPSILON) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Cart total mismatch (server ${serverTotalUsd} USD vs client ${clientTotalUsd} USD)`
    );
  }

  const txRef = `shoouts_cart_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const totalAmountNgn = expectedAmountInNgn(serverTotalUsd);

  await db.collection('checkoutSessions').doc(txRef).set({
    userId,
    items,
    totalAmountUsd: serverTotalUsd,
    totalAmountNgn,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 1000 * 60 * 30),
  });

  return {
    txRef,
    amountNgn: totalAmountNgn,
    currency: 'NGN',
  };
});

export const getCheckoutStatus = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const userId = context.auth.uid;
  const txRef = String(data?.txRef || '');

  if (!txRef) {
    throw new functions.https.HttpsError('invalid-argument', 'txRef is required');
  }

  const sessionSnap = await db.collection('checkoutSessions').doc(txRef).get();
  if (!sessionSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Checkout session not found');
  }

  const session = sessionSnap.data() as { userId: string; status: string };
  if (session.userId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Not allowed to view this session');
  }

  return {
    status: session.status,
    txRef,
  };
});

export const flutterwaveWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const secret = getFlutterwaveSecret();
  const signature = (req.header('verif-hash') || req.header('x-flutterwave-signature') || '').trim();
  const rawBody = (req.rawBody || Buffer.from(JSON.stringify(req.body))).toString('utf8');

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
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

  if (data?.status !== 'successful') {
    await db.collection('checkoutSessions').doc(txRef).set(
      {
        status: 'failed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        providerPayload: data || null,
      },
      { merge: true }
    );
    res.status(200).send('Recorded failed payment');
    return;
  }

  const sessionRef = db.collection('checkoutSessions').doc(txRef);
  const sessionSnap = await sessionRef.get();

  if (!sessionSnap.exists) {
    functions.logger.error('No checkout session for txRef', { txRef });
    res.status(404).send('Session not found');
    return;
  }

  const session = sessionSnap.data() as {
    userId: string;
    items: CheckoutItem[];
    totalAmountNgn: number;
    status: string;
    expiresAt?: admin.firestore.Timestamp;
  };

  if (session.status === 'completed') {
    res.status(200).send('Already processed');
    return;
  }

  if (session.expiresAt && typeof session.expiresAt.toMillis === 'function') {
    if (session.expiresAt.toMillis() < Date.now()) {
      await sessionRef.set(
        {
          status: 'expired',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      res.status(200).send('Session expired');
      return;
    }
  }

  const paymentCurrency = String(data?.currency || '').toUpperCase();
  if (paymentCurrency !== 'NGN') {
    await sessionRef.set(
      {
        status: 'invalid_currency',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const item of session.items) {
    const txnRef = db.collection('transactions').doc();
    batch.set(txnRef, {
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

    batch.set(purchaseRef, {
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

  batch.set(
    sessionRef,
    {
      status: 'completed',
      providerTransactionId: data?.id || null,
      paidAmount,
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();

  try {
    const userRef = db.collection('users').doc(session.userId);
    const userSnap = await userRef.get();
    const userData = userSnap.data() as Record<string, any> | undefined;
    const recipientEmail = String(userData?.email || '').trim();
    const recipientName = String(userData?.fullName || userData?.name || 'Shoouts User').trim();

    if (recipientEmail) {
      const lineItems: InvoiceLine[] = session.items.map((item) => {
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
      const invoiceNumber = `PUR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

      const invoiceUrl = await createInvoiceAndGetUrl({
        userId: session.userId,
        invoiceNumber,
        issuedTo: recipientName,
        email: recipientEmail,
        lineItems,
        subtotalNgn: subtotal,
        vatNgn: vat,
        totalNgn: total,
        notes: `Payment reference: ${txRef}`,
      });

      await queueEmail({
        to: recipientEmail,
        subject: 'Shoouts Purchase Receipt & Invoice',
        text: `Hi ${recipientName}, your purchase was successful. Invoice: ${invoiceUrl}`,
        html: `<p>Hi ${recipientName},</p><p>Your purchase was successful.</p><p>Invoice: <a href="${invoiceUrl}">Download PDF invoice</a></p>`,
      });
    }
  } catch (emailError) {
    functions.logger.error('Purchase email/invoice generation failed', emailError);
  }

  res.status(200).send('Processed');
});

/**
 * validateStorageLimit - Verifies user can upload before generating signed URL
 * 
 * Called from upload.tsx before file upload to ensure user hasn't exceeded quota.
 * Queries all uploads for the user, sums their sizes, and checks against limit.
 */
export const validateStorageLimit = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const userId = context.auth.uid;
  const fileSizeBytes = Number(data?.fileSizeBytes || 0);

  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid file size');
  }

  if (fileSizeBytes > 50 * 1024 * 1024) {
    throw new functions.https.HttpsError('invalid-argument', 'File exceeds 50MB limit');
  }

  // Fetch subscription tier to determine storage limit
  const subscriptionSnap = await db
    .collection('users')
    .doc(userId)
    .collection('subscription')
    .doc('current')
    .get();

  const subscription = subscriptionSnap.data();
  const tier = subscription?.tier || 'vault';

  // Determine storage limit in bytes based on tier
  const storageLimitMap: Record<string, number> = {
    vault: 0.5 * 1024 * 1024 * 1024,           // 500MB
    vault_pro: 1 * 1024 * 1024 * 1024,           // 1GB
    studio: 2 * 1024 * 1024 * 1024,             // 2GB
    hybrid: 10 * 1024 * 1024 * 1024,            // 10GB
  };

  const storageLimit = storageLimitMap[tier] || storageLimitMap.vault;

  // Calculate total storage used by user
  const uploadsSnap = await db
    .collection('users')
    .doc(userId)
    .collection('uploads')
    .get();

  let totalUsedBytes = 0;
  for (const doc of uploadsSnap.docs) {
    const data = doc.data();
    // Firestore doesn't track file size, but we can estimate from metadata
    // In production, store fileSizeBytes in each upload document
    totalUsedBytes += data.fileSizeBytes || 0;
  }

  const availableBytes = storageLimit - totalUsedBytes;

  if (fileSizeBytes > availableBytes) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Storage limit exceeded. Available: ${(availableBytes / (1024 * 1024)).toFixed(2)}MB, Required: ${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB`
    );
  }

  return {
    allowed: true,
    usedBytes: totalUsedBytes,
    limitBytes: storageLimit,
    availableBytes,
    fileSizeBytes,
  };
});

/**
 * aggregateBestSellers - Scheduled Cloud Function (runs every 1 hour)
 * 
 * Calculates top 12 best-selling tracks by listenCount and writes to /system/bestSellers
 * instead of requiring a heavy collectionGroup query on the client.
 * 
 * Deploy with: firebase deploy --only functions
 * Note: Requires enabling Cloud Scheduler API in GCP
 */
export const aggregateBestSellers = functions.https.onRequest(
  { timeoutSeconds: 540, memory: '512MiB' },
  async (req, res) => {
    // This can be triggered manually or by Cloud Scheduler
    try {
      const count = await aggregateBestSellersDoc();
      res.status(200).json({ success: true, count });
    } catch (error) {
      functions.logger.error('Failed to aggregate best sellers:', error);
      res.status(500).json({ error: 'Failed to aggregate best sellers' });
    }
  }
);

async function aggregateBestSellersDoc(): Promise<number> {
  const uploadsSnap = await db
    .collectionGroup('uploads')
    .where('isPublic', '==', true)
    .orderBy('listenCount', 'desc')
    .limit(12)
    .get();

  const bestSellers = uploadsSnap.docs.map((doc) => ({
    id: doc.id,
    title: doc.data().title || 'Untitled',
    uploaderName: doc.data().uploaderName || 'Unknown',
    price: doc.data().price || 0,
    coverUrl: doc.data().coverUrl || '',
    userId: doc.data().userId || '',
    listenCount: doc.data().listenCount || 0,
    audioUrl: doc.data().audioUrl || '',
  }));

  await db.collection('system').doc('bestSellers').set({
    items: bestSellers,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    itemCount: bestSellers.length,
  });

  functions.logger.info('Best sellers updated', { count: bestSellers.length });
  return bestSellers.length;
}

async function aggregateTrendingDoc(): Promise<number> {
  const uploadsSnap = await db
    .collectionGroup('uploads')
    .where('isPublic', '==', true)
    .orderBy('listenCount', 'desc')
    .limit(10)
    .get();

  const items = uploadsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    audioUrl: doc.data().audioUrl || '',
  }));

  await db.collection('system').doc('trending').set({
    items,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  functions.logger.info('Trending cache updated', { count: items.length });
  return items.length;
}

export const aggregateTrending = functions.https.onRequest(
  { timeoutSeconds: 300, memory: '256MiB' },
  async (req, res) => {
    try {
      const count = await aggregateTrendingDoc();
      res.status(200).json({ success: true, count });
    } catch (error) {
      functions.logger.error('Failed to aggregate trending:', error);
      res.status(500).json({ error: 'Failed to aggregate trending' });
    }
  }
);

export const scheduleAggregateBestSellers = onSchedule({ schedule: 'every 60 minutes' }, async () => {
    await aggregateBestSellersDoc();
  });

export const scheduleAggregateTrending = onSchedule({ schedule: 'every 60 minutes' }, async () => {
    await aggregateTrendingDoc();
  });

export const downgradeExpiredSubscriptions = onSchedule({ schedule: 'every 24 hours' }, async () => {
    const now = admin.firestore.Timestamp.now();
    const expiredSnap = await db
      .collectionGroup('subscription')
      .where('status', '==', 'active')
      .where('expiresAt', '<=', now)
      .get();

    if (expiredSnap.empty) {
      return;
    }

    let batch = db.batch();
    let batchOps = 0;

    for (const docSnap of expiredSnap.docs) {
      const userRef = docSnap.ref.parent.parent;
      if (!userRef) continue;

      batch.set(
        docSnap.ref,
        {
          ...firestoreExpiredSubscriptionDocPatch(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          downgradedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      batch.set(
        userRef,
        {
          ...firestoreExpiredUserRolePatch(),
          downgradedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      batchOps += 2;

      if (batchOps >= 400) {
        await batch.commit();
        batch = db.batch();
        batchOps = 0;
      }
    }

    if (batchOps > 0) {
      await batch.commit();
    }
  });

  /**
   * getStreamingUrl - Returns marketplace preview OR library download URL
   * 
   * For MARKETPLACE (no purchase):
   *   Returns URL to watermarked HLS stream (low bitrate, expires in 1 hour)
   * 
   * For LIBRARY (verified purchase):
   *   Returns signed URL to original high-quality file (expires in 15 minutes)
   * 
   * SECURITY: Validates purchase document before issuing download URL
   */
  export const getStreamingUrl = functions.https.onCall(async (data: any, context: any) => {
    if (!context?.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userId = context.auth.uid;
    const trackId = String(data?.trackId || '');
    const uploaderId = String(data?.uploaderId || '');
    const isLibraryAccess = Boolean(data?.isLibraryAccess || false);

    if (!trackId || !uploaderId) {
      throw new functions.https.HttpsError('invalid-argument', 'trackId and uploaderId required');
    }

    const bucket = admin.storage().bucket();

    // 🔒 SECURITY: If library access, verify purchase
    if (isLibraryAccess) {
      const purchaseSnap = await db
        .collection('users')
        .doc(userId)
        .collection('purchases')
        .where('trackId', '==', trackId)
        .limit(1)
        .get();

      if (purchaseSnap.empty) {
        throw new functions.https.HttpsError('permission-denied', 'No purchase found for this track');
      }
    }

    // Return signed URL to the original file for both marketplace preview + library download
    const originalPath = `originals/${uploaderId}/${trackId}.wav`;
    const [url] = await bucket.file(originalPath).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    return {
      url,
      type: 'signed-url',
      expiresIn: 60 * 60,
      mimeType: 'audio/wav',
    };
  });

  /**
   * processAudioUpload - Triggered when new file uploaded to Cloud Storage
   *
   * WORKFLOW:
   * 1. Move the original upload into the protected originals/ folder
   * 2. Record metadata to Firestore so streaming URLs can be generated on demand
   *
   * This function is called as a Cloud Storage trigger (see firebase.json)
   */
  const processAudioUploadHandler = async (event: any) => {
      const filePath = event.data.name || '';
      const bucketName = event.data.bucket;

      // Only process files in vaults/ directory
      if (!filePath.startsWith('vaults/')) {
        functions.logger.info('Skipping non-vault file:', filePath);
        return;
      }

      const pathParts = filePath.split('/');
      const userId = pathParts[1];
      const fileName = pathParts[2];

      try {
        const bucket = admin.storage().bucket(bucketName);

        // 1. SECURE: Move original to protected originals/ folder
        const originalFileName = fileName.replace(/\.[^.]+$/, '.wav'); // Normalize to .wav
        const originalPath = `originals/${userId}/${originalFileName}`;
        const trackId = originalFileName.replace('.wav', '');

        await bucket.file(filePath).copy(bucket.file(originalPath));
        functions.logger.info('Original file secured:', originalPath);

        const uploadRef = db.collection('uploads').doc(trackId);
        await uploadRef.set(
          {
            userId,
            fileName,
            originalStoragePath: originalPath,
            transcodingStatus: 'complete',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        functions.logger.info('Audio upload processing complete:', trackId);
      } catch (error) {
        functions.logger.error('Error processing audio upload:', error);
      }
    };

  // Keep bucket target configurable so CI/CD can deploy even if a fixed bucket region is unavailable.
  // Use 1st gen storage trigger here to avoid Eventarc trigger creation flakiness.
  const uploadBucket = process.env.UPLOAD_BUCKET_NAME;

  export const processAudioUpload = uploadBucket
    ? functionsV1.storage.bucket(uploadBucket).object().onFinalize(processAudioUploadHandler)
    : functionsV1.storage.object().onFinalize(processAudioUploadHandler);

    /**
     * Admin APIs (Role-protected via custom claims)
     */
    export const adminGetModerationQueue = functions.https.onCall(async (data: any, context: any) => {
      assertRole(context, ['admin', 'moderator']);

      const filters = data?.filters ?? {};
      const limit = Math.min(Number(data?.limit) || 25, 100);

      let query: admin.firestore.Query = db.collection('contentReports').where('status', '==', 'pending');

      if (filters.type) {
        query = query.where('type', '==', String(filters.type));
      }
      if (filters.reporterId) {
        query = query.where('reporterId', '==', String(filters.reporterId));
      }
      if (filters.uploaderId) {
        query = query.where('uploaderId', '==', String(filters.uploaderId));
      }
      if (filters.trackId) {
        query = query.where('trackId', '==', String(filters.trackId));
      }

      if (filters.startAt || filters.endAt) {
        const startAt = filters.startAt ? admin.firestore.Timestamp.fromMillis(Number(filters.startAt)) : null;
        const endAt = filters.endAt ? admin.firestore.Timestamp.fromMillis(Number(filters.endAt)) : null;
        if (startAt) query = query.where('createdAt', '>=', startAt);
        if (endAt) query = query.where('createdAt', '<=', endAt);
      }

      query = query.orderBy('createdAt', 'desc').limit(limit);

      if (data?.cursorId) {
        const cursorDoc = await db.collection('contentReports').doc(String(data.cursorId)).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.get();
      const reports = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));

      const nextCursorId = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : null;
      return { reports, nextCursorId };
    });

    export const adminReviewReport = functions.https.onCall(async (data: any, context: any) => {
      assertRole(context, ['admin', 'moderator']);

      const reportId = String(data?.reportId || '');
      const decision = String(data?.decision || '').toLowerCase();
      const notes = String(data?.notes || '');

      if (!reportId) {
        throw new functions.https.HttpsError('invalid-argument', 'reportId is required');
      }
      if (!['dismiss', 'uphold', 'escalate'].includes(decision)) {
        throw new functions.https.HttpsError('invalid-argument', 'decision must be one of dismiss|uphold|escalate');
      }

      const reportRef = db.collection('contentReports').doc(reportId);
      const reportSnap = await reportRef.get();
      if (!reportSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Report not found');
      }

      const report = reportSnap.data() as Record<string, any>;
      const now = admin.firestore.FieldValue.serverTimestamp();
      const updates: Record<string, any> = {
        status: 'resolved',
        resolution: decision,
        resolvedAt: now,
        resolvedBy: context.auth.uid,
        decisionNotes: notes || null,
      };

      const batch = db.batch();
      batch.update(reportRef, updates);

      if (decision === 'uphold' && report.trackId && report.uploaderId) {
        const trackRef = db.collection('uploads').doc(report.trackId);
        batch.set(trackRef, { isRemoved: true, removedAt: now }, { merge: true });

        const userRef = db.collection('users').doc(report.uploaderId);
        batch.set(
          userRef,
          { suspendedUntil: admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000) },
          { merge: true }
        );
      }

      await batch.commit();

      await logAdminAction({
        actorId: context.auth.uid,
        action: 'review_report',
        targetType: 'contentReport',
        targetId: reportId,
        reason: notes,
        details: { decision, report },
      });

      return { success: true };
    });

    /**
     * adminReviewReportsBatch - Apply decision to multiple reports at once
     */
    export const adminReviewReportsBatch = functions.https.onCall(async (data: any, context: any) => {
      assertRole(context, ['admin', 'moderator']);

      const reportIds = (data?.reportIds as string[]) || [];
      const decision = String(data?.decision || '').toLowerCase();
      const reason = String(data?.reason || '');

      if (!Array.isArray(reportIds) || reportIds.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'reportIds must be a non-empty array');
      }
      if (!['dismiss', 'uphold', 'escalate'].includes(decision)) {
        throw new functions.https.HttpsError('invalid-argument', 'decision must be one of dismiss|uphold|escalate');
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      const batch = db.batch();
      let processedCount = 0;

      for (const reportId of reportIds) {
        const reportRef = db.collection('contentReports').doc(reportId);
        const reportSnap = await reportRef.get();

        if (!reportSnap.exists) {
          continue;
        }

        const report = reportSnap.data() as Record<string, any>;

        // Update report
        batch.update(reportRef, {
          status: 'resolved',
          resolution: decision,
          resolvedAt: now,
          resolvedBy: context.auth.uid,
          decisionNotes: reason || null,
        });

        // If upholding, remove content and suspend uploader
        if (decision === 'uphold' && report.trackId && report.uploaderId) {
          const trackRef = db.collection('uploads').doc(report.trackId);
          batch.set(trackRef, { isRemoved: true, removedAt: now }, { merge: true });

          const userRef = db.collection('users').doc(report.uploaderId);
          batch.set(
            userRef,
            {
              suspendedUntil: admin.firestore.Timestamp.fromMillis(
                Date.now() + 7 * 24 * 60 * 60 * 1000
              ),
            },
            { merge: true }
          );
        }

        processedCount++;
      }

      await batch.commit();

      // Log batch action
      await logAdminAction({
        actorId: context.auth.uid,
        action: 'review_reports_batch',
        targetType: 'contentReports',
        targetId: reportIds.join(','),
        reason: reason || `Batch ${decision}`,
        details: { count: processedCount, decision },
      });

      return { success: true, processed: processedCount };
    });

    export const adminSuspendCreator = functions.https.onCall(async (data: any, context: any) => {
      assertRole(context, ['admin']);

      const creatorId = String(data?.creatorId || '');
      const durationDays = Number(data?.durationDays ?? 0);
      const reason = String(data?.reason || '');

      if (!creatorId) {
        throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');
      }

      const suspendedUntil =
        durationDays > 0
          ? admin.firestore.Timestamp.fromMillis(Date.now() + durationDays * 24 * 60 * 60 * 1000)
          : null;

      await db.collection('users').doc(creatorId).set(
        {
          suspendedUntil,
          suspensionReason: reason || null,
        },
        { merge: true }
      );

      await logAdminAction({
        actorId: context.auth.uid,
        action: 'suspend_creator',
        targetType: 'user',
        targetId: creatorId,
        reason,
        details: { durationDays },
      });

      return { success: true, suspendedUntil: suspendedUntil ? suspendedUntil.toDate().toISOString() : null };
    });

    export const adminGetComplianceMetrics = functions.https.onCall(async (_data: any, context: any) => {
      assertRole(context, ['admin', 'moderator', 'auditor']);

      const now = Date.now();
      const dayAgo = admin.firestore.Timestamp.fromMillis(now - 24 * 60 * 60 * 1000);

      const [pendingReportsSnap, recentUploadsSnap, recentTransactionsSnap] = await Promise.all([
        db.collection('contentReports').where('status', '==', 'pending').get(),
        db.collection('uploads').where('createdAt', '>=', dayAgo).get(),
        db.collection('transactions').where('createdAt', '>=', dayAgo).get(),
      ]);

      return {
        pendingReports: pendingReportsSnap.size,
        dailyUploads: recentUploadsSnap.size,
        dailyTransactions: recentTransactionsSnap.size,
      };
    });

    export const adminGetPayoutLedger = functions.https.onCall(async (data: any, context: any) => {
      assertRole(context, ['admin', 'auditor']);

      const filters = data?.filters ?? {};
      const limit = Math.min(Number(data?.limit) || 25, 100);

      let query: admin.firestore.Query = db.collection('payoutLedger');

      if (filters.creatorId) {
        query = query.where('creatorId', '==', String(filters.creatorId));
      }
      if (filters.status) {
        query = query.where('status', '==', String(filters.status));
      }
      if (filters.startAt || filters.endAt) {
        const startAt = filters.startAt ? admin.firestore.Timestamp.fromMillis(Number(filters.startAt)) : null;
        const endAt = filters.endAt ? admin.firestore.Timestamp.fromMillis(Number(filters.endAt)) : null;
        if (startAt) query = query.where('createdAt', '>=', startAt);
        if (endAt) query = query.where('createdAt', '<=', endAt);
      }

      query = query.orderBy('createdAt', 'desc').limit(limit);

      if (data?.cursorId) {
        const cursorDoc = await db.collection('payoutLedger').doc(String(data.cursorId)).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.get();
      const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
      const nextCursorId = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : null;

      return { entries, nextCursorId };
    });

    export const adminSetUserRole = functions.https.onCall(async (data: any, context: any) => {
      assertRole(context, ['admin']);

      const uid = String(data?.uid || '');
      const role = String(data?.role || '') as AdminRole;

      if (!uid || !role) {
        throw new functions.https.HttpsError('invalid-argument', 'uid and role are required');
      }
      if (!['admin', 'moderator', 'auditor'].includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
      }

      await admin.auth().setCustomUserClaims(uid, { role });

      await logAdminAction({
        actorId: context.auth.uid,
        action: 'set_user_role',
        targetType: 'user',
        targetId: uid,
        reason: `Set role to ${role}`,
      });

      return { success: true };
    });

    /**
     * adminGetCreators - Search and list creators with status
     */
    export const adminGetCreators = functions.https.onCall(async (data: any, context: any) => {
      assertRole(context, ['admin', 'moderator']);

      const query = String(data?.query || '').toLowerCase();
      const limit = Math.min(Number(data?.limit) || 25, 100);

      let q: admin.firestore.Query = db.collection('users');

      // Optionally filter by email/name using collectionGroup via subcollection queries
      // For now, we'll fetch all users and filter client-side (not ideal for large scale)
      // In production, use Algolia or similar for full-text search
      q = q.limit(limit * 2); // Fetch more to filter

      const snapshot = await q.get();

      const creators = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const userData = doc.data() as any;
          const subSnap = await db
            .collection('users')
            .doc(doc.id)
            .collection('subscription')
            .doc('current')
            .get();
          const subData = subSnap.data() as any;

          return {
            id: doc.id,
            name: userData.name || userData.email?.split('@')[0] || 'Unknown',
            email: userData.email || '',
            tier: subData?.tier || 'vault',
            suspendedUntil: userData.suspendedUntil?.seconds
              ? new Date(userData.suspendedUntil.seconds * 1000).toISOString()
              : null,
            createdAt: userData.createdAt?.seconds
              ? new Date(userData.createdAt.seconds * 1000).toISOString()
              : null,
          };
        })
      );

      // Filter by query (name or email)
      const filtered = query
        ? creators.filter(
          (c) =>
            c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)
        )
        : creators;

      return {
        creators: filtered.slice(0, limit),
      };
    });

    /**
     * adminGetCreatorDetails - Get full creator details (KYC, payouts, uploads)
     */
    export const adminGetCreatorDetails = functions.https.onCall(async (data: any, context: any) => {
      assertRole(context, ['admin', 'moderator', 'auditor']);

      const creatorId = String(data?.creatorId || '');
      if (!creatorId) {
        throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');
      }

      const userSnap = await db.collection('users').doc(creatorId).get();
      if (!userSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Creator not found');
      }

      const userData = userSnap.data() as any;
      const subSnap = await db
        .collection('users')
        .doc(creatorId)
        .collection('subscription')
        .doc('current')
        .get();
      const subData = subSnap.data() as any;

      const uploadsSnap = await db
        .collection('users')
        .doc(creatorId)
        .collection('uploads')
        .get();

      const payoutsSnap = await db
        .collection('users')
        .doc(creatorId)
        .collection('payouts')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      return {
        id: creatorId,
        name: userData.name || userData.email?.split('@')[0] || 'Unknown',
        email: userData.email || '',
        tier: subData?.tier || 'vault',
        suspendedUntil: userData.suspendedUntil?.seconds
          ? new Date(userData.suspendedUntil.seconds * 1000).toISOString()
          : null,
        suspensionReason: userData.suspensionReason || null,
        uploadCount: uploadsSnap.size,
        recentPayouts: payoutsSnap.docs.map((doc) => ({
          id: doc.id,
          amount: doc.data().amount,
          status: doc.data().status,
          createdAt: doc.data().createdAt?.seconds
            ? new Date(doc.data().createdAt.seconds * 1000).toISOString()
            : null,
        })),
        createdAt: userData.createdAt?.seconds
          ? new Date(userData.createdAt.seconds * 1000).toISOString()
          : null,
      };
    });

    /**
     * adminUnsuspendCreator - Remove suspension from a creator
     */
    export const adminUnsuspendCreator = functions.https.onCall(async (data: any, context: any) => {
      assertRole(context, ['admin']);

      const creatorId = String(data?.creatorId || '');
      const reason = String(data?.reason || '');

      if (!creatorId) {
        throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');
      }

      await db.collection('users').doc(creatorId).set(
        {
          suspendedUntil: admin.firestore.FieldValue.delete(),
          suspensionReason: admin.firestore.FieldValue.delete(),
        },
        { merge: true }
      );

      await logAdminAction({
        actorId: context.auth.uid,
        action: 'unsuspend_creator',
        targetType: 'user',
        targetId: creatorId,
        reason: reason || 'Unsuspended by admin',
      });

      return { success: true };
    });

    /**
     * adminTriggerPayoutReconciliation - Manual payout check/reconciliation
     */
    export const adminTriggerPayoutReconciliation = functions.https.onCall(
      async (data: any, context: any) => {
        assertRole(context, ['admin']);

        const creatorId = String(data?.creatorId || '');
        if (!creatorId) {
          throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');
        }

        // Simulate payout reconciliation (in production, integrate with Stripe/payment processor)
        const txnsSnap = await db
          .collection('transactions')
          .where('sellerId', '==', creatorId)
          .where('status', '==', 'completed')
          .get();

        const totalAmount = txnsSnap.docs.reduce((sum, doc) => {
          return sum + (Number(doc.data().amount) || 0);
        }, 0);

        const platformFeePercent = 0.1; // 10%
        const platformFee = Math.round(totalAmount * platformFeePercent);
        const payoutAmount = totalAmount - platformFee;

        // Create a payout ledger entry
        await db.collection('payoutLedger').add({
          creatorId,
          totalTransactionAmount: totalAmount,
          platformFee,
          payoutAmount,
          status: 'pending',
          transactionCount: txnsSnap.size,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          manuallyTriggeredBy: context.auth.uid,
        });

        await logAdminAction({
          actorId: context.auth.uid,
          action: 'trigger_payout_reconciliation',
          targetType: 'user',
          targetId: creatorId,
          reason: `Manual reconciliation triggered. Pending payout: ₦${payoutAmount}`,
        });

        return {
          success: true,
          payoutAmount,
          platformFee,
          transactionCount: txnsSnap.size,
        };
      }
    );

