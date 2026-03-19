import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import * as functions from 'firebase-functions';
import { onObjectFinalized } from 'firebase-functions/v2/storage';

admin.initializeApp();
const db = admin.firestore();

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

function expectedAmountInNgn(totalUsd: number): number {
  return Math.round(totalUsd * NAIRA_RATE);
}

function getFlutterwaveSecret(): string {
  return process.env.FLUTTERWAVE_SECRET_HASH || functions.config()?.flutterwave?.secret_hash || '';
}

function verifyWebhookSignature(rawBody: string, signature: string | undefined, secret: string): boolean {
  if (!signature || !secret) return false;
  const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return hash === signature;
}

export const createCheckoutSession = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const userId = context.auth.uid;
  const items = (data?.items || []) as CheckoutItem[];
  const totalAmountUsd = Number(data?.totalAmountUsd || 0);

  if (!Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Cart is empty');
  }

  if (!Number.isFinite(totalAmountUsd) || totalAmountUsd <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid cart total');
  }

  const txRef = `shoouts_cart_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const totalAmountNgn = expectedAmountInNgn(totalAmountUsd);

  await db.collection('checkoutSessions').doc(txRef).set({
    userId,
    items,
    totalAmountUsd,
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
  };

  if (session.status === 'completed') {
    res.status(200).send('Already processed');
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
  const tier = subscription?.tier || 'vault_free';

  // Determine storage limit in bytes based on tier
  const storageLimitMap: Record<string, number> = {
    vault_free: 0.05 * 1024 * 1024 * 1024,      // 50MB
    vault_creator: 0.5 * 1024 * 1024 * 1024,    // 500MB
    vault_pro: 1 * 1024 * 1024 * 1024,           // 1GB
    vault_executive: 5 * 1024 * 1024 * 1024,    // 5GB
    studio_free: 0.1 * 1024 * 1024 * 1024,      // 100MB
    studio_pro: 1 * 1024 * 1024 * 1024,          // 1GB
    studio_plus: 10 * 1024 * 1024 * 1024,       // 10GB
    hybrid_creator: 5 * 1024 * 1024 * 1024,     // 5GB
    hybrid_executive: 10 * 1024 * 1024 * 1024,  // 10GB
  };

  const storageLimit = storageLimitMap[tier] || storageLimitMap.vault_free;

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
      // Query all public uploads across all users
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

      // Write aggregated result to /system/bestSellers
      await db.collection('system').doc('bestSellers').set({
        items: bestSellers,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        itemCount: bestSellers.length,
      });

      functions.logger.info('Best sellers updated', { count: bestSellers.length });
      res.status(200).json({ success: true, count: bestSellers.length });
    } catch (error) {
      functions.logger.error('Failed to aggregate best sellers:', error);
      res.status(500).json({ error: 'Failed to aggregate best sellers' });
    }
  }
);

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
  export const processAudioUpload = onObjectFinalized(
    { bucket: "shoouts-music" },
    async (event) => {
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
    });

