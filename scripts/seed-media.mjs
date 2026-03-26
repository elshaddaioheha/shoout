/**
 * Shoouts - Media Catalog Seeder (Admin SDK)
 *
 * Seeds marketplace-style media documents into top-level Firestore collections:
 * - tracks
 * - playlists
 * - users (artists, merged to avoid destructive overwrite)
 *
 * Usage:
 *   npm run dev:seed:media
 *
 * Auth:
 *   Preferred: set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.
 *   Fallback:  place serviceAccountKey.json at project root (shoout/serviceAccountKey.json).
 */

import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dir, '..');
const LOCAL_SERVICE_ACCOUNT = resolve(ROOT_DIR, 'serviceAccountKey.json');

const TRACKS = [
  { id: 't1', title: 'Orbit', artist: 'Mara Jade', uploaderName: 'Mara Jade', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', artworkUrl: 'https://picsum.photos/seed/t1/400/400', uploaderId: 'a1', isTrending: true, price: 10, type: 'song' },
  { id: 't2', title: 'Night Drive', artist: 'Luna', uploaderName: 'Luna', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', artworkUrl: 'https://picsum.photos/seed/t2/400/400', uploaderId: 'a2', isTrending: true, price: 15, type: 'song' },
  { id: 'f1', title: 'Weightless', artist: 'Nova', uploaderName: 'Nova', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', artworkUrl: 'https://picsum.photos/seed/f1/300/300', uploaderId: 'a4', isFree: true, price: 0, type: 'song' },
  { id: 'f2', title: 'Sundown', artist: 'Kai', uploaderName: 'Kai', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', artworkUrl: 'https://picsum.photos/seed/f2/300/300', uploaderId: 'a5', isFree: true, price: 0, type: 'song' },
  { id: 'b1', title: 'Pulse', artist: 'Sage', uploaderName: 'Sage', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', artworkUrl: 'https://picsum.photos/seed/b1/200/200', uploaderId: 'a7', isPopularBeat: true, price: 20, type: 'beat' },
  { id: 'b2', title: 'Drift', artist: 'Vela', uploaderName: 'Vela', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', artworkUrl: 'https://picsum.photos/seed/b2/200/200', uploaderId: 'a8', isPopularBeat: true, price: 18, type: 'beat' },
];

const PLAYLISTS = [
  { id: 'p1', title: 'Studio Focus', genre: 'Lo-fi', price: 0, artworkUrl: 'https://picsum.photos/seed/p1/300/300', trackIds: ['t1', 'f1'] },
  { id: 'p2', title: 'Creator Picks', genre: 'Indie', price: 12, artworkUrl: 'https://picsum.photos/seed/p2/300/300', trackIds: ['t2', 'b1'] },
];

const ARTISTS = [
  { id: 'a1', fullName: 'Mara Jade', displayName: 'Mara Jade', avatarUrl: 'https://i.pravatar.cc/150?u=a1', role: 'studio' },
  { id: 'a2', fullName: 'Luna', displayName: 'Luna', avatarUrl: 'https://i.pravatar.cc/150?u=a2', role: 'studio' },
  { id: 'a4', fullName: 'Nova', displayName: 'Nova', avatarUrl: 'https://i.pravatar.cc/150?u=a4', role: 'studio' },
  { id: 'a5', fullName: 'Kai', displayName: 'Kai', avatarUrl: 'https://i.pravatar.cc/150?u=a5', role: 'studio' },
  { id: 'a7', fullName: 'Sage', displayName: 'Sage', avatarUrl: 'https://i.pravatar.cc/150?u=a7', role: 'studio' },
  { id: 'a8', fullName: 'Vela', displayName: 'Vela', avatarUrl: 'https://i.pravatar.cc/150?u=a8', role: 'studio' },
];

function initAdmin() {
  if (admin.apps.length > 0) {
    return;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp();
    return;
  }

  if (!existsSync(LOCAL_SERVICE_ACCOUNT)) {
    throw new Error(
      'No admin credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or add serviceAccountKey.json at project root.'
    );
  }

  const serviceAccount = JSON.parse(readFileSync(LOCAL_SERVICE_ACCOUNT, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

async function seedDatabase() {
  initAdmin();

  const db = admin.firestore();
  const projectId = String(admin.app().options.projectId || '');
  const allowProdLikeSeed = String(process.env.ALLOW_SEED_PROD_LIKE || '').toLowerCase() === 'true';

  if (!allowProdLikeSeed && (projectId === 'shoouts-6178f' || projectId.includes('prod'))) {
    throw new Error(`Refusing to seed production-like project: ${projectId}`);
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();

  for (const track of TRACKS) {
    const docRef = db.collection('tracks').doc(track.id);
    batch.set(docRef, { ...track, createdAt: now, updatedAt: now }, { merge: true });
  }

  for (const playlist of PLAYLISTS) {
    const docRef = db.collection('playlists').doc(playlist.id);
    batch.set(docRef, { ...playlist, createdAt: now, updatedAt: now }, { merge: true });
  }

  for (const artist of ARTISTS) {
    const docRef = db.collection('users').doc(artist.id);
    batch.set(docRef, { ...artist, createdAt: now, updatedAt: now }, { merge: true });
  }

  await batch.commit();

  console.log('Media seed completed successfully.');
  console.log(`Tracks: ${TRACKS.length}`);
  console.log(`Playlists: ${PLAYLISTS.length}`);
  console.log(`Artists: ${ARTISTS.length}`);
}

seedDatabase().catch((err) => {
  console.error('Media seed failed:', err.message || err);
  process.exit(1);
});
