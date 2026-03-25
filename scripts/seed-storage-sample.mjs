/**
 * Seed one sample creator + one uploaded song in Firebase Storage and Firestore.
 *
 * What this script does:
 * 1) Ensures a sample creator exists in Firebase Auth
 * 2) Uploads a sample MP3 file to Storage at vaults/{uid}/{trackId}.mp3
 * 3) Writes creator profile + subscription doc
 * 4) Writes song metadata under users/{uid}/uploads/{trackId}
 * 5) Writes mirrored transcoding/lookup doc under uploads/{trackId}
 *
 * Usage:
 *   node scripts/seed-storage-sample.mjs
 *
 * Auth options (pick one):
 * - GOOGLE_APPLICATION_CREDENTIALS=/abs/path/service-account.json
 * - FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dir, '../.env');
  const envRaw = readFileSync(envPath, 'utf-8');
  return Object.fromEntries(
    envRaw
      .split('\n')
      .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
}

function normalizeBucketName(bucket) {
  if (!bucket) return '';
  return bucket.replace(/^gs:\/\//, '').trim();
}

function initAdmin(env) {
  const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('EXPO_PUBLIC_FIREBASE_PROJECT_ID is required in .env');
  }
  if (projectId === 'shoouts-6178f' || projectId.includes('prod')) {
    throw new Error(`Refusing to seed production-like project: ${projectId}`);
  }

  const storageBucket = normalizeBucketName(env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET);
  if (!storageBucket) {
    throw new Error('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET is missing in .env');
  }

  const inlineServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (inlineServiceAccount) {
    const credential = admin.credential.cert(JSON.parse(inlineServiceAccount));
    admin.initializeApp({
      credential,
      storageBucket,
    });
  } else {
    // Uses GOOGLE_APPLICATION_CREDENTIALS when set.
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket,
    });
  }

  return {
    db: admin.firestore(),
    auth: admin.auth(),
    bucket: admin.storage().bucket(storageBucket),
  };
}

async function ensureCreator(auth, creator) {
  try {
    const existing = await auth.getUserByEmail(creator.email);
    return existing;
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }

    return auth.createUser({
      email: creator.email,
      password: creator.password,
      displayName: creator.displayName,
      emailVerified: true,
    });
  }
}

async function uploadSampleAudio(bucket, uid, trackId) {
  const sourceUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch sample audio (${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  const storagePath = `vaults/${uid}/${trackId}.mp3`;
  const file = bucket.file(storagePath);

  await file.save(fileBuffer, {
    resumable: false,
    metadata: {
      contentType: 'audio/mpeg',
      metadata: {
        uploaderId: uid,
        trackId,
        source: 'seed-storage-sample',
      },
    },
  });

  const [downloadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 1000 * 60 * 60 * 24 * 365,
  });

  return {
    storagePath,
    fileSizeBytes: fileBuffer.length,
    audioUrl: downloadUrl,
  };
}

async function seed() {
  const env = loadEnv();
  const { db, auth, bucket } = initAdmin(env);

  const creator = {
    email: 'sample.creator@shoouts.dev',
    password: 'Shoouts2026!',
    displayName: 'Sample Creator',
  };

  const trackId = 'sample_afro_vault_track_001';
  const now = admin.firestore.FieldValue.serverTimestamp();

  const user = await ensureCreator(auth, creator);
  const uid = user.uid;

  await auth.setCustomUserClaims(uid, { role: 'creator' });

  const uploadResult = await uploadSampleAudio(bucket, uid, trackId);

  const creatorProfile = {
    uid,
    fullName: creator.displayName,
    displayName: creator.displayName,
    email: creator.email,
    role: 'studio',
    bio: 'Seeded sample creator for storage/upload testing.',
    genre: 'Afrobeats',
    isPremium: true,
    verified: true,
    followers: 0,
    following: 0,
    playlists: 0,
    createdAt: now,
    updatedAt: now,
  };

  const subscription = {
    tier: 'studio',
    isSubscribed: true,
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 1000 * 60 * 60 * 24 * 365),
    updatedAt: now,
  };

  const songMetadata = {
    id: trackId,
    title: 'Sample Afro Vault Track',
    description: 'Seeded sample track with complete metadata for testing upload, playback, and marketplace listings.',
    genre: 'Afrobeats',
    assetType: 'Beat',
    bpm: 102,
    key: 'F# minor',
    mood: 'Energetic',
    tags: ['afrobeats', 'seed', 'demo', 'marketplace'],
    durationSec: 375,
    price: 29.99,
    currency: 'USD',
    isPublic: true,
    listenCount: 0,
    likesCount: 0,
    commentsCount: 0,
    userId: uid,
    uploaderId: uid,
    uploaderName: creator.displayName,
    fileName: `${trackId}.mp3`,
    fileSizeBytes: uploadResult.fileSizeBytes,
    audioUrl: uploadResult.audioUrl,
    coverUrl: '',
    storagePath: uploadResult.storagePath,
    originalStoragePath: `originals/${uid}/${trackId}.wav`,
    transcodingStatus: 'complete',
    waveformPeaks: [0.12, 0.4, 0.65, 0.33, 0.88, 0.42, 0.59, 0.21],
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();

  batch.set(db.doc(`users/${uid}`), creatorProfile, { merge: true });
  batch.set(db.doc(`users/${uid}/subscription/current`), subscription, { merge: true });
  batch.set(db.doc(`users/${uid}/uploads/${trackId}`), songMetadata, { merge: true });
  batch.set(db.doc(`uploads/${trackId}`), {
    ...songMetadata,
    // Keep this collection focused on backend lookup/transcoding metadata.
    audioUrl: '',
  }, { merge: true });

  await batch.commit();

  console.log('\n✅ Sample creator and song seeded successfully\n');
  console.log(`Creator UID: ${uid}`);
  console.log(`Creator Email: ${creator.email}`);
  console.log(`Track ID: ${trackId}`);
  console.log(`Storage Path: ${uploadResult.storagePath}`);
  console.log(`Download URL (signed): ${uploadResult.audioUrl}\n`);
}

seed().catch((error) => {
  console.error('\n❌ seed-storage-sample failed');
  console.error(error);
  process.exit(1);
});
