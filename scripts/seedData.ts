import * as admin from 'firebase-admin';

// Check if already initialized to avoid duplication
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "shoouts-6178f" // Safe for local emulation
    });
}

const db = admin.firestore();

// Connect to local emulator if necessary. For now, running straight to prod/emulator depending on FIRESTORE_EMULATOR_HOST.
async function seedData() {
    console.log("Seeding data...");

    const usersRef = db.collection('users');

    const seedUsers = [
        {
            uid: "artist_1",
            email: "burnaboy@test.shoouts.com",
            displayName: "Burna Boy (Mock)",
            role: "hybrid_executive",
            bio: "Odogwu himself.",
            createdAt: new Date().toISOString(),
            listeners: 15400,
            earnings: 5400000 // In Kobo or NGN
        },
        {
            uid: "artist_2",
            email: "tems@test.shoouts.com",
            displayName: "Tems (Mock)",
            role: "studio_pro",
            bio: "Leading the vibe.",
            createdAt: new Date().toISOString(),
            listeners: 12000,
            earnings: 4500000
        },
        {
            uid: "fan_1",
            email: "fan@test.shoouts.com",
            displayName: "Super Fan",
            role: "vault_free",
            bio: "Just here for the music.",
            createdAt: new Date().toISOString(),
            listeners: 0,
            earnings: 0
        }
    ];

    for (const user of seedUsers) {
        await usersRef.doc(user.uid).set(user, { merge: true });
        console.log(`User seeded: ${user.uid}`);
    }

    console.log("Database seeded successfully!");
}

seedData().catch(console.error);
