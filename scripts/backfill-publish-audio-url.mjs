/**
 * One-time backfill for published uploads missing a playable audioUrl.
 *
 * Usage (from shoout/):
 *   - Dry run (default): node ./scripts/backfill-publish-audio-url.mjs
 *   - Apply changes:      node ./scripts/backfill-publish-audio-url.mjs --apply
 *   - Limit scan:         node ./scripts/backfill-publish-audio-url.mjs --apply --limit=2000
 *   - Tune page size:     node ./scripts/backfill-publish-audio-url.mjs --apply --page-size=300
 *
 * Prerequisites:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path.
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, getApps } from 'firebase/app';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';

const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const pageSizeArg = args.find((arg) => arg.startsWith('--page-size='));

const hardLimit = limitArg ? Number(limitArg.split('=')[1]) : null;
const pageSize = Math.max(50, Math.min(500, Number(pageSizeArg ? pageSizeArg.split('=')[1] : 300) || 300));

function loadEnv() {
  const content = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const entries = content
    .split('\n')
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => {
      const [key, ...rest] = line.split('=');
      return [key.trim(), rest.join('=').trim()];
    });

  return Object.fromEntries(entries);
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function stripExtension(value) {
  return String(value || '').replace(/\.[^.]+$/, '');
}

function readTimestampMs(value) {
  if (!value) return null;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsedNumber = Number(value);
    if (Number.isFinite(parsedNumber)) return parsedNumber;
    const parsedDate = Date.parse(value);
    if (Number.isFinite(parsedDate)) return parsedDate;
  }
  if (value?._seconds) {
    return Number(value._seconds) * 1000;
  }
  return null;
}

function buildPublishSnapshot(data, audioUrl, fallbackNowMs) {
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
    audioUrl,
    coverUrl: String(data?.coverUrl || data?.artworkUrl || ''),
    isPublic: data?.isPublic === true,
    subscriberOnly: data?.subscriberOnly === true,
    userId: String(data?.userId || data?.uploaderId || ''),
    uploaderName: String(data?.uploaderName || data?.artist || 'Shoouter'),
    snapshotVersion: 1,
    capturedAtMs,
    capturedAtIso: new Date(capturedAtMs).toISOString(),
  };
}

async function resolveDownloadUrl(storage, bucketName, objectPath, downloadToken) {
  try {
    return await getDownloadURL(ref(storage, objectPath));
  } catch {
    if (downloadToken) {
      return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`;
    }
    return null;
  }
}

async function main() {
  const env = loadEnv();
  const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error('Missing EXPO_PUBLIC_FIREBASE_PROJECT_ID in .env');
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const fallbackServiceAccount = resolve(process.cwd(), '..', 'serviceAccountKey.json');
    if (existsSync(fallbackServiceAccount)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = fallbackServiceAccount;
    } else {
      throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account JSON path.');
    }
  }

  if (getApps().length === 0) {
    initializeApp({
      apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
    });
  }

  if (admin.apps.length === 0) {
    admin.initializeApp({ projectId });
  }

  const db = admin.firestore();
  const storage = getStorage();

  console.log('Starting published audioUrl backfill...');
  console.log(`Mode: ${shouldApply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Page size: ${pageSize}`);
  if (hardLimit != null) {
    console.log(`Document scan limit: ${hardLimit}`);
  }

  let processed = 0;
  let eligible = 0;
  let updated = 0;
  let skippedNoMatch = 0;
  const uploaderFileCache = new Map();
  const startedAt = Date.now();

  async function getUploaderFiles(uploaderId) {
    if (uploaderFileCache.has(uploaderId)) {
      return uploaderFileCache.get(uploaderId);
    }

    const bucket = storage.app.options.storageBucket;
    const bucketName = String(bucket || env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '');
    const bucketRef = admin.storage().bucket(bucketName);
    const prefixes = [
      `vaults/${uploaderId}/`,
      `users/${uploaderId}/audio/`,
      `users/${uploaderId}/`,
    ];

    const seenNames = new Set();
    const mapped = [];

    for (const prefix of prefixes) {
      const [files] = await bucketRef.getFiles({ prefix });
      for (const file of files) {
        if (seenNames.has(file.name)) {
          continue;
        }
        seenNames.add(file.name);
        const [metadata] = await file.getMetadata();
        const downloadToken = String(
          metadata?.metadata?.firebaseStorageDownloadTokens ||
          metadata?.firebaseStorageDownloadTokens ||
          ''
        ).split(',')[0].trim();
        mapped.push({
          name: file.name,
          timeCreated: metadata.timeCreated || metadata.updated || null,
          downloadToken,
        });
      }
    }

    mapped.sort((a, b) => (Date.parse(b.timeCreated || '') || 0) - (Date.parse(a.timeCreated || '') || 0));
    uploaderFileCache.set(uploaderId, mapped);
    return mapped;
  }

  let lastUserDoc = null;
  while (true) {
    let userQuery = db.collection('users').limit(pageSize);
    if (lastUserDoc) {
      userQuery = userQuery.startAfter(lastUserDoc);
    }

    const usersSnap = await userQuery.get();
    if (usersSnap.empty) {
      if (lastUserDoc === null) {
        console.log('No user documents found.');
      }
      break;
    }

    for (const userDoc of usersSnap.docs) {
      if (hardLimit != null && processed >= hardLimit) {
        break;
      }

      const uploaderId = userDoc.id;
      const uploadsSnap = await userDoc.ref
        .collection('uploads')
        .where('isPublic', '==', true)
        .get();

      if (uploadsSnap.empty) {
        continue;
      }

      let batch = shouldApply ? db.batch() : null;
      let batchOps = 0;

      for (const docSnap of uploadsSnap.docs) {
        if (hardLimit != null && processed >= hardLimit) {
          break;
        }

        processed += 1;

        const data = docSnap.data() || {};
        const currentAudioUrl = String(data.audioUrl || data.url || '');
        const titleSlug = slugify(data.title);
        const fileSlug = slugify(stripExtension(data.fileName || ''));

        if (currentAudioUrl) {
          continue;
        }

        eligible += 1;

        const files = await getUploaderFiles(uploaderId);
        const match = files.find((file) => {
          const baseName = slugify(stripExtension(file.name.split('/').pop() || ''));
          return (
            (titleSlug && (baseName === titleSlug || baseName.startsWith(`${titleSlug}_`) || baseName.includes(`_${titleSlug}_`))) ||
            (fileSlug && (baseName === fileSlug || baseName.startsWith(`${fileSlug}_`) || baseName.includes(`_${fileSlug}_`)))
          );
        });

        if (!match) {
          skippedNoMatch += 1;
          console.log(`No storage match for ${docSnap.ref.path}`);
          continue;
        }

        const bucketName = String(storage.app.options.storageBucket || env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '');
        const resolvedAudioUrl = await resolveDownloadUrl(storage, bucketName, match.name, match.downloadToken);
        if (!resolvedAudioUrl) {
          skippedNoMatch += 1;
          console.log(`Could not resolve download URL for ${match.name}`);
          continue;
        }

        const publishSnapshot = buildPublishSnapshot(data, resolvedAudioUrl, Date.now());

        if (shouldApply && batch) {
          batch.update(docSnap.ref, {
            audioUrl: resolvedAudioUrl,
            publishSnapshot,
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

        console.log(`Matched ${docSnap.ref.path} -> ${match.name}`);
      }

      if (shouldApply && batch && batchOps > 0) {
        await batch.commit();
        updated += batchOps;
      }

      console.log(`Progress: processed=${processed}, eligible=${eligible}, updated=${updated}, skippedNoMatch=${skippedNoMatch}`);
    }

    lastUserDoc = usersSnap.docs[usersSnap.docs.length - 1];

    if (hardLimit != null && processed >= hardLimit) {
      break;
    }
  }

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log('Backfill complete.');
  console.log(`Processed published uploads: ${processed}`);
  console.log(`Missing audioUrl: ${eligible}`);
  console.log(`Matched/resolved: ${shouldApply ? updated : 0}`);
  console.log(`Skipped (no match / missing path): ${skippedNoMatch}`);
  console.log(`Elapsed: ${elapsedSec}s`);

  if (!shouldApply) {
    console.log('Dry run only. Re-run with --apply to write changes.');
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err?.message || err);
  process.exit(1);
});