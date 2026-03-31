"use strict";
/**
 * Aggregation service - Best sellers, trending, and scheduled uploads
 */
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
exports.aggregateBestSellers = aggregateBestSellers;
exports.aggregateTrending = aggregateTrending;
exports.promoteUpcomingUploads = promoteUpcomingUploads;
exports.downgradeExpiredSubscriptions = downgradeExpiredSubscriptions;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firebase_1 = require("../utils/firebase");
/**
 * Aggregates top 12 best-selling tracks
 */
async function aggregateBestSellers() {
    const db = (0, firebase_1.getDb)();
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
        updatedAt: (0, firebase_1.serverTimestamp)(),
        itemCount: bestSellers.length,
    });
    functions.logger.info('Best sellers updated', { count: bestSellers.length });
    return bestSellers.length;
}
/**
 * Aggregates top 10 trending tracks
 */
async function aggregateTrending() {
    const db = (0, firebase_1.getDb)();
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
        updatedAt: (0, firebase_1.serverTimestamp)(),
    });
    functions.logger.info('Trending cache updated', { count: items.length });
    return items.length;
}
/**
 * Promotes scheduled uploads that are due for release
 */
async function promoteUpcomingUploads() {
    const db = (0, firebase_1.getDb)();
    const nowMs = Date.now();
    const dueSnap = await db
        .collectionGroup('uploads')
        .where('isPublic', '==', true)
        .where('lifecycleStatus', '==', 'upcoming')
        .limit(500)
        .get();
    if (dueSnap.empty) {
        return 0;
    }
    let promoted = 0;
    let batchWrite = (0, firebase_1.batch)();
    let batchOps = 0;
    for (const docSnap of dueSnap.docs) {
        const data = docSnap.data();
        // Parse scheduled release time
        let scheduledMs = null;
        if (typeof data.scheduledReleaseAtMs === 'number' && Number.isFinite(data.scheduledReleaseAtMs)) {
            scheduledMs = data.scheduledReleaseAtMs;
        }
        else if (typeof data.scheduledReleaseAtMs === 'string') {
            const parsed = Number(data.scheduledReleaseAtMs);
            if (Number.isFinite(parsed))
                scheduledMs = parsed;
        }
        else if (typeof data.scheduledReleaseAtIso === 'string') {
            const parsedIso = Date.parse(data.scheduledReleaseAtIso);
            if (Number.isFinite(parsedIso))
                scheduledMs = parsedIso;
        }
        // Skip if scheduled time is in the future
        if (scheduledMs != null && scheduledMs > nowMs) {
            continue;
        }
        // Create publish snapshot
        const publishSnapshot = {
            title: String(data.title || ''),
            genre: String(data.genre || ''),
            assetType: String(data.assetType || data.trackType || ''),
            trackType: String(data.trackType || data.assetType || ''),
            bpm: Number(data.bpm || 0),
            price: Number(data.price || 0),
            description: String(data.description || ''),
            audioUrl: String(data.audioUrl || ''),
            coverUrl: String(data.coverUrl || data.artworkUrl || ''),
            isPublic: true,
            subscriberOnly: data.subscriberOnly === true,
            userId: String(data.userId || ''),
            uploaderName: String(data.uploaderName || 'Shoouter'),
            snapshotVersion: 1,
            capturedAtMs: nowMs,
            capturedAtIso: new Date(nowMs).toISOString(),
        };
        // Update upload to published
        batchWrite.update(docSnap.ref, {
            lifecycleStatus: 'published',
            published: true,
            isPublic: true,
            publishedAt: (0, firebase_1.serverTimestamp)(),
            updatedAt: (0, firebase_1.serverTimestamp)(),
            publishSnapshot,
        });
        batchOps += 1;
        promoted += 1;
        // Commit batch if reaching limit
        if (batchOps >= 400) {
            await batchWrite.commit();
            batchWrite = (0, firebase_1.batch)();
            batchOps = 0;
        }
    }
    // Commit remaining
    if (batchOps > 0) {
        await batchWrite.commit();
    }
    functions.logger.info('Promoted due upcoming uploads', { promoted });
    return promoted;
}
/**
 * Downgrades expired subscriptions
 */
async function downgradeExpiredSubscriptions() {
    const db = (0, firebase_1.getDb)();
    const now = admin.firestore.Timestamp.now();
    const expiredSnap = await db
        .collectionGroup('subscription')
        .where('status', '==', 'active')
        .where('expiresAt', '<=', now)
        .get();
    if (expiredSnap.empty) {
        return 0;
    }
    let downgraded = 0;
    let batchWrite = (0, firebase_1.batch)();
    let batchOps = 0;
    for (const docSnap of expiredSnap.docs) {
        const userRef = docSnap.ref.parent.parent;
        if (!userRef)
            continue;
        // Import helpers from subscriptionLifecycle
        const { firestoreExpiredSubscriptionDocPatch, firestoreExpiredUserRolePatch } = await Promise.resolve().then(() => __importStar(require('../subscriptionLifecycle')));
        batchWrite.set(docSnap.ref, {
            ...firestoreExpiredSubscriptionDocPatch(),
            updatedAt: (0, firebase_1.serverTimestamp)(),
            downgradedAt: (0, firebase_1.serverTimestamp)(),
        }, { merge: true });
        batchWrite.set(userRef, {
            ...firestoreExpiredUserRolePatch(),
            downgradedAt: (0, firebase_1.serverTimestamp)(),
        }, { merge: true });
        batchOps += 2;
        downgraded += 1;
        if (batchOps >= 400) {
            await batchWrite.commit();
            batchWrite = (0, firebase_1.batch)();
            batchOps = 0;
        }
    }
    if (batchOps > 0) {
        await batchWrite.commit();
    }
    functions.logger.info('Downgraded expired subscriptions', { downgraded });
    return downgraded;
}
