/**
 * One-time backfill for legacy published uploads missing publishSnapshot.
 *
 * Usage (from shoout/):
 *   - Dry run (default): node ./scripts/backfill-publish-snapshot.mjs
 *   - Apply changes:      node ./scripts/backfill-publish-snapshot.mjs --apply
 *   - Limit scan:         node ./scripts/backfill-publish-snapshot.mjs --apply --limit=2000
 *   - Tune page size:     node ./scripts/backfill-publish-snapshot.mjs --apply --page-size=300
 *
 * Prerequisites:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path.
 */
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const limitArg = args.find((a) => a.startsWith('--limit='));
const pageSizeArg = args.find((a) => a.startsWith('--page-size='));

const hardLimit = limitArg ? Number(limitArg.split('=')[1]) : null;
const pageSize = Math.max(50, Math.min(500, Number(pageSizeArg ? pageSizeArg.split('=')[1] : 300) || 300));

function readTimestampMs(value) {
  if (!value) return null;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value?._seconds) {
    return Number(value._seconds) * 1000;
  }
  return null;
}

function buildPublishSnapshot(data, fallbackNowMs) {
  const publishedAtMs = readTimestampMs(data?.publishedAt);
  const capturedAtMs = publishedAtMs || fallbackNowMs;

  return {
    title: String(data?.title || ''),
    genre: String(data?.genre || ''),
    assetType: String(data?.assetType || data?.trackType || ''),
    trackType: String(data?.trackType || data?.assetType || ''),
    bpm: Number(data?.bpm || 0),
    price: Number(data?.price || 0),
    description: String(data?.description || ''),
    audioUrl: String(data?.audioUrl || ''),
    coverUrl: String(data?.coverUrl || data?.artworkUrl || ''),
    isPublic: data?.isPublic === true,
    subscriberOnly: data?.subscriberOnly === true,
    userId: String(data?.userId || ''),
    uploaderName: String(data?.uploaderName || 'Shoouter'),
    snapshotVersion: 1,
    capturedAtMs,
    capturedAtIso: new Date(capturedAtMs).toISOString(),
  };
}

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account JSON path.');
  }

  if (admin.apps.length === 0) {
    admin.initializeApp();
  }

  const db = admin.firestore();

  console.log('Starting publishSnapshot legacy backfill...');
  console.log(`Mode: ${shouldApply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Page size: ${pageSize}`);
  if (hardLimit != null) {
    console.log(`Document scan limit: ${hardLimit}`);
  }

  let processed = 0;
  let eligible = 0;
  let updated = 0;
  let lastDoc = null;
  const startedAt = Date.now();

  while (true) {
    let q = db
      .collectionGroup('uploads')
      .where('published', '==', true)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize);

    if (lastDoc) {
      q = q.startAfter(lastDoc);
    }

    const snap = await q.get();
    if (snap.empty) {
      break;
    }

    let batch = shouldApply ? db.batch() : null;
    let batchOps = 0;

    for (const docSnap of snap.docs) {
      processed += 1;
      if (hardLimit != null && processed > hardLimit) {
        break;
      }

      const data = docSnap.data() || {};
      if (data.publishSnapshot && typeof data.publishSnapshot === 'object') {
        continue;
      }

      eligible += 1;
      const nowMs = Date.now();
      const snapshot = buildPublishSnapshot(data, nowMs);

      if (shouldApply && batch) {
        batch.update(docSnap.ref, {
          publishSnapshot: snapshot,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        batchOps += 1;

        if (batchOps >= 400) {
          await batch.commit();
          updated += batchOps;
          batch = db.batch();
          batchOps = 0;
        }
      }
    }

    if (shouldApply && batch && batchOps > 0) {
      await batch.commit();
      updated += batchOps;
    }

    lastDoc = snap.docs[snap.docs.length - 1];

    if (hardLimit != null && processed >= hardLimit) {
      break;
    }

    console.log(`Progress: processed=${processed}, eligible=${eligible}, updated=${updated}`);
  }

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log('Backfill complete.');
  console.log(`Processed published uploads: ${processed}`);
  console.log(`Missing publishSnapshot: ${eligible}`);
  console.log(`Updated documents: ${shouldApply ? updated : 0}`);
  console.log(`Elapsed: ${elapsedSec}s`);

  if (!shouldApply) {
    console.log('Dry run only. Re-run with --apply to write changes.');
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err?.message || err);
  process.exit(1);
});
