/**
 * Shoouts – Firestore REST Seeder (No Auth Required)
 * ────────────────────────────────────────────────────
 * Uses Firestore REST API directly so it works without an authenticated session.
 * You must temporarily set Firestore rules to allow writes, OR this must be run
 * with a service account. 
 *
 * Workaround used here: we write to Firestore using the REST API with the web
 * API key — this works if rules allow writes from authenticated or unauthenticated
 * clients (we sign in anonymously first).
 *
 * Run:  node scripts/seed-rest.mjs
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
    envContent.split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#') && l.trim())
        .map(l => {
            const idx = l.indexOf('=');
            return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
        })
);

const PROJECT_ID = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

if (!PROJECT_ID) {
    throw new Error('EXPO_PUBLIC_FIREBASE_PROJECT_ID is required');
}
if (PROJECT_ID === 'shoouts-6178f' || PROJECT_ID.includes('prod')) {
    throw new Error(`Refusing to seed production-like project: ${PROJECT_ID}`);
}

// ─── Step 1: Sign in anonymously to get an ID token ──────────────────────────
async function signInAnonymously() {
    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ returnSecureToken: true }),
        }
    );
    const data = await res.json();
    if (!data.idToken) throw new Error('Anonymous sign-in failed: ' + JSON.stringify(data));
    return { idToken: data.idToken, uid: data.localId };
}

// ─── Firestore REST helpers ───────────────────────────────────────────────────
function toValue(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    if (typeof val === 'string') return { stringValue: val };
    if (val && typeof val === 'object' && val._type === 'timestamp') return { timestampValue: val.value };
    if (val && typeof val === 'object') {
        return { mapValue: { fields: toFields(val) } };
    }
    return { stringValue: String(val) };
}

function toFields(obj) {
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, toValue(v)])
    );
}

function ts(daysAgo = 0) {
    const d = new Date(Date.now() - daysAgo * 864e5);
    return { _type: 'timestamp', value: d.toISOString() };
}

async function writeDoc(path, data, token) {
    const url = `${BASE_URL}/${path}?key=${API_KEY}`;
    const res = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fields: toFields(data) }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`PATCH ${path} failed: ${err}`);
    }
    return res.json();
}

async function addDoc(collPath, data, token) {
    const url = `${BASE_URL}/${collPath}?key=${API_KEY}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fields: toFields(data) }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`POST ${collPath} failed: ${err}`);
    }
    return res.json();
}

function log(emoji, msg) { console.log(`  ${emoji}  ${msg}`); }

// ─── Seed Data ────────────────────────────────────────────────────────────────
const USERS = [
    { uid: 'seed_vault_free_001', name: 'Kofi Mensah', role: 'vault_free', email: 'kofi@shoouts.test' },
    { uid: 'seed_vault_pro_001', name: 'Ama Owusu', role: 'vault_pro', email: 'ama@shoouts.test' },
    { uid: 'seed_studio_free_001', name: 'Dele Okafor', role: 'studio_free', email: 'dele@shoouts.test' },
    { uid: 'seed_studio_pro_001', name: 'Fatima Al-Rashid', role: 'studio_pro', email: 'fatima@shoouts.test' },
    { uid: 'seed_hybrid_creator_001', name: 'Sound of Salem', role: 'hybrid_creator', email: 'salem@shoouts.test' },
    { uid: 'seed_hybrid_exec_001', name: 'Lagos Beats HQ', role: 'hybrid_executive', email: 'lbhq@shoouts.test' },
];

const TRACKS = [
    {
        userId: 'seed_studio_pro_001', uploaderName: 'Fatima Al-Rashid',
        title: 'Afrobeats Riddim Vol.1', genre: 'Afrobeats', bpm: 102, price: 29.99,
        description: 'Hard-hitting afrobeats riddim with 808s and live percussion. Full stems included.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        isPublic: true, category: 'Beat', listenCount: 142,
    },
    {
        userId: 'seed_hybrid_creator_001', uploaderName: 'Sound of Salem',
        title: 'Amapiano Summer Groove', genre: 'Amapiano', bpm: 110, price: 49.99,
        description: 'Smooth log drum-driven amapiano groove. Ready for vocals.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        isPublic: true, category: 'Beat', listenCount: 312,
    },
    {
        userId: 'seed_hybrid_creator_001', uploaderName: 'Sound of Salem',
        title: 'Highlife Throwback', genre: 'Highlife', bpm: 96, price: 19.99,
        description: 'Classic highlife guitar pattern with modern production.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        isPublic: true, category: 'Beat', listenCount: 89,
    },
    {
        userId: 'seed_studio_pro_001', uploaderName: 'Fatima Al-Rashid',
        title: 'Drill Lagos (Vocal Tag Free)', genre: 'Drill', bpm: 144, price: 34.99,
        description: 'UK Drill meets Lagos street. Rolling bass, dark keys.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        isPublic: true, category: 'Beat', listenCount: 254,
    },
    {
        userId: 'seed_hybrid_exec_001', uploaderName: 'Lagos Beats HQ',
        title: 'Afro Soul Ballad Pack', genre: 'Afrobeat', bpm: 78, price: 79.99,
        description: 'Premium sample pack — 12 soul chop loops, 8 drum loops.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
        isPublic: true, category: 'Sample', listenCount: 701,
    },
    {
        userId: 'seed_vault_pro_001', uploaderName: 'Ama Owusu',
        title: 'Private Demo – Unreleased', genre: 'R&B', bpm: 88, price: 0,
        description: 'Personal vault upload — unreleased work in progress.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
        isPublic: false, category: 'Beat', listenCount: 0,
    },
];

// ─── Main ────────────────────────────────────────────────────────────────────
async function seed() {
    console.log('\n🌱  Shoouts Firestore REST Seeder\n');

    let token, anonUid;
    try {
        console.log('🔑  Signing in anonymously...');
        ({ idToken: token, uid: anonUid } = await signInAnonymously());
        log('✓', `Anonymous UID: ${anonUid}`);
    } catch (e) {
        console.error('❌  Auth failed:', e.message);
        process.exit(1);
    }

    // 1. User profiles
    console.log('\n👤  Seeding user profiles...');
    for (const u of USERS) {
        await writeDoc(`users/${u.uid}`, {
            uid: u.uid, displayName: u.name, email: u.email,
            role: u.role, isPremium: !u.role.includes('free'),
            createdAt: ts(30), photoURL: null,
        }, token);
        log('✓', `${u.name} (${u.role})`);
    }

    // 2. Track uploads
    console.log('\n🎵  Seeding tracks...');
    const seededTracks = [];
    for (const t of TRACKS) {
        const result = await addDoc(`users/${t.userId}/uploads`, {
            ...t,
            fileName: `${t.title.replace(/\s+/g, '_')}.mp3`,
            createdAt: ts(Math.floor(Math.random() * 14 + 1)),
            updatedAt: ts(),
        }, token);
        const docId = result.name.split('/').pop();
        seededTracks.push({ ...t, docId });
        log('✓', `[${docId.slice(-6)}] ${t.title} — $${t.price} ${t.isPublic ? '🌐' : '🔒'}`);
    }

    // 3. Purchases — vault_free user (Kofi) bought first 2 public tracks
    console.log('\n🛒  Seeding purchases...');
    const buyer = 'seed_vault_free_001';
    const publicTracks = seededTracks.filter(t => t.isPublic).slice(0, 2);
    for (const t of publicTracks) {
        await addDoc(`users/${buyer}/purchases`, {
            trackId: t.docId, title: t.title,
            artist: t.uploaderName, price: t.price,
            uploaderId: t.userId,
            purchasedAt: ts(3),
            audioUrl: t.audioUrl, coverUrl: '',
        }, token);
        log('✓', `Kofi purchased "${t.title}"`);
    }

    // 4. Transactions
    console.log('\n💳  Seeding transactions...');
    for (const t of publicTracks) {
        await addDoc('transactions', {
            trackId: t.docId, buyerId: buyer, sellerId: t.userId,
            amount: t.price, trackTitle: t.title,
            timestamp: ts(3), status: 'completed',
            paymentProvider: 'flutterwave',
        }, token);
        log('✓', `$${t.price} — "${t.title}"`);
    }

    // 5. Notifications
    console.log('\n🔔  Seeding notifications...');
    const notifs = [
        { userId: publicTracks[0].userId, type: 'purchase', message: `Kofi Mensah purchased "${publicTracks[0].title}"`, isRead: false, createdAt: ts(1) },
        { userId: buyer, type: 'new_track', message: 'Sound of Salem dropped "Amapiano Summer Groove"', isRead: false, createdAt: ts(1) },
        { userId: buyer, type: 'system', message: 'Welcome to Shoouts! Your vault is ready.', isRead: true, createdAt: ts(7) },
    ];
    for (const n of notifs) {
        const { userId, ...rest } = n;
        await addDoc(`users/${userId}/notifications`, rest, token);
        log('✓', n.message.substring(0, 55));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅  Seed complete!\n');
    console.log('📋  Test Users (UIDs):');
    USERS.forEach(u => console.log(`    ${u.role.padEnd(22)} → ${u.uid}`));
    console.log(`\n🎵  Tracks seeded:  ${seededTracks.length}  (${seededTracks.filter(t => t.isPublic).length} public, ${seededTracks.filter(t => !t.isPublic).length} private)`);
    console.log(`🛒  Purchases:      ${publicTracks.length}`);
    console.log(`💳  Transactions:   ${publicTracks.length}\n`);

    process.exit(0);
}

seed().catch(err => {
    console.error('\n❌  Seed failed:', err.message);
    process.exit(1);
});
