/**
 * Shoouts – Firestore Seeder v2 (single-user scope)
 * ────────────────────────────────────────────────────
 * Signs in as the test account and writes all seed tracks under
 * the test user's own uploads/ subcollection with varied metadata
 * to simulate a real marketplace. This respects Firestore security rules.
 *
 * USAGE:
 *   node scripts/seed.mjs
 *
 * TEST LOGIN:
 *   Email:    test@shoouts.dev
 *   Password: Shoouts2025!
 *   Role:     hybrid_creator  (vault + studio access)
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const envRaw = readFileSync(resolve(__dir, '../.env'), 'utf-8');
const env = Object.fromEntries(
    envRaw.split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const PROJECT = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = env.EXPO_PUBLIC_FIREBASE_API_KEY;
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

if (!PROJECT) {
    throw new Error('EXPO_PUBLIC_FIREBASE_PROJECT_ID is required');
}
if (PROJECT === 'shoouts-6178f' || PROJECT.includes('prod')) {
    throw new Error(`Refusing to seed production-like project: ${PROJECT}`);
}

const TEST_EMAIL = 'test@shoouts.dev';
const TEST_PASSWORD = 'Shoouts2025!';
const TEST_NAME = 'Shoouts Tester';

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function signIn(email, password) {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    return r.json();
}

// ─── Firestore REST helpers ───────────────────────────────────────────────────
function val(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'string') return { stringValue: v };
    if (v?._ts) return { timestampValue: v._ts };
    if (typeof v === 'object') return { mapValue: { fields: fields(v) } };
    return { stringValue: String(v) };
}

function fields(obj) {
    return Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [k, val(v)])
    );
}

function ts(daysAgo = 0) {
    return { _ts: new Date(Date.now() - daysAgo * 864e5).toISOString() };
}

async function upsert(path, data, token) {
    const res = await fetch(`${FS_BASE}/${path}?key=${API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fields: fields(data) }),
    });
    if (!res.ok) throw new Error(`PATCH ${path}:\n${await res.text()}`);
    return res.json();
}

async function push(collPath, data, token) {
    const res = await fetch(`${FS_BASE}/${collPath}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fields: fields(data) }),
    });
    if (!res.ok) throw new Error(`POST ${collPath}:\n${await res.text()}`);
    const doc = await res.json();
    return doc.name.split('/').pop();
}

const L = (e, m) => console.log(`  ${e}  ${m}`);

// ─── Seed tracks (all written under the test user's uid) ─────────────────────
// uploaderName varies to simulate a diverse marketplace
const TRACKS = [
    {
        uploaderName: 'Fatima Al-Rashid',
        title: 'Afrobeats Riddim Vol.1', genre: 'Afrobeats', bpm: 102, price: 29.99,
        description: 'Hard-hitting afrobeats riddim with 808s and live percussion. Full stems included.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        isPublic: true, category: 'Beat', listenCount: 142, daysAgo: 12
    },

    {
        uploaderName: 'Sound of Salem',
        title: 'Amapiano Summer Groove', genre: 'Amapiano', bpm: 110, price: 49.99,
        description: 'Smooth log drum-driven amapiano groove. Ready for vocals.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        isPublic: true, category: 'Beat', listenCount: 312, daysAgo: 8
    },

    {
        uploaderName: 'Sound of Salem',
        title: 'Highlife Throwback', genre: 'Highlife', bpm: 96, price: 19.99,
        description: 'Classic highlife guitar pattern with modern production.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        isPublic: true, category: 'Beat', listenCount: 89, daysAgo: 5
    },

    {
        uploaderName: 'Fatima Al-Rashid',
        title: 'Drill Lagos (Vocal Tag Free)', genre: 'Drill', bpm: 144, price: 34.99,
        description: 'UK Drill meets Lagos street. Rolling bass, dark keys.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        isPublic: true, category: 'Beat', listenCount: 254, daysAgo: 3
    },

    {
        uploaderName: 'Lagos Beats HQ',
        title: 'Afro Soul Ballad Pack', genre: 'Afrobeat', bpm: 78, price: 79.99,
        description: 'Premium sample pack — 12 soul chop loops, 8 drum loops.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
        isPublic: true, category: 'Sample', listenCount: 701, daysAgo: 1
    },

    // Tester's own private vault upload
    {
        uploaderName: TEST_NAME,
        title: 'My Unreleased Demo', genre: 'R&B', bpm: 88, price: 0,
        description: 'Work in progress — private.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
        isPublic: false, category: 'Beat', listenCount: 0, daysAgo: 2
    },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🌱  Shoouts Seeder v2\n');

    // Sign in as the test account (already created in previous run)
    console.log(`🔑  Signing in as ${TEST_EMAIL}...`);
    const auth = await signIn(TEST_EMAIL, TEST_PASSWORD);
    if (!auth.idToken) {
        console.error('❌  Sign-in failed:', JSON.stringify(auth.error || auth));
        process.exit(1);
    }
    const { idToken: token, localId: uid } = auth;
    L('✓', `UID: ${uid}`);

    // Update profile to hybrid_creator
    console.log('\n👤  Updating tester profile...');
    await upsert(`users/${uid}`, {
        uid, displayName: TEST_NAME, email: TEST_EMAIL,
        role: 'hybrid_creator', isPremium: true, createdAt: ts(14),
    }, token);
    L('✓', 'Profile set to hybrid_creator');

    // Seed tracks (all under the test user's uid)
    console.log('\n🎵  Seeding tracks...');
    const seeded = [];
    for (const t of TRACKS) {
        const { daysAgo, ...trackData } = t;
        const id = await push(`users/${uid}/uploads`, {
            ...trackData,
            userId: uid,
            fileName: `${t.title.replace(/\s+/g, '_')}.mp3`,
            createdAt: ts(daysAgo),
            updatedAt: ts(),
        }, token);
        seeded.push({ ...t, docId: id, userId: uid });
        L(t.isPublic ? '🌐' : '🔒', `${t.title}  $${t.price}  [${id.slice(-6)}]`);
    }

    // Seed 2 purchases (tester "bought" the first 2 tracks from marketplace)
    console.log('\n🛒  Seeding purchases...');
    const public1 = seeded.find(t => t.isPublic);
    const public2 = seeded.filter(t => t.isPublic)[1];
    for (const t of [public1, public2]) {
        await push(`users/${uid}/purchases`, {
            trackId: t.docId, title: t.title,
            artist: t.uploaderName, price: t.price,
            uploaderId: t.userId, purchasedAt: ts(5),
            audioUrl: t.audioUrl, coverUrl: '',
        }, token);
        await push('transactions', {
            trackId: t.docId, buyerId: uid, sellerId: t.userId,
            amount: t.price, trackTitle: t.title,
            timestamp: ts(5), status: 'completed',
            paymentProvider: 'flutterwave',
        }, token);
        L('✓', `Purchased "${t.title}" ($${t.price})`);
    }

    // Seed notifications
    console.log('\n🔔  Seeding notifications...');
    const notifs = [
        { type: 'system', message: 'Welcome to Shoouts! Your hybrid vault is ready.', isRead: true, createdAt: ts(7) },
        { type: 'purchase', message: `Someone purchased "${public1.title}"`, isRead: false, createdAt: ts(2) },
        { type: 'new_track', message: 'Sound of Salem dropped "Amapiano Summer Groove"', isRead: false, createdAt: ts(1) },
        { type: 'system', message: 'Your Flutterwave payout of ₦18,500 is processing.', isRead: false, createdAt: ts(0) },
    ];
    for (const n of notifs) {
        await push(`users/${uid}/notifications`, n, token);
        L('✓', n.message.substring(0, 60));
    }

    // ─── Summary ──────────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅  Seed complete!\n');
    console.log('🔐  TEST LOGIN:');
    console.log(`    Email:    ${TEST_EMAIL}`);
    console.log(`    Password: ${TEST_PASSWORD}`);
    console.log(`    Role:     hybrid_creator\n`);
    console.log('📦  DATA:');
    console.log(`    🎵  ${seeded.filter(t => t.isPublic).length} public marketplace tracks`);
    console.log(`    🔒  1 private vault track`);
    console.log(`    🛒  2 purchases in library`);
    console.log(`    💳  2 transactions`);
    console.log(`    🔔  4 notifications (3 unread)\n`);
    console.log('🧪  MVP TEST CHECKLIST:');
    console.log('    [ ] 1. Login with credentials above');
    console.log('    [ ] 2. Marketplace tab — 5 tracks visible');
    console.log('    [ ] 3. Tap track → preview plays in MiniPlayer');
    console.log('    [ ] 4. Open FullPlayer — seek, skip, repeat work');
    console.log('    [ ] 5. Listing → Add to Cart → Checkout flow');
    console.log('    [ ] 6. Library tab → 2 purchases + 1 private upload');
    console.log('    [ ] 7. Bell icon → 4 notifications (3 unread badge)');
    console.log('    [ ] 8. Header pill → App Switcher → Vault ↔ Studio');
    console.log('    [ ] 9. Studio mode → Upload screen → publish track');
    console.log('    [ ] 10. More tab → Subscription → Flutterwave checkout\n');

    process.exit(0);
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
