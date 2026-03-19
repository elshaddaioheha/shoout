"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateBestSellers = exports.validateStorageLimit = exports.flutterwaveWebhook = exports.getCheckoutStatus = exports.createCheckoutSession = void 0;
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const functions = __importStar(require("firebase-functions"));
admin.initializeApp();
const db = admin.firestore();
const NAIRA_RATE = 1600;
function expectedAmountInNgn(totalUsd) {
    return Math.round(totalUsd * NAIRA_RATE);
}
function getFlutterwaveSecret() {
    return process.env.FLUTTERWAVE_SECRET_HASH || functions.config()?.flutterwave?.secret_hash || '';
}
function verifyWebhookSignature(rawBody, signature, secret) {
    if (!signature || !secret)
        return false;
    const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return hash === signature;
}
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
    if (!context?.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const userId = context.auth.uid;
    const items = (data?.items || []);
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
exports.getCheckoutStatus = functions.https.onCall(async (data, context) => {
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
    const session = sessionSnap.data();
    if (session.userId !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Not allowed to view this session');
    }
    return {
        status: session.status,
        txRef,
    };
});
exports.flutterwaveWebhook = functions.https.onRequest(async (req, res) => {
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
    const payload = req.body;
    const event = payload?.event;
    const data = payload?.data;
    const txRef = String(data?.tx_ref || '');
    if (event !== 'charge.completed' || !txRef) {
        res.status(200).send('Ignored');
        return;
    }
    if (data?.status !== 'successful') {
        await db.collection('checkoutSessions').doc(txRef).set({
            status: 'failed',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            providerPayload: data || null,
        }, { merge: true });
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
    const session = sessionSnap.data();
    if (session.status === 'completed') {
        res.status(200).send('Already processed');
        return;
    }
    const paidAmount = Number(data?.amount || 0);
    if (!Number.isFinite(paidAmount) || paidAmount < session.totalAmountNgn) {
        await sessionRef.set({
            status: 'amount_mismatch',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            paidAmount,
        }, { merge: true });
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
    batch.set(sessionRef, {
        status: 'completed',
        providerTransactionId: data?.id || null,
        paidAmount,
        updatedAt: now,
    }, { merge: true });
    await batch.commit();
    res.status(200).send('Processed');
});
/**
 * validateStorageLimit - Verifies user can upload before generating signed URL
 *
 * Called from upload.tsx before file upload to ensure user hasn't exceeded quota.
 * Queries all uploads for the user, sums their sizes, and checks against limit.
 */
exports.validateStorageLimit = functions.https.onCall(async (data, context) => {
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
    const storageLimitMap = {
        vault_free: 0.05 * 1024 * 1024 * 1024, // 50MB
        vault_creator: 0.5 * 1024 * 1024 * 1024, // 500MB
        vault_pro: 1 * 1024 * 1024 * 1024, // 1GB
        vault_executive: 5 * 1024 * 1024 * 1024, // 5GB
        studio_free: 0.1 * 1024 * 1024 * 1024, // 100MB
        studio_pro: 1 * 1024 * 1024 * 1024, // 1GB
        studio_plus: 10 * 1024 * 1024 * 1024, // 10GB
        hybrid_creator: 5 * 1024 * 1024 * 1024, // 5GB
        hybrid_executive: 10 * 1024 * 1024 * 1024, // 10GB
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
        throw new functions.https.HttpsError('resource-exhausted', `Storage limit exceeded. Available: ${(availableBytes / (1024 * 1024)).toFixed(2)}MB, Required: ${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB`);
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
exports.aggregateBestSellers = functions.https.onRequest({ timeoutSeconds: 540, memory: '512MiB' }, async (req, res) => {
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
    }
    catch (error) {
        functions.logger.error('Failed to aggregate best sellers:', error);
        res.status(500).json({ error: 'Failed to aggregate best sellers' });
    }
});
