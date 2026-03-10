/**
 * Shoouts — Full Data Seed (v3)
 * Seeds: 4 artists, their tracks, beats, and merch.
 * Uses Firestore REST API (no ts-node required).
 * USAGE: node scripts/seedFullData.mjs
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

// ─── REST helpers ──────────────────────────────────────────────────────────────
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
        Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [k, val(v)])
    );
}

async function upsert(path, data, token) {
    const res = await fetch(`${FS_BASE}/${path}?key=${API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fields: fields(data) }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`PATCH ${path} failed: ${text}`);
    }
    return res.json();
}

async function signUp(email, password) {
    // Try sign-in first; if user doesn't exist, sign-up
    let r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    let data = await r.json();
    if (data.idToken) return data;

    // Sign up
    r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    data = await r.json();
    if (!data.idToken) throw new Error(`Auth failed for ${email}: ${JSON.stringify(data)}`);
    return data;
}

const NOW = new Date().toISOString();

const ARTISTS = [
    {
        email: 'burnaboy@seed.shoouts.com', password: 'Seed1234!',
        profile: { fullName: 'Burna Boy', role: 'hybrid_executive', bio: 'Afrobeats legend. Odogwu himself.', genre: 'Afrobeats', followers: 4210, following: 302, playlists: 8, verified: true },
        tracks: [
            { id: 'bb_t1', title: 'With You', genre: 'Afrobeats', price: 0, listenCount: 2980, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', isPublic: true },
            { id: 'bb_t2', title: 'Paradise', genre: 'Afrobeats', price: 3000, listenCount: 1540, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', isPublic: true },
            { id: 'bb_t3', title: 'Last Last', genre: 'Afrobeats', price: 5000, listenCount: 3200, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', isPublic: true },
        ],
        beats: [
            { id: 'bb_b1', title: 'Afro Heat Riddim', genre: 'Afrobeats', price: 8000, bpm: 102, listenCount: 420, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', isbeat: true, isPublic: true },
        ],
        merch: [
            { id: 'bb_m1', name: 'Odogwu Signature Tee', price: '12500', category: 'Apparel', stock: 40, sales: 156, status: 'In Stock', active: true, rating: 4.8 },
            { id: 'bb_m2', name: 'African Giant Vinyl — Gold', price: '35000', category: 'Physical Music', stock: 5, sales: 42, status: 'Low Stock', active: true, rating: 4.9 },
        ],
    },
    {
        email: 'tems@seed.shoouts.com', password: 'Seed1234!',
        profile: { fullName: 'Tems', role: 'studio_pro', bio: 'The voice of a generation. Afro-soul creator.', genre: 'Afro Soul', followers: 3800, following: 210, playlists: 5, verified: true },
        tracks: [
            { id: 'tems_t1', title: 'Essences', genre: 'Afro Soul', price: 0, listenCount: 2100, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', isPublic: true },
            { id: 'tems_t2', title: 'Free Mind', genre: 'Afro Soul', price: 2700, listenCount: 1850, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', isPublic: true },
            { id: 'tems_t3', title: 'Higher', genre: 'Gospel', price: 0, listenCount: 900, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', isPublic: true },
        ],
        beats: [],
        merch: [
            { id: 'tems_m1', name: 'Tems Signature Hoodie', price: '18500', category: 'Apparel', stock: 25, sales: 88, status: 'In Stock', active: true, rating: 4.7 },
        ],
    },
    {
        email: 'soundofsalem@seed.shoouts.com', password: 'Seed1234!',
        profile: { fullName: 'Sound of Salem', role: 'studio_pro', bio: 'Producer. Beatmaker. Afro-Gospel pioneer.', genre: 'Gospel', followers: 1200, following: 90, playlists: 12, verified: false },
        tracks: [
            { id: 'sos_t1', title: 'Gospel Fire', genre: 'Gospel', price: 0, listenCount: 740, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', isPublic: true },
        ],
        beats: [
            { id: 'sos_b1', title: 'Afro Beats Kit Vol.1', genre: 'Afrobeats', price: 3000, bpm: 98, listenCount: 512, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', isbeat: true, isPublic: true },
            { id: 'sos_b2', title: 'Sonic Beats', genre: 'Afro-Pop', price: 3000, bpm: 110, listenCount: 320, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', isbeat: true, isPublic: true },
            { id: 'sos_b3', title: 'DA Beats', genre: 'Hip-Hop', price: 3000, bpm: 88, listenCount: 275, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', isbeat: true, isPublic: true },
            { id: 'sos_b4', title: 'Project B', genre: 'Highlife', price: 3000, bpm: 95, listenCount: 198, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', isbeat: true, isPublic: true },
        ],
        merch: [
            { id: 'sos_m1', name: 'Shoouts Studio Drum Kit Vol.2', price: '49900', category: 'Digital Tools', stock: 999, sales: 89, status: 'In Stock', active: true, rating: 4.6 },
            { id: 'sos_m2', name: 'Shoouts Official Hoodie', price: '27000', category: 'Apparel', stock: 0, sales: 230, status: 'Out of Stock', active: true, rating: 4.5 },
        ],
    },
    {
        email: 'lawrenceoyor@seed.shoouts.com', password: 'Seed1234!',
        profile: { fullName: 'Lawrence Oyor', role: 'studio_pro', bio: 'Afro-Gospel minister. Worship leader.', genre: 'Gospel', followers: 920, following: 55, playlists: 3, verified: false },
        tracks: [
            { id: 'lo_t1', title: 'Worship Medley', genre: 'Gospel', price: 0, listenCount: 650, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', isPublic: true },
            { id: 'lo_t2', title: 'Hallelujah Riddim', genre: 'Gospel', price: 1500, listenCount: 430, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3', isPublic: true },
        ],
        beats: [],
        merch: [
            { id: 'lo_m1', name: 'Afro-Gospel Cap', price: '8000', category: 'Accessory', stock: 60, sales: 44, status: 'In Stock', active: true, rating: 4.4 },
        ],
    },
];

async function seedArtist(artist) {
    console.log(`\n🎤  ${artist.profile.fullName}`);
    const { idToken: token, localId: uid } = await signUp(artist.email, artist.password);
    console.log(`    UID: ${uid}`);

    await upsert(`users/${uid}`, {
        ...artist.profile,
        uid,
        email: artist.email,
        createdAt: NOW,
    }, token);
    console.log(`    ✅  Profile saved`);

    for (const track of [...artist.tracks, ...artist.beats]) {
        await upsert(`users/${uid}/uploads/${track.id}`, {
            ...track,
            uploaderId: uid,
            uploaderName: artist.profile.fullName,
            artist: artist.profile.fullName,
            createdAt: NOW,
        }, token);
        console.log(`    🎵  ${track.title}`);
    }

    for (const item of artist.merch) {
        const data = { ...item, uploaderId: uid, artistName: artist.profile.fullName, createdAt: NOW };
        await upsert(`users/${uid}/merch/${item.id}`, data, token);
        await upsert(`merch/${item.id}`, data, token);
        console.log(`    👕  ${item.name}`);
    }
}

async function main() {
    console.log('\n🌱  Shoouts Full Seed (v3)\n');
    console.log(`   Project: ${PROJECT}`);

    for (const artist of ARTISTS) {
        await seedArtist(artist);
    }

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅  All data seeded successfully!');
    console.log('\n📦  DATA WRITTEN:');
    console.log('    👤  4 artist profiles');
    console.log('    🎵  11 tracks');
    console.log('    🥁  6 beats');
    console.log('    👕  8 merch items (user + global collections)');
    console.log('\n🔑  Artist test logins (password: Seed1234!):');
    for (const a of ARTISTS) console.log(`    ${a.email}`);
    console.log('');
    process.exit(0);
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
