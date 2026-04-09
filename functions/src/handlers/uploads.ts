/**
 * Upload handlers - Storage validation, streaming URLs, and audio processing.
 * Uses subscription guards for ledger-aware access control.
 */

import * as functions from 'firebase-functions';
import * as functionsV1 from 'firebase-functions/v1';
import * as uploadGuard from '../services/uploadGuard';
import { guards } from '../subscriptions';
import { MAX_FILE_SIZE_BYTES } from '../types';

/**
 * validateStorageLimit - Checks if user can upload to vault or studio.
 * Requires: vault, vault_pro, studio, or hybrid subscription.
 * Enforces ledger-aware storage + upload count limits.
 */
export const validateStorageLimit = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const userId = context.auth.uid;
  const fileSizeBytes = Number(data?.fileSizeBytes || 0);
  const ledger = String(data?.storageLedger || 'vault');

  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid file size');
  }
  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new functions.https.HttpsError('invalid-argument', `File exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`);
  }

  // Use ledger-aware guards instead of legacy single-pool check
  if (ledger === 'studio') {
    const { entitlements, usage } = await guards.assertStudioUploadAllowed(userId, fileSizeBytes);
    return {
      allowed: true,
      ledger: 'studio',
      usedBytes: usage.usedBytes,
      limitBytes: entitlements.studioStorageLimitBytes,
      availableBytes: Math.max(0, entitlements.studioStorageLimitBytes - usage.usedBytes),
    };
  } else {
    const { entitlements, usage } = await guards.assertVaultUploadAllowed(userId, fileSizeBytes);
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

  if (isLibraryAccess) {
    return uploadGuard.getLibraryStreamingUrl(userId, uploaderId, trackId);
  } else {
    return uploadGuard.getStreamingUrl(uploaderId, trackId);
  }
});

/**
 * processAudioUpload - Cloud Storage trigger for new audio uploads.
 * Fires when a file is uploaded to vaults/{userId}/{filename}.
 */
async function processAudioUploadHandler(event: any): Promise<void> {
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
  } catch (error) {
    functions.logger.error('Error processing audio upload:', error);
    throw error;
  }
}

const uploadBucket = process.env.UPLOAD_BUCKET_NAME;

export const processAudioUpload = uploadBucket
  ? functionsV1.storage.bucket(uploadBucket).object().onFinalize(processAudioUploadHandler)
  : functionsV1.storage.object().onFinalize(processAudioUploadHandler);
