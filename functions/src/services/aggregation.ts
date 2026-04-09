/**
 * Aggregation service - Best sellers, trending, and scheduled uploads
 */

import * as functions from 'firebase-functions';
import { systemRepo, serverTimestamp, newBatch } from '../repositories';

export async function aggregateBestSellers(): Promise<number> {
  const uploadsSnap = await systemRepo.uploadsCollectionGroup()
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

  await systemRepo.setBestSellers({
    items: bestSellers,
    updatedAt: serverTimestamp(),
    itemCount: bestSellers.length,
  });

  functions.logger.info('Best sellers updated', { count: bestSellers.length });
  return bestSellers.length;
}

export async function aggregateTrending(): Promise<number> {
  const uploadsSnap = await systemRepo.uploadsCollectionGroup()
    .where('isPublic', '==', true)
    .orderBy('listenCount', 'desc')
    .limit(10)
    .get();

  const items = uploadsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    audioUrl: doc.data().audioUrl || '',
  }));

  await systemRepo.setTrending({
    items,
    updatedAt: serverTimestamp(),
  });

  functions.logger.info('Trending cache updated', { count: items.length });
  return items.length;
}

export async function promoteUpcomingUploads(): Promise<number> {
  const nowMs = Date.now();

  const dueSnap = await systemRepo.uploadsCollectionGroup()
    .where('isPublic', '==', true)
    .where('lifecycleStatus', '==', 'upcoming')
    .limit(500)
    .get();

  if (dueSnap.empty) return 0;

  let promoted = 0;
  let batchWrite = newBatch();
  let batchOps = 0;

  for (const docSnap of dueSnap.docs) {
    const data = docSnap.data() as Record<string, any>;

    let scheduledMs: number | null = null;
    if (typeof data.scheduledReleaseAtMs === 'number' && Number.isFinite(data.scheduledReleaseAtMs)) {
      scheduledMs = data.scheduledReleaseAtMs;
    } else if (typeof data.scheduledReleaseAtMs === 'string') {
      const parsed = Number(data.scheduledReleaseAtMs);
      if (Number.isFinite(parsed)) scheduledMs = parsed;
    } else if (typeof data.scheduledReleaseAtIso === 'string') {
      const parsedIso = Date.parse(data.scheduledReleaseAtIso);
      if (Number.isFinite(parsedIso)) scheduledMs = parsedIso;
    }

    if (scheduledMs != null && scheduledMs > nowMs) continue;

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

    batchWrite.update(docSnap.ref, {
      lifecycleStatus: 'published',
      published: true,
      isPublic: true,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishSnapshot,
    });

    batchOps += 1;
    promoted += 1;

    if (batchOps >= 400) {
      await batchWrite.commit();
      batchWrite = newBatch();
      batchOps = 0;
    }
  }

  if (batchOps > 0) await batchWrite.commit();

  functions.logger.info('Promoted due upcoming uploads', { promoted });
  return promoted;
}

// downgradeExpiredSubscriptions has moved to subscriptions/lifecycle.ts
