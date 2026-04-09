"use strict";
/**
 * Upload handlers - Storage validation, streaming URLs, and audio processing.
 * Uses subscription guards for ledger-aware access control.
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
exports.processAudioUpload = exports.getStreamingUrl = exports.validateStorageLimit = void 0;
const functions = __importStar(require("firebase-functions"));
const functionsV1 = __importStar(require("firebase-functions/v1"));
const uploadGuard = __importStar(require("../services/uploadGuard"));
const subscriptions_1 = require("../subscriptions");
const types_1 = require("../types");
/**
 * validateStorageLimit - Checks if user can upload to vault or studio.
 * Requires: vault, vault_pro, studio, or hybrid subscription.
 * Enforces ledger-aware storage + upload count limits.
 */
exports.validateStorageLimit = functions.https.onCall(async (data, context) => {
    if (!context?.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const userId = context.auth.uid;
    const fileSizeBytes = Number(data?.fileSizeBytes || 0);
    const ledger = String(data?.storageLedger || 'vault');
    if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid file size');
    }
    if (fileSizeBytes > types_1.MAX_FILE_SIZE_BYTES) {
        throw new functions.https.HttpsError('invalid-argument', `File exceeds ${types_1.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`);
    }
    // Use ledger-aware guards instead of legacy single-pool check
    if (ledger === 'studio') {
        const { entitlements, usage } = await subscriptions_1.guards.assertStudioUploadAllowed(userId, fileSizeBytes);
        return {
            allowed: true,
            ledger: 'studio',
            usedBytes: usage.usedBytes,
            limitBytes: entitlements.studioStorageLimitBytes,
            availableBytes: Math.max(0, entitlements.studioStorageLimitBytes - usage.usedBytes),
        };
    }
    else {
        const { entitlements, usage } = await subscriptions_1.guards.assertVaultUploadAllowed(userId, fileSizeBytes);
        return {
            allowed: true,
            ledger: 'vault',
            usedBytes: usage.usedBytes,
            usedCount: usage.usedCount,
            limitBytes: entitlements.vaultStorageLimitBytes,
            maxUploads: entitlements.maxVaultUploads,
            availableBytes: entitlements.vaultStorageLimitBytes === Infinity
                ? Infinity
                : Math.max(0, entitlements.vaultStorageLimitBytes - usage.usedBytes),
        };
    }
});
/**
 * getStreamingUrl - Returns signed URL for audio streaming.
 * Public streaming (marketplace preview) = any authenticated user.
 * Library access (purchased content) = verified purchase required.
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
    if (isLibraryAccess) {
        return uploadGuard.getLibraryStreamingUrl(userId, uploaderId, trackId);
    }
    else {
        return uploadGuard.getStreamingUrl(uploaderId, trackId);
    }
});
/**
 * processAudioUpload - Cloud Storage trigger for new audio uploads.
 * Fires when a file is uploaded to vaults/{userId}/{filename}.
 */
async function processAudioUploadHandler(event) {
    const filePath = event.data.name || '';
    if (!filePath.startsWith('vaults/')) {
        functions.logger.info('Skipping non-vault file:', filePath);
        return;
    }
    const pathParts = filePath.split('/');
    const userId = pathParts[1];
    const fileName = pathParts[2];
    try {
        await uploadGuard.processAudioUpload(userId, fileName, filePath);
    }
    catch (error) {
        functions.logger.error('Error processing audio upload:', error);
        throw error;
    }
}
const uploadBucket = process.env.UPLOAD_BUCKET_NAME;
exports.processAudioUpload = uploadBucket
    ? functionsV1.storage.bucket(uploadBucket).object().onFinalize(processAudioUploadHandler)
    : functionsV1.storage.object().onFinalize(processAudioUploadHandler);
