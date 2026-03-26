/**
 * Shoouts - Royalty-Free Track Seeder (Admin SDK)
 *
 * Uses Firebase Admin SDK to bypass Firestore security rules.
 * Requires GOOGLE_APPLICATION_CREDENTIALS.
 *
 * Usage:
 *   npm run dev:seed:royalty-free-admin
 */

import admin from 'firebase-admin';

const TEST_EMAIL = process.env.SEED_TEST_EMAIL || 'test@shoouts.dev';
const TEST_PASSWORD = process.env.SEED_TEST_PASSWORD || 'Shoouts2025!';
const TEST_NAME = process.env.SEED_TEST_NAME || 'Shoouts Royalty Free Demo';

const ROYALTY_FREE_TRACKS = [
  {
    id: 'rf_orbit_starter',
    title: 'Orbit Starter Pack',
    genre: 'Afrobeats',
    bpm: 102,
    price: 0,
    category: 'Beat',
    description: 'Royalty-free starter groove for streaming validation.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    coverUrl: 'https://placehold.co/600x600/140F10/FFFFFF/png?text=Orbit+Starter',
  },
  {
    id: 'rf_sunset_drumline',
    title: 'Sunset Drumline',
    genre: 'Amapiano',
    bpm: 112,
    price: 9.99,
    category: 'Beat',
    description: 'Royalty-free paid beat for cart and checkout tests.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    coverUrl: 'https://placehold.co/600x600/EC5C39/FFFFFF/png?text=Sunset+Drumline',
  },
  {
    id: 'rf_highlife_keys',
    title: 'Highlife Keys',
    genre: 'Highlife',
    bpm: 95,
    price: 12.5,
    category: 'Sample',
    description: 'Royalty-free melodic loops for listing + purchase path tests.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    coverUrl: 'https://placehold.co/600x600/1F3B5B/FFFFFF/png?text=Highlife+Keys',
  },
  {
    id: 'rf_midnight_perc',
    title: 'Midnight Percussion',
    genre: 'Afro House',
    bpm: 118,
    price: 0,
    category: 'Beat',
    description: 'Free royalty-free percussion loop for quick stream smoke tests.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    coverUrl: 'https://placehold.co/600x600/2F4F4F/FFFFFF/png?text=Midnight+Perc',
  },
  {
    id: 'rf_vault_vibes',
    title: 'Vault Vibes Extended',
    genre: 'Alt R&B',
    bpm: 88,
    price: 15,
    category: 'Beat',
    description: 'Paid royalty-free preview asset to test add-to-cart behavior.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    coverUrl: 'https://placehold.co/600x600/4A2D5E/FFFFFF/png?text=Vault+Vibes',
  },
  {
    id: 'rf_creator_bundle',
    title: 'Creator Bundle One',
    genre: 'Afro Soul',
    bpm: 90,
    price: 19.99,
    category: 'Sample',
    description: 'Royalty-free bundle for full purchase and library validation.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    coverUrl: 'https://placehold.co/600x600/355E3B/FFFFFF/png?text=Creator+Bundle',
  },
];

async function ensureUser(auth, db) {
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(TEST_EMAIL);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    userRecord = await auth.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      displayName: TEST_NAME,
    });
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.doc(`users/${userRecord.uid}`).set(
    {
      uid: userRecord.uid,
      email: TEST_EMAIL,
      displayName: TEST_NAME,
      role: 'hybrid',
      isPremium: true,
      canSell: true,
      updatedAt: now,
    },
    { merge: true }
  );

  return userRecord.uid;
}

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account JSON path.');
  }

  if (admin.apps.length === 0) {
    admin.initializeApp();
  }

  const projectId = String(admin.app().options.projectId || '');
  const allowProdLikeSeed = String(process.env.ALLOW_SEED_PROD_LIKE || '').toLowerCase() === 'true';
  if (!allowProdLikeSeed && (projectId === 'shoouts-6178f' || projectId.includes('prod'))) {
    throw new Error(`Refusing to seed production-like project: ${projectId}`);
  }

  const auth = admin.auth();
  const db = admin.firestore();
  const uid = await ensureUser(auth, db);

  let freeCount = 0;
  let paidCount = 0;

  for (const track of ROYALTY_FREE_TRACKS) {
    await db.doc(`users/${uid}/uploads/${track.id}`).set(
      {
        id: track.id,
        userId: uid,
        uploaderId: uid,
        uploaderName: TEST_NAME,
        artist: TEST_NAME,
        title: track.title,
        genre: track.genre,
        bpm: track.bpm,
        price: track.price,
        category: track.category,
        isbeat: track.category === 'Beat',
        isPublic: true,
        listenCount: 0,
        description: track.description,
        audioUrl: track.audioUrl,
        coverUrl: track.coverUrl,
        artworkUrl: track.coverUrl,
        fileName: `${track.id}.mp3`,
        licenseType: 'royalty_free_demo',
        licenseSource: 'SoundHelix',
        licenseUrl: 'https://www.soundhelix.com/audio-examples',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (track.price > 0) paidCount += 1;
    else freeCount += 1;

    console.log(`- ${track.title} (${track.price > 0 ? `$${track.price}` : 'Free'})`);
  }

  console.log('\nRoyalty-free admin seed completed.');
  console.log(`User: ${TEST_EMAIL} (${uid})`);
  console.log(`Tracks: ${ROYALTY_FREE_TRACKS.length} | Free: ${freeCount} | Paid: ${paidCount}`);
}

main().catch((err) => {
  console.error('Royalty-free admin seed failed:', err.message || err);
  process.exit(1);
});
