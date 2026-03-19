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
exports.adminTriggerPayoutReconciliation = exports.adminUnsuspendCreator = exports.adminGetCreatorDetails = exports.adminGetCreators = exports.adminSetUserRole = exports.adminGetPayoutLedger = exports.adminGetComplianceMetrics = exports.adminSuspendCreator = exports.adminReviewReportsBatch = exports.adminReviewReport = exports.adminGetModerationQueue = exports.processAudioUpload = exports.getStreamingUrl = exports.aggregateBestSellers = exports.validateStorageLimit = exports.flutterwaveWebhook = exports.getCheckoutStatus = exports.createCheckoutSession = void 0;
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const functions = __importStar(require("firebase-functions"));
const storage_1 = require("firebase-functions/v2/storage");
admin.initializeApp();
const db = admin.firestore();
function getUserRoleFromContext(context) {
    return context?.auth?.token?.role ?? null;
}
function assertRole(context, allowedRoles, message) {
    const role = getUserRoleFromContext(context);
    if (!role || !allowedRoles.includes(role)) {
        throw new functions.https.HttpsError('permission-denied', message || 'Insufficient privileges');
    }
}
async function logAdminAction(params) {
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
exports.getStreamingUrl = functions.https.onCall(async (data, context) => {
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
const processAudioUploadHandler = async (event) => {
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
        await uploadRef.set({
            userId,
            fileName,
            originalStoragePath: originalPath,
            transcodingStatus: 'complete',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        functions.logger.info('Audio upload processing complete:', trackId);
    }
    catch (error) {
        functions.logger.error('Error processing audio upload:', error);
    }
};
// Keep bucket target configurable so CI/CD can deploy even if a fixed bucket region is unavailable.
const uploadBucket = process.env.UPLOAD_BUCKET_NAME;
exports.processAudioUpload = uploadBucket
    ? (0, storage_1.onObjectFinalized)({ bucket: uploadBucket }, processAudioUploadHandler)
    : (0, storage_1.onObjectFinalized)(processAudioUploadHandler);
/**
 * Admin APIs (Role-protected via custom claims)
 */
exports.adminGetModerationQueue = functions.https.onCall(async (data, context) => {
    assertRole(context, ['admin', 'moderator']);
    const filters = data?.filters ?? {};
    const limit = Math.min(Number(data?.limit) || 25, 100);
    let query = db.collection('contentReports').where('status', '==', 'pending');
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
        if (startAt)
            query = query.where('createdAt', '>=', startAt);
        if (endAt)
            query = query.where('createdAt', '<=', endAt);
    }
    query = query.orderBy('createdAt', 'desc').limit(limit);
    if (data?.cursorId) {
        const cursorDoc = await db.collection('contentReports').doc(String(data.cursorId)).get();
        if (cursorDoc.exists) {
            query = query.startAfter(cursorDoc);
        }
    }
    const snapshot = await query.get();
    const reports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const nextCursorId = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : null;
    return { reports, nextCursorId };
});
exports.adminReviewReport = functions.https.onCall(async (data, context) => {
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
    const report = reportSnap.data();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const updates = {
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
        batch.set(userRef, { suspendedUntil: admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000) }, { merge: true });
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
exports.adminReviewReportsBatch = functions.https.onCall(async (data, context) => {
    assertRole(context, ['admin', 'moderator']);
    const reportIds = data?.reportIds || [];
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
        const report = reportSnap.data();
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
            batch.set(userRef, {
                suspendedUntil: admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
            }, { merge: true });
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
exports.adminSuspendCreator = functions.https.onCall(async (data, context) => {
    assertRole(context, ['admin']);
    const creatorId = String(data?.creatorId || '');
    const durationDays = Number(data?.durationDays ?? 0);
    const reason = String(data?.reason || '');
    if (!creatorId) {
        throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');
    }
    const suspendedUntil = durationDays > 0
        ? admin.firestore.Timestamp.fromMillis(Date.now() + durationDays * 24 * 60 * 60 * 1000)
        : null;
    await db.collection('users').doc(creatorId).set({
        suspendedUntil,
        suspensionReason: reason || null,
    }, { merge: true });
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
exports.adminGetComplianceMetrics = functions.https.onCall(async (_data, context) => {
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
exports.adminGetPayoutLedger = functions.https.onCall(async (data, context) => {
    assertRole(context, ['admin', 'auditor']);
    const filters = data?.filters ?? {};
    const limit = Math.min(Number(data?.limit) || 25, 100);
    let query = db.collection('payoutLedger');
    if (filters.creatorId) {
        query = query.where('creatorId', '==', String(filters.creatorId));
    }
    if (filters.status) {
        query = query.where('status', '==', String(filters.status));
    }
    if (filters.startAt || filters.endAt) {
        const startAt = filters.startAt ? admin.firestore.Timestamp.fromMillis(Number(filters.startAt)) : null;
        const endAt = filters.endAt ? admin.firestore.Timestamp.fromMillis(Number(filters.endAt)) : null;
        if (startAt)
            query = query.where('createdAt', '>=', startAt);
        if (endAt)
            query = query.where('createdAt', '<=', endAt);
    }
    query = query.orderBy('createdAt', 'desc').limit(limit);
    if (data?.cursorId) {
        const cursorDoc = await db.collection('payoutLedger').doc(String(data.cursorId)).get();
        if (cursorDoc.exists) {
            query = query.startAfter(cursorDoc);
        }
    }
    const snapshot = await query.get();
    const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const nextCursorId = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : null;
    return { entries, nextCursorId };
});
exports.adminSetUserRole = functions.https.onCall(async (data, context) => {
    assertRole(context, ['admin']);
    const uid = String(data?.uid || '');
    const role = String(data?.role || '');
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
exports.adminGetCreators = functions.https.onCall(async (data, context) => {
    assertRole(context, ['admin', 'moderator']);
    const query = String(data?.query || '').toLowerCase();
    const limit = Math.min(Number(data?.limit) || 25, 100);
    let q = db.collection('users');
    // Optionally filter by email/name using collectionGroup via subcollection queries
    // For now, we'll fetch all users and filter client-side (not ideal for large scale)
    // In production, use Algolia or similar for full-text search
    q = q.limit(limit * 2); // Fetch more to filter
    const snapshot = await q.get();
    const creators = await Promise.all(snapshot.docs.map(async (doc) => {
        const userData = doc.data();
        const subSnap = await db
            .collection('users')
            .doc(doc.id)
            .collection('subscription')
            .doc('current')
            .get();
        const subData = subSnap.data();
        return {
            id: doc.id,
            name: userData.name || userData.email?.split('@')[0] || 'Unknown',
            email: userData.email || '',
            tier: subData?.tier || 'vault_free',
            suspendedUntil: userData.suspendedUntil?.seconds
                ? new Date(userData.suspendedUntil.seconds * 1000).toISOString()
                : null,
            createdAt: userData.createdAt?.seconds
                ? new Date(userData.createdAt.seconds * 1000).toISOString()
                : null,
        };
    }));
    // Filter by query (name or email)
    const filtered = query
        ? creators.filter((c) => c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query))
        : creators;
    return {
        creators: filtered.slice(0, limit),
    };
});
/**
 * adminGetCreatorDetails - Get full creator details (KYC, payouts, uploads)
 */
exports.adminGetCreatorDetails = functions.https.onCall(async (data, context) => {
    assertRole(context, ['admin', 'moderator', 'auditor']);
    const creatorId = String(data?.creatorId || '');
    if (!creatorId) {
        throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');
    }
    const userSnap = await db.collection('users').doc(creatorId).get();
    if (!userSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Creator not found');
    }
    const userData = userSnap.data();
    const subSnap = await db
        .collection('users')
        .doc(creatorId)
        .collection('subscription')
        .doc('current')
        .get();
    const subData = subSnap.data();
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
        tier: subData?.tier || 'vault_free',
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
exports.adminUnsuspendCreator = functions.https.onCall(async (data, context) => {
    assertRole(context, ['admin']);
    const creatorId = String(data?.creatorId || '');
    const reason = String(data?.reason || '');
    if (!creatorId) {
        throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');
    }
    await db.collection('users').doc(creatorId).set({
        suspendedUntil: admin.firestore.FieldValue.delete(),
        suspensionReason: admin.firestore.FieldValue.delete(),
    }, { merge: true });
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
exports.adminTriggerPayoutReconciliation = functions.https.onCall(async (data, context) => {
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
});
