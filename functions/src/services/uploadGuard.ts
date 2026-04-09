/**
 * Upload Guard service - Storage limits, upload processing, and streaming URLs
 * Less priority on streaming URLs
 */

import * as functions from 'firebase-functions';
import { SubscriptionPlan } from '../types';
import { PLAN_QUOTAS } from '../subscriptions/catalog';
import { userRepo, storageRepo, serverTimestamp } from '../repositories';

export function getStorageLimitForTier(tier: SubscriptionPlan): number {
  const quotas = PLAN_QUOTAS[tier as keyof typeof PLAN_QUOTAS];
  return quotas ? quotas.vaultStorageBytes : PLAN_QUOTAS.vault.vaultStorageBytes;
}

export async function validateStorageQuota(
  userId: string,
  fileSizeBytes: number
): Promise<{ allowed: boolean; usedBytes: number; limitBytes: number; availableBytes: number }> {
  const subscription = await userRepo.getSubscription(userId);
  const tier = (subscription?.tier as SubscriptionPlan) || 'vault';
  const storageLimit = getStorageLimitForTier(tier);

  const uploadsSnap = await userRepo.getAllUploads(userId);
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

export async function getStorageStats(userId: string): Promise<{
  usedBytes: number; limitBytes: number; availableBytes: number; percentageUsed: number;
}> {
  const subscription = await userRepo.getSubscription(userId);
  const tier = (subscription?.tier as SubscriptionPlan) || 'vault';
  const limitBytes = getStorageLimitForTier(tier);

  const uploadsSnap = await userRepo.getAllUploads(userId);
  let usedBytes = 0;
  for (const doc of uploadsSnap.docs) {
    usedBytes += doc.data().fileSizeBytes || 0;
  }

  const availableBytes = Math.max(0, limitBytes - usedBytes);
  const percentageUsed = Math.round((usedBytes / limitBytes) * 100);
  return { usedBytes, limitBytes, availableBytes, percentageUsed };
}

export async function processAudioUpload(
  userId: string,
  fileName: string,
  originalPath: string
): Promise<void> {
  const originalFileName = fileName.replace(/\.[^.]+$/, '.wav');
  const protectedPath = `originals/${userId}/${originalFileName}`;
  const trackId = originalFileName.replace('.wav', '');

  try {
    await storageRepo.copyFile(originalPath, protectedPath);
    functions.logger.info('Original file secured:', protectedPath);
  } catch (error) {
    functions.logger.error('Failed to copy file to protected location', error);
    throw error;
  }

  // Write to user's uploads subcollection (not root uploads)
  const uploadDocRef = userRepo.uploadRef(userId, trackId);
  await uploadDocRef.set(
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

export async function getStreamingUrl(
  uploaderId: string,
  trackId: string,
  expiryMs: number = 60 * 60 * 1000
): Promise<{ url: string; type: string; expiresIn: number; mimeType: string }> {
  const originalPath = `originals/${uploaderId}/${trackId}.wav`;
  const url = await storageRepo.getSignedUrl(originalPath, expiryMs);
  return { url, type: 'signed-url', expiresIn: Math.floor(expiryMs / 1000), mimeType: 'audio/wav' };
}

export async function verifyPurchase(userId: string, trackId: string): Promise<boolean> {
  const snap = await userRepo.purchasesQuery(userId)
    .where('trackId', '==', trackId)
    .limit(1)
    .get();
  return !snap.empty;
}

export async function getLibraryStreamingUrl(
  userId: string,
  uploaderId: string,
  trackId: string
): Promise<{ url: string; type: string; expiresIn: number; mimeType: string }> {
  const hasPurchase = await verifyPurchase(userId, trackId);
  if (!hasPurchase) {
    throw new functions.https.HttpsError('permission-denied', 'No purchase found for this track');
  }
  return getStreamingUrl(uploaderId, trackId, 15 * 60 * 1000);
}
