/**
 * Shoouts - Royalty-Free Track Seeder
 *
 * Seeds streamable royalty-free demo tracks into a test user's uploads so
 * streaming + cart/purchase flows can be validated end-to-end.
 *
 * Usage:
 *   npm run dev:seed:royalty-free
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const envRaw = readFileSync(resolve(__dir, '../.env'), 'utf-8');
const env = Object.fromEntries(
  envRaw
    .split('\n')
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const PROJECT = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = env.EXPO_PUBLIC_FIREBASE_API_KEY;
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const TEST_EMAIL = env.SEED_TEST_EMAIL || 'test@shoouts.dev';
const TEST_PASSWORD = env.SEED_TEST_PASSWORD || 'Shoouts2025!';
const TEST_NAME = env.SEED_TEST_NAME || 'Shoouts Royalty Free Demo';

if (!PROJECT) {
  throw new Error('EXPO_PUBLIC_FIREBASE_PROJECT_ID is required in .env');
}
const allowProdLikeSeed = String(process.env.ALLOW_SEED_PROD_LIKE || env.ALLOW_SEED_PROD_LIKE || '').toLowerCase() === 'true';
if (!allowProdLikeSeed && (PROJECT === 'shoouts-6178f' || PROJECT.includes('prod'))) {
  throw new Error(`Refusing to seed production-like project: ${PROJECT}`);
}
if (!API_KEY) {
  throw new Error('EXPO_PUBLIC_FIREBASE_API_KEY is required in .env');
}

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

async function signIn(email, password) {
  let response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  let data = await response.json();
  if (data.idToken) {
    return data;
  }

  // Auto-create the seed user if it doesn't exist.
  if (data?.error?.message === 'EMAIL_NOT_FOUND') {
    response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    data = await response.json();
    if (data.idToken) {
      return data;
    }
  }

  throw new Error(`Sign-in failed for ${email}: ${JSON.stringify(data.error || data)}`);
}

function val(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'object') return { mapValue: { fields: fields(v) } };
  return { stringValue: String(v) };
}

function fields(obj) {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, val(value)])
  );
}

async function upsert(path, data, token) {
  const response = await fetch(`${FS_BASE}/${path}?key=${API_KEY}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fields: fields(data) }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PATCH ${path} failed: ${text}`);
  }

  return response.json();
}

async function main() {
  console.log('\nSeeding royalty-free tracks...');
  console.log(`Project: ${PROJECT}`);

  const authData = await signIn(TEST_EMAIL, TEST_PASSWORD);
  const token = authData.idToken;
  const uid = authData.localId;
  const now = new Date().toISOString();

  await upsert(`users/${uid}`, {
    uid,
    email: TEST_EMAIL,
    displayName: TEST_NAME,
    role: 'hybrid',
    isPremium: true,
    updatedAt: now,
  }, token);

  let freeCount = 0;
  let paidCount = 0;

  for (const track of ROYALTY_FREE_TRACKS) {
    await upsert(`users/${uid}/uploads/${track.id}`, {
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
      // Attribution details for testing/legal clarity
      licenseType: 'royalty_free_demo',
      licenseSource: 'SoundHelix',
      licenseUrl: 'https://www.soundhelix.com/audio-examples',
      createdAt: now,
      updatedAt: now,
    }, token);

    if (track.price > 0) {
      paidCount += 1;
    } else {
      freeCount += 1;
    }

    console.log(`- ${track.title} (${track.price > 0 ? `$${track.price}` : 'Free'})`);
  }

  console.log('\nDone.');
  console.log(`Seeded ${ROYALTY_FREE_TRACKS.length} royalty-free tracks for ${TEST_EMAIL}`);
  console.log(`Free: ${freeCount} | Paid: ${paidCount}`);
  console.log(`Project guard override: ${allowProdLikeSeed ? 'ENABLED' : 'DISABLED'}`);
  console.log('\nTest flow:');
  console.log('1. Stream free/paid tracks from Home/Marketplace.');
  console.log('2. Add paid track to cart and complete checkout flow.');
  console.log('3. Verify purchase appears in Library after successful payment webhook.');
}

main().catch((err) => {
  console.error('Royalty-free seed failed:', err.message || err);
  process.exit(1);
});
