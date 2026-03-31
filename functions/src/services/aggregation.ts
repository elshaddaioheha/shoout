/**
 * Aggregation service - Best sellers, trending, and scheduled uploads
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getDb, batch, serverTimestamp } from '../utils/firebase';
import { parseTimestamp } from '../utils/formatting';

/**
 * Aggregates top 12 best-selling tracks
 */
export async function aggregateBestSellers(): Promise<number> {
  const db = getDb();

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
    updatedAt: serverTimestamp(),
    itemCount: bestSellers.length,
  });

  functions.logger.info('Best sellers updated', { count: bestSellers.length });
  return bestSellers.length;
}

/**
 * Aggregates top 10 trending tracks
 */
export async function aggregateTrending(): Promise<number> {
  const db = getDb();

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
    updatedAt: serverTimestamp(),
  });

  functions.logger.info('Trending cache updated', { count: items.length });
  return items.length;
}

/**
 * Promotes scheduled uploads that are due for release
 */
export async function promoteUpcomingUploads(): Promise<number> {
  const db = getDb();
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
  let batchWrite = batch();
  let batchOps = 0;

  for (const docSnap of dueSnap.docs) {
    const data = docSnap.data() as Record<string, any>;

    // Parse scheduled release time
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
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishSnapshot,
    });

    batchOps += 1;
    promoted += 1;

    // Commit batch if reaching limit
    if (batchOps >= 400) {
      await batchWrite.commit();
      batchWrite = batch();
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
export async function downgradeExpiredSubscriptions(): Promise<number> {
  const db = getDb();
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
  let batchWrite = batch();
  let batchOps = 0;

  for (const docSnap of expiredSnap.docs) {
    const userRef = docSnap.ref.parent.parent;
    if (!userRef) continue;

    // Import helpers from subscriptionLifecycle
    const { firestoreExpiredSubscriptionDocPatch, firestoreExpiredUserRolePatch } = await import(
      '../subscriptionLifecycle'
    );

    batchWrite.set(
      docSnap.ref,
      {
        ...firestoreExpiredSubscriptionDocPatch(),
        updatedAt: serverTimestamp(),
        downgradedAt: serverTimestamp(),
      },
      { merge: true }
    );

    batchWrite.set(
      userRef,
      {
        ...firestoreExpiredUserRolePatch(),
        downgradedAt: serverTimestamp(),
      },
      { merge: true }
    );

    batchOps += 2;
    downgraded += 1;

    if (batchOps >= 400) {
      await batchWrite.commit();
      batchWrite = batch();
      batchOps = 0;
    }
  }

  if (batchOps > 0) {
    await batchWrite.commit();
  }

  functions.logger.info('Downgraded expired subscriptions', { downgraded });
  return downgraded;
}
