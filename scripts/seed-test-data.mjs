/**
 * Shoouts – Firestore Test Data Seeder
 * ─────────────────────────────────────
 * Seeds: fake users, vault uploads, marketplace listings,
 *        purchases, and transactions so all MVP flows can be tested live.
 *
 * Run:  node scripts/seed-test-data.mjs
 *
 * Requires:  npm install firebase   (already installed in the project)
 * Uses the CLIENT sdk (no service account needed — runs as anonymous).
 */

import { getApps, initializeApp } from 'firebase/app';
import {
    addDoc,
    collection,
    doc,
    getFirestore,
    setDoc,
    Timestamp
} from 'firebase/firestore';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// ─── Load .env manually (Expo's EXPO_PUBLIC_ vars) ───────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
    envContent
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => l.trim().split('=').map(s => s.trim()))
);

const firebaseConfig = {
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
    throw new Error('EXPO_PUBLIC_FIREBASE_PROJECT_ID is required');
}
if (firebaseConfig.projectId === 'shoouts-6178f' || firebaseConfig.projectId.includes('prod')) {
    throw new Error(`Refusing to seed production-like project: ${firebaseConfig.projectId}`);
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// ─── Test Users (representative of each tier) ─────────────────────────────────
const TEST_USERS = [
    { uid: 'seed_vault_free_001', name: 'Kofi Mensah', role: 'vault', email: 'kofi@shoouts.test' },
    { uid: 'seed_vault_pro_001', name: 'Ama Owusu', role: 'vault_pro', email: 'ama@shoouts.test' },
    { uid: 'seed_studio_free_001', name: 'Dele Okafor', role: 'vault', email: 'dele@shoouts.test' },
    { uid: 'seed_studio_pro_001', name: 'Fatima Al-Rashid', role: 'studio', email: 'fatima@shoouts.test' },
    { uid: 'seed_hybrid_creator_001', name: 'Sound of Salem', role: 'hybrid', email: 'salem@shoouts.test' },
    { uid: 'seed_hybrid_exec_001', name: 'Lagos Beats HQ', role: 'hybrid', email: 'lbhq@shoouts.test' },
];

// ─── Seed Uploads (Vault + Marketplace) ──────────────────────────────────────
// Real publicly-accessible audio URLs from Free Music Archive
const TRACK_SEEDS = [
    {
        userId: 'seed_studio_pro_001',
        title: 'Afrobeats Riddim Vol.1',
        genre: 'Afrobeats',
        bpm: 102,
        price: 29.99,
        description: 'Hard-hitting afrobeats riddim with 808s and live percussion. Full stems included.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        isPublic: true,
        category: 'Beat',
        listenCount: 142,
    },
    {
        userId: 'seed_hybrid_creator_001',
        title: 'Amapiano Summer Groove',
        genre: 'Amapiano',
        bpm: 110,
        price: 49.99,
        description: 'Smooth log drum-driven amapiano groove. Ready for vocals.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        isPublic: true,
        category: 'Beat',
        listenCount: 312,
    },
    {
        userId: 'seed_hybrid_creator_001',
        title: 'Highlife Throwback',
        genre: 'Highlife',
        bpm: 96,
        price: 19.99,
        description: 'Classic highlife guitar pattern with modern production.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        isPublic: true,
        category: 'Beat',
        listenCount: 89,
    },
    {
        userId: 'seed_studio_pro_001',
        title: 'Drill Lagos (Vocal Tag Free)',
        genre: 'Drill',
        bpm: 144,
        price: 34.99,
        description: 'UK Drill meets Lagos street. Rolling bass, dark keys.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        isPublic: true,
        category: 'Beat',
        listenCount: 254,
    },
    {
        userId: 'seed_hybrid_exec_001',
        title: 'Afro Soul Ballad Pack',
        genre: 'Afrobeat',
        bpm: 78,
        price: 79.99,
        description: 'Premium sample pack — 12 soul chop loops, 8 drum loops.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
        isPublic: true,
        category: 'Sample',
        listenCount: 701,
    },
    {
        userId: 'seed_vault_pro_001',
        title: 'Private Demo - Don\'t Share',
        genre: 'R&B',
        bpm: 88,
        price: 0,
        description: 'Personal vault upload — unreleased.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
        isPublic: false,
        category: 'Beat',
        listenCount: 0,
    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const now = () => Timestamp.now();
const ago = (days) => Timestamp.fromDate(new Date(Date.now() - days * 864e5));

function log(emoji, msg) {
    console.log(`  ${emoji}  ${msg}`);
}

// ─── Main Seeder ─────────────────────────────────────────────────────────────
async function seed() {
    console.log('\n🌱  Shoouts Firestore Seeder\n');

    // 1. Seed user profile documents
    console.log('👤  Seeding user profiles...');
    for (const user of TEST_USERS) {
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            displayName: user.name,
            email: user.email,
            role: user.role,
            isPremium: user.role !== 'vault',
            createdAt: ago(30),
            photoURL: null,
        }, { merge: true });
        log('✓', `${user.name} (${user.role})`);
    }

    // 2. Seed uploads as subcollections
    console.log('\n🎵  Seeding track uploads...');
    const uploadRefs = [];
    for (const track of TRACK_SEEDS) {
        const user = TEST_USERS.find(u => u.uid === track.userId);
        const ref = await addDoc(
            collection(db, `users/${track.userId}/uploads`),
            {
                ...track,
                uploaderName: user?.name || 'Shoouter',
                fileName: `${track.title.replace(/\s/g, '_')}.mp3`,
                createdAt: ago(Math.floor(Math.random() * 14)),
                updatedAt: now(),
            }
        );
        uploadRefs.push({ ref, track, user });
        log('✓', `${track.title} — $${track.price} [${track.isPublic ? 'PUBLIC' : 'PRIVATE'}]`);
    }

    // 3. Seed purchases: vault user bought 2 tracks
    console.log('\n🛒  Seeding purchases...');
    const buyer = TEST_USERS[0]; // kofi — vault
    const [track1, track2] = uploadRefs.filter(r => r.track.isPublic);

    for (const { ref, track, user } of [track1, track2]) {
        await addDoc(collection(db, `users/${buyer.uid}/purchases`), {
            trackId: ref.id,
            title: track.title,
            artist: user?.name || 'Creator',
            price: track.price,
            uploaderId: track.userId,
            purchasedAt: ago(3),
            audioUrl: track.audioUrl,
            coverUrl: '',
        });
        log('✓', `${buyer.name} purchased "${track.title}"`);
    }

    // 4. Seed transactions
    console.log('\n💳  Seeding transactions...');
    for (const { ref, track } of [track1, track2]) {
        await addDoc(collection(db, 'transactions'), {
            trackId: ref.id,
            buyerId: buyer.uid,
            sellerId: track.userId,
            amount: track.price,
            trackTitle: track.title,
            timestamp: ago(3),
            status: 'completed',
            paymentProvider: 'flutterwave',
        });
        log('✓', `Transaction: $${track.price} for "${track.title}"`);
    }

    // 5. Seed notifications
    console.log('\n🔔  Seeding notifications...');
    const notifTypes = [
        { type: 'purchase', message: `${buyer.name} purchased your track "Afrobeats Riddim Vol.1"`, userId: track1.user?.uid },
        { type: 'new_track', message: 'Sound of Salem just dropped a new beat: "Amapiano Summer Groove"', userId: buyer.uid },
        { type: 'system', message: 'Welcome to Shoouts! Your vault is ready.', userId: buyer.uid },
    ];
    for (const notif of notifTypes) {
        await addDoc(collection(db, `users/${notif.userId}/notifications`), {
            ...notif,
            isRead: false,
            createdAt: ago(1),
        });
        log('✓', notif.message.substring(0, 60));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅  Seed complete!\n');
    console.log('📋  Test Accounts Created:');
    console.log('    Buyer  (vault):             uid = seed_vault_free_001');
    console.log('    Seller (studio):            uid = seed_studio_pro_001');
    console.log('    Hybrid:                     uid = seed_hybrid_creator_001\n');
    console.log('📦  Marketplace: 5 public tracks seeded');
    console.log('🔒  Vault:       1 private track seeded');
    console.log('🛒  Purchases:   2 completed transactions\n');
    console.log('Next: Run the app and test each MVP flow stage by stage.');
    process.exit(0);
}

seed().catch(err => {
    console.error('\n❌  Seed failed:', err.message);
    process.exit(1);
});
