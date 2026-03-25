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
    measurementId: envVars.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function authAndSeed(userMock: any, tracks: any[]) {
    let cred;
    try {
        cred = await signInWithEmailAndPassword(auth, userMock.email, "12345678");
    } catch (e: any) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
            cred = await createUserWithEmailAndPassword(auth, userMock.email, "12345678");
        } else {
            console.log("Auth error:", e.code);
            return;
        }
    }

    const uid = cred!.user.uid;
    console.log(`Authenticated as ${userMock.fullName} (${uid})`);

    // Override UID to actual Auth UID for valid rules
    userMock.uid = uid;

    // Seed Profile
    await setDoc(doc(db, 'users', uid), userMock, { merge: true });

    // Seed Tracks
    for (const track of tracks) {
        await setDoc(doc(db, `users/${uid}/uploads`, track.id), track, { merge: true });
        console.log(`Seeded track ${track.title} for ${userMock.fullName}`);
    }
}

async function seedData() {
    console.log("Seeding data using Authenticated Client SDK...");

    const burnaboy = {
        email: "burnaboy@test.shoouts.com",
        fullName: "Burna Boy (Mock)",
        role: "hybrid",
        bio: "Odogwu himself.",
        createdAt: new Date().toISOString()
    };
    const burnaTracks = [
        { id: "track_1", title: "With You", price: 0, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
        { id: "track_2", title: "Paradise", price: 3000, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" }
    ];

    const tems = {
        email: "tems@test.shoouts.com",
        fullName: "Tems (Mock)",
        role: "studio",
        bio: "Leading the vibe.",
        createdAt: new Date().toISOString()
    };
    const temsTracks = [
        { id: "track_3", title: "Essences", price: 0, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
        { id: "track_4", title: "Lost in Love", price: 3000, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" }
    ];

    await authAndSeed(burnaboy, burnaTracks);
    await authAndSeed(tems, temsTracks);

    console.log("Database seeded successfully with valid Auth rules!");
    process.exit(0);
}

seedData().catch(console.error);
