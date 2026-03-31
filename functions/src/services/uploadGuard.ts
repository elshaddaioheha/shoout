/**
 * Upload Guard service - Storage limits, upload processing, and streaming URLs
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { TIER_STORAGE_LIMITS, SubscriptionPlan } from '../types';
import { getDb, getStorage, getUserSubscription, serverTimestamp, getSignedUrl } from '../utils/firebase';

/**
 * Gets storage limit for a subscription tier
 */
export function getStorageLimitForTier(tier: SubscriptionPlan): number {
  return TIER_STORAGE_LIMITS[tier] || TIER_STORAGE_LIMITS.vault;
}

/**
 * Validates if user can upload file of given size
 */
export async function validateStorageQuota(
  userId: string,
  fileSizeBytes: number
): Promise<{
  allowed: boolean;
  usedBytes: number;
  limitBytes: number;
  availableBytes: number;
}> {
  const db = getDb();

  // Get user's subscription tier
  const subscription = await getUserSubscription(userId);
  const tier = (subscription?.tier as SubscriptionPlan) || 'vault';
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
export async function getStorageStats(userId: string): Promise<{
  usedBytes: number;
  limitBytes: number;
  availableBytes: number;
  percentageUsed: number;
}> {
  const db = getDb();

  const subscription = await getUserSubscription(userId);
  const tier = (subscription?.tier as SubscriptionPlan) || 'vault';
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
export async function processAudioUpload(
  userId: string,
  fileName: string,
  originalPath: string
): Promise<void> {
  const db = getDb();
  const storage = getStorage();
  const bucket = storage.bucket();

  // Normalize filename to .wav
  const originalFileName = fileName.replace(/\.[^.]+$/, '.wav');
  const protectedPath = `originals/${userId}/${originalFileName}`;
  const trackId = originalFileName.replace('.wav', '');

  // Copy file to protected location
  try {
    await bucket.file(originalPath).copy(bucket.file(protectedPath));
    functions.logger.info('Original file secured:', protectedPath);
  } catch (error) {
    functions.logger.error('Failed to copy file to protected location', error);
    throw error;
  }

  // Record metadata
  const uploadRef = db.collection('uploads').doc(trackId);
  await uploadRef.set(
    {
      userId,
      fileName,
      originalStoragePath: protectedPath,
      transcodingStatus: 'complete',
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  functions.logger.info('Audio upload processing complete:', trackId);
}

/**
 * Gets a signed URL for streaming audio
 */
export async function getStreamingUrl(
  uploaderId: string,
  trackId: string,
  expiryMs: number = 60 * 60 * 1000 // 1 hour default
): Promise<{
  url: string;
  type: string;
  expiresIn: number;
  mimeType: string;
}> {
  const originalPath = `originals/${uploaderId}/${trackId}.wav`;

  const url = await getSignedUrl(originalPath, expiryMs);

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
export async function verifyPurchase(userId: string, trackId: string): Promise<boolean> {
  const db = getDb();
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
export async function getLibraryStreamingUrl(
  userId: string,
  uploaderId: string,
  trackId: string
): Promise<{
  url: string;
  type: string;
  expiresIn: number;
  mimeType: string;
}> {
  // Verify purchase
  const hasPurchase = await verifyPurchase(userId, trackId);
  if (!hasPurchase) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'No purchase found for this track'
    );
  }

  // Return signed URL with longer expiry for library access
  return getStreamingUrl(uploaderId, trackId, 15 * 60 * 1000); // 15 minutes
}
