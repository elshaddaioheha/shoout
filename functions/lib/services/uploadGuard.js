"use strict";
/**
 * Upload Guard service - Storage limits, upload processing, and streaming URLs
 * Less priority on streaming URLs
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
const catalog_1 = require("../subscriptions/catalog");
const repositories_1 = require("../repositories");
function getStorageLimitForTier(tier) {
    const quotas = catalog_1.PLAN_QUOTAS[tier];
    return quotas ? quotas.vaultStorageBytes : catalog_1.PLAN_QUOTAS.vault.vaultStorageBytes;
}
async function validateStorageQuota(userId, fileSizeBytes) {
    const subscription = await repositories_1.userRepo.getSubscription(userId);
    const tier = subscription?.tier || 'vault';
    const storageLimit = getStorageLimitForTier(tier);
    const uploadsSnap = await repositories_1.userRepo.getAllUploads(userId);
    let totalUsedBytes = 0;
    for (const doc of uploadsSnap.docs) {
        totalUsedBytes += doc.data().fileSizeBytes || 0;
    }
    const availableBytes = storageLimit - totalUsedBytes;
    return {
        allowed: fileSizeBytes <= availableBytes,
        usedBytes: totalUsedBytes,
        limitBytes: storageLimit,
        availableBytes: Math.max(0, availableBytes),
    };
}
async function getStorageStats(userId) {
    const subscription = await repositories_1.userRepo.getSubscription(userId);
    const tier = subscription?.tier || 'vault';
    const limitBytes = getStorageLimitForTier(tier);
    const uploadsSnap = await repositories_1.userRepo.getAllUploads(userId);
    let usedBytes = 0;
    for (const doc of uploadsSnap.docs) {
        usedBytes += doc.data().fileSizeBytes || 0;
    }
    const availableBytes = Math.max(0, limitBytes - usedBytes);
    const percentageUsed = Math.round((usedBytes / limitBytes) * 100);
    return { usedBytes, limitBytes, availableBytes, percentageUsed };
}
async function processAudioUpload(userId, fileName, originalPath) {
    const originalFileName = fileName.replace(/\.[^.]+$/, '.wav');
    const protectedPath = `originals/${userId}/${originalFileName}`;
    const trackId = originalFileName.replace('.wav', '');
    try {
        await repositories_1.storageRepo.copyFile(originalPath, protectedPath);
        functions.logger.info('Original file secured:', protectedPath);
    }
    catch (error) {
        functions.logger.error('Failed to copy file to protected location', error);
        throw error;
    }
    // Write to user's uploads subcollection (not root uploads)
    const uploadDocRef = repositories_1.userRepo.uploadRef(userId, trackId);
    await uploadDocRef.set({
        userId,
        fileName,
        originalStoragePath: protectedPath,
        transcodingStatus: 'complete',
        createdAt: (0, repositories_1.serverTimestamp)(),
    }, { merge: true });
    functions.logger.info('Audio upload processing complete:', trackId);
}
async function getStreamingUrl(uploaderId, trackId, expiryMs = 60 * 60 * 1000) {
    const originalPath = `originals/${uploaderId}/${trackId}.wav`;
    const url = await repositories_1.storageRepo.getSignedUrl(originalPath, expiryMs);
    return { url, type: 'signed-url', expiresIn: Math.floor(expiryMs / 1000), mimeType: 'audio/wav' };
}
async function verifyPurchase(userId, trackId) {
    const snap = await repositories_1.userRepo.purchasesQuery(userId)
        .where('trackId', '==', trackId)
        .limit(1)
        .get();
    return !snap.empty;
}
async function getLibraryStreamingUrl(userId, uploaderId, trackId) {
    const hasPurchase = await verifyPurchase(userId, trackId);
    if (!hasPurchase) {
        throw new functions.https.HttpsError('permission-denied', 'No purchase found for this track');
    }
    return getStreamingUrl(uploaderId, trackId, 15 * 60 * 1000);
}
