"use strict";
/**
 * Upload handlers - Storage validation, streaming URLs, and audio processing
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
/**
 * validateStorageLimit - Checks if user can upload file of given size
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
    const result = await uploadGuard.validateStorageQuota(userId, fileSizeBytes);
    if (!result.allowed) {
        throw new functions.https.HttpsError('resource-exhausted', `Storage limit exceeded. Available: ${(result.availableBytes / (1024 * 1024)).toFixed(2)}MB`);
    }
    return result;
});
/**
 * getStreamingUrl - Returns signed URL for audio streaming
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
 * Handler for Cloud Storage upload events
 */
async function processAudioUploadHandler(event) {
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
        await uploadGuard.processAudioUpload(userId, fileName, filePath);
    }
    catch (error) {
        functions.logger.error('Error processing audio upload:', error);
        throw error;
    }
}
/**
 * processAudioUpload - Cloud Storage trigger for new audio uploads
 */
const uploadBucket = process.env.UPLOAD_BUCKET_NAME;
exports.processAudioUpload = uploadBucket
    ? functionsV1.storage.bucket(uploadBucket).object().onFinalize(processAudioUploadHandler)
    : functionsV1.storage.object().onFinalize(processAudioUploadHandler);
