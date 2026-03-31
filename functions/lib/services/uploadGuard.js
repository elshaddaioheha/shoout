"use strict";
/**
 * Upload Guard service - Storage limits, upload processing, and streaming URLs
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
exports.getStorageLimitForTier = getStorageLimitForTier;
exports.validateStorageQuota = validateStorageQuota;
exports.getStorageStats = getStorageStats;
exports.processAudioUpload = processAudioUpload;
exports.getStreamingUrl = getStreamingUrl;
exports.verifyPurchase = verifyPurchase;
exports.getLibraryStreamingUrl = getLibraryStreamingUrl;
const functions = __importStar(require("firebase-functions"));
const types_1 = require("../types");
const firebase_1 = require("../utils/firebase");
/**
 * Gets storage limit for a subscription tier
 */
function getStorageLimitForTier(tier) {
    return types_1.TIER_STORAGE_LIMITS[tier] || types_1.TIER_STORAGE_LIMITS.vault;
}
/**
 * Validates if user can upload file of given size
 */
async function validateStorageQuota(userId, fileSizeBytes) {
    const db = (0, firebase_1.getDb)();
    // Get user's subscription tier
    const subscription = await (0, firebase_1.getUserSubscription)(userId);
    const tier = subscription?.tier || 'vault';
    const storageLimit = getStorageLimitForTier(tier);
    // Calculate total used storage
    const uploadsSnap = await db
        .collection('users')
        .doc(userId)
        .collection('uploads')
        .get();
    let totalUsedBytes = 0;
    for (const doc of uploadsSnap.docs) {
        const data = doc.data();
        totalUsedBytes += data.fileSizeBytes || 0;
    }
    const availableBytes = storageLimit - totalUsedBytes;
    const allowed = fileSizeBytes <= availableBytes;
    return {
        allowed,
        usedBytes: totalUsedBytes,
        limitBytes: storageLimit,
        availableBytes: Math.max(0, availableBytes),
    };
}
/**
 * Gets storage stats for a user
 */
async function getStorageStats(userId) {
    const db = (0, firebase_1.getDb)();
    const subscription = await (0, firebase_1.getUserSubscription)(userId);
    const tier = subscription?.tier || 'vault';
    const limitBytes = getStorageLimitForTier(tier);
    const uploadsSnap = await db
        .collection('users')
        .doc(userId)
        .collection('uploads')
        .get();
    let usedBytes = 0;
    for (const doc of uploadsSnap.docs) {
        const data = doc.data();
        usedBytes += data.fileSizeBytes || 0;
    }
    const availableBytes = Math.max(0, limitBytes - usedBytes);
    const percentageUsed = Math.round((usedBytes / limitBytes) * 100);
    return {
        usedBytes,
        limitBytes,
        availableBytes,
        percentageUsed,
    };
}
/**
 * Processes an audio upload - moves to protected originals folder
 */
async function processAudioUpload(userId, fileName, originalPath) {
    const db = (0, firebase_1.getDb)();
    const storage = (0, firebase_1.getStorage)();
    const bucket = storage.bucket();
    // Normalize filename to .wav
    const originalFileName = fileName.replace(/\.[^.]+$/, '.wav');
    const protectedPath = `originals/${userId}/${originalFileName}`;
    const trackId = originalFileName.replace('.wav', '');
    // Copy file to protected location
    try {
        await bucket.file(originalPath).copy(bucket.file(protectedPath));
        functions.logger.info('Original file secured:', protectedPath);
    }
    catch (error) {
        functions.logger.error('Failed to copy file to protected location', error);
        throw error;
    }
    // Record metadata
    const uploadRef = db.collection('uploads').doc(trackId);
    await uploadRef.set({
        userId,
        fileName,
        originalStoragePath: protectedPath,
        transcodingStatus: 'complete',
        createdAt: (0, firebase_1.serverTimestamp)(),
    }, { merge: true });
    functions.logger.info('Audio upload processing complete:', trackId);
}
/**
 * Gets a signed URL for streaming audio
 */
async function getStreamingUrl(uploaderId, trackId, expiryMs = 60 * 60 * 1000 // 1 hour default
) {
    const originalPath = `originals/${uploaderId}/${trackId}.wav`;
    const url = await (0, firebase_1.getSignedUrl)(originalPath, expiryMs);
    return {
        url,
        type: 'signed-url',
        expiresIn: Math.floor(expiryMs / 1000),
        mimeType: 'audio/wav',
    };
}
/**
 * Verifies purchase before granting library access
 */
async function verifyPurchase(userId, trackId) {
    const db = (0, firebase_1.getDb)();
    const purchaseSnap = await db
        .collection('users')
        .doc(userId)
        .collection('purchases')
        .where('trackId', '==', trackId)
        .limit(1)
        .get();
    return !purchaseSnap.empty;
}
/**
 * Gets library streaming URL (requires purchase verification)
 */
async function getLibraryStreamingUrl(userId, uploaderId, trackId) {
    // Verify purchase
    const hasPurchase = await verifyPurchase(userId, trackId);
    if (!hasPurchase) {
        throw new functions.https.HttpsError('permission-denied', 'No purchase found for this track');
    }
    // Return signed URL with longer expiry for library access
    return getStreamingUrl(uploaderId, trackId, 15 * 60 * 1000); // 15 minutes
}
