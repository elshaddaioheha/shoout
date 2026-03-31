/**
 * Upload handlers - Storage validation, streaming URLs, and audio processing
 */

import * as functions from 'firebase-functions';
import * as functionsV1 from 'firebase-functions/v1';
import * as uploadGuard from '../services/uploadGuard';
import { getDb, serverTimestamp } from '../utils/firebase';

/**
 * validateStorageLimit - Checks if user can upload file of given size
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

  const result = await uploadGuard.validateStorageQuota(userId, fileSizeBytes);

  if (!result.allowed) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Storage limit exceeded. Available: ${(result.availableBytes / (1024 * 1024)).toFixed(2)}MB`
    );
  }

  return result;
});

/**
 * getStreamingUrl - Returns signed URL for audio streaming
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
    throw new functions.https.HttpsError(
      'invalid-argument',
      'trackId and uploaderId required'
    );
  }

  if (isLibraryAccess) {
    return uploadGuard.getLibraryStreamingUrl(userId, uploaderId, trackId);
  } else {
    return uploadGuard.getStreamingUrl(uploaderId, trackId);
  }
});

/**
 * Handler for Cloud Storage upload events
 */
async function processAudioUploadHandler(event: any): Promise<void> {
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
  } catch (error) {
    functions.logger.error('Error processing audio upload:', error);
    throw error;
  }
}

/**
 * processAudioUpload - Cloud Storage trigger for new audio uploads
 */
const uploadBucket = process.env.UPLOAD_BUCKET_NAME;

export const processAudioUpload = uploadBucket
  ? functionsV1.storage.bucket(uploadBucket).object().onFinalize(processAudioUploadHandler)
  : functionsV1.storage.object().onFinalize(processAudioUploadHandler);
