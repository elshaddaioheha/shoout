/**
 * Full Seed Script — Shoouts App
 * Seeds: Artists, Tracks (with genre/price), Merch items, Beats
 * Usage: npx ts-node scripts/seedFullData.ts
 */
import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envData = fs.readFileSync(envPath, 'utf-8');
const envVars = Object.fromEntries(
    envData.split('\n').filter(line => line && !line.startsWith('#')).map(line => {
        const [key, ...rest] = line.split('=');
        return [key.trim(), rest.join('=').trim()];
    })
);

const firebaseConfig = {
    apiKey: envVars.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: envVars.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: envVars.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: envVars.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: envVars.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: envVars.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function authUser(email: string, password: string = '12345678') {
    try {
        return await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
            return await createUserWithEmailAndPassword(auth, email, password);
        }
        throw e;
    }
}

// ─── Artists ────────────────────────────────────────
const ARTISTS = [
    {
        email: 'burnaboy@seed.shoouts.com',
        profile: {
            fullName: 'Burna Boy',
            role: 'hybrid',
            bio: 'Afrobeats legend. Odogwu himself.',
            genre: 'Afrobeats',
            followers: 4210,
            following: 302,
            playlists: 8,
            verified: true,
        },
        tracks: [
            { id: 'bb_t1', title: 'With You', genre: 'Afrobeats', price: 0, listenCount: 980, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
            { id: 'bb_t2', title: 'Paradise', genre: 'Afrobeats', price: 3000, listenCount: 1540, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
            { id: 'bb_t3', title: 'Last Last', genre: 'Afrobeats', price: 5000, listenCount: 3200, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
        ],
        beats: [
            { id: 'bb_b1', title: 'Afro Heat Riddim', genre: 'Afrobeats', price: 8000, bpm: 102, listenCount: 420, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
        ],
        merch: [
            { id: 'bb_m1', name: 'Odogwu Signature Tee', price: '12500', category: 'Apparel', stock: 40, sales: 156, status: 'In Stock', active: true, artistName: 'Burna Boy', rating: 4.8 },
            { id: 'bb_m2', title: 'African Giant Vinyl', name: 'African Giant Vinyl — Gold', price: '35000', category: 'Physical Music', stock: 5, sales: 42, status: 'Low Stock', active: true, artistName: 'Burna Boy', rating: 4.9 },
        ],
    },
    {
        email: 'tems@seed.shoouts.com',
        profile: {
            fullName: 'Tems',
            role: 'studio',
            bio: 'The voice of a generation. Afro-soul creator.',
            genre: 'Afro Soul',
            followers: 3800,
            following: 210,
            playlists: 5,
            verified: true,
        },
        tracks: [
            { id: 'tems_t1', title: 'Essences', genre: 'Afro Soul', price: 0, listenCount: 2100, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
            { id: 'tems_t2', title: 'Free Mind', genre: 'Afro Soul', price: 2700, listenCount: 1850, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
            { id: 'tems_t3', title: 'Higher', genre: 'Gospel', price: 0, listenCount: 900, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
        ],
        beats: [],
        merch: [
            { id: 'tems_m1', name: 'Tems Signature Hoodie', price: '18500', category: 'Apparel', stock: 25, sales: 88, status: 'In Stock', active: true, artistName: 'Tems', rating: 4.7 },
        ],
    },
    {
        email: 'soundofsalem@seed.shoouts.com',
        profile: {
            fullName: 'Sound of Salem',
            role: 'studio',
            bio: 'Producer. Beatmaker. Afro-Gospel pioneer.',
            genre: 'Gospel',
            followers: 1200,
            following: 90,
            playlists: 12,
            verified: false,
        },
        tracks: [
            { id: 'sos_t1', title: 'Gospel Fire', genre: 'Gospel', price: 0, listenCount: 740, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
        ],
        beats: [
            { id: 'sos_b1', title: 'Afro Beats Kit Vol.1', genre: 'Afrobeats', price: 3000, bpm: 98, listenCount: 512, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
            { id: 'sos_b2', title: 'Sonic Beats', genre: 'Afro-Pop', price: 3000, bpm: 110, listenCount: 320, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
            { id: 'sos_b3', title: 'DA Beats', genre: 'Hip-Hop', price: 3000, bpm: 88, listenCount: 275, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3' },
            { id: 'sos_b4', title: 'Project B', genre: 'Highlife', price: 3000, bpm: 95, listenCount: 198, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3' },
        ],
        merch: [
            { id: 'sos_m1', name: 'Shoouts Studio Drum Kit Vol.2', price: '49900', category: 'Digital Tools', stock: 999, sales: 89, status: 'In Stock', active: true, artistName: 'Sound of Salem', rating: 4.6 },
            { id: 'sos_m2', name: 'Shoouts Official Hoodie', price: '27000', category: 'Apparel', stock: 0, sales: 230, status: 'Out of Stock', active: true, artistName: 'Shoouts Official', rating: 4.5 },
        ],
    },
    {
        email: 'lawrenceoyor@seed.shoouts.com',
        profile: {
            fullName: 'Lawrence Oyor',
            role: 'studio',
            bio: 'Afro-Gospel minister. Worship leader.',
            genre: 'Gospel',
            followers: 920,
            following: 55,
            playlists: 3,
            verified: false,
        },
        tracks: [
            { id: 'lo_t1', title: 'Worship Medley', genre: 'Gospel', price: 0, listenCount: 650, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3' },
            { id: 'lo_t2', title: 'Hallelujah Riddim', genre: 'Gospel', price: 1500, listenCount: 430, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3' },
        ],
        beats: [],
        merch: [
            { id: 'lo_m1', name: 'Afro-Gospel Cap', price: '8000', category: 'Accessory', stock: 60, sales: 44, status: 'In Stock', active: true, artistName: 'Lawrence Oyor', rating: 4.4 },
        ],
    },
];

// ─── Seed Logic ─────────────────────────────────────
async function seedArtist(artist: typeof ARTISTS[0]) {
    const cred = await authUser(artist.email);
    const uid = cred.user.uid;
    console.log(`\n🎤 ${artist.profile.fullName} (${uid})`);

    await setDoc(doc(db, 'users', uid), {
        ...artist.profile,
        uid,
        email: artist.email,
        createdAt: new Date().toISOString(),
    }, { merge: true });

    for (const track of artist.tracks) {
        const trackData = { ...track, uploaderId: uid, uploaderName: artist.profile.fullName, createdAt: new Date().toISOString() };
        await setDoc(doc(db, `users/${uid}/uploads`, track.id), trackData, { merge: true });
        console.log(`  ✅ Track: ${track.title}`);
    }

    for (const beat of artist.beats) {
        const beatData = { ...beat, uploaderId: uid, uploaderName: artist.profile.fullName, isbeat: true, createdAt: new Date().toISOString() };
        await setDoc(doc(db, `users/${uid}/uploads`, beat.id), beatData, { merge: true });
        console.log(`  🥁 Beat: ${beat.title}`);
    }

    for (const item of artist.merch) {
        const merchData = { ...item, uploaderId: uid, createdAt: new Date().toISOString() };
        await setDoc(doc(db, `users/${uid}/merch`, item.id), merchData, { merge: true });
        // Also write to top-level merch collection for buyer-side browsing
        await setDoc(doc(db, 'merch', item.id), merchData, { merge: true });
        console.log(`  👕 Merch: ${item.name}`);
    }
}

async function main() {
    console.log('🌱 Starting full seed...');
    for (const artist of ARTISTS) {
        await seedArtist(artist);
    }
    console.log('\n✅ All data seeded successfully!');
    process.exit(0);
}

main().catch((e) => { console.error('❌ Seed error:', e); process.exit(1); });
