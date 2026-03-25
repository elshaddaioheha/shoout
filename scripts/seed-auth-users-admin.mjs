/**
 * Seeds test Auth users + Firestore role/subscription docs using the Admin SDK
 * (bypasses client Firestore rules).
 *
 * Prerequisites:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path with
 *     Firebase Auth + Cloud Datastore / Firestore access for the target project.
 *   Run from repo root (shoout/):
 *     npm run dev:seed:auth-admin
 */
import admin from 'firebase-admin';

const USERS = [
    {
        email: 'tems@test.shoouts.com',
        displayName: 'Tems (Mock)',
        role: 'studio',
        subscriptionTier: 'studio',
    },
    {
        email: 'burnaboy@test.shoouts.com',
        displayName: 'Burna Boy (Mock)',
        role: 'hybrid',
        subscriptionTier: 'hybrid',
    },
];

async function ensureUser(auth, db, user) {
    const password = '12345678';
    let userRecord;

    try {
        userRecord = await auth.getUserByEmail(user.email);
    } catch (err) {
        if (err.code !== 'auth/user-not-found') throw err;
        userRecord = await auth.createUser({
            email: user.email,
            password,
            displayName: user.displayName,
        });
    }

    const uid = userRecord.uid;
    const now = admin.firestore.Timestamp.now();

    await db.doc(`users/${uid}`).set(
        {
            uid,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            isPremium: true,
            canSell: true,
            createdAt: now,
            updatedAt: now,
        },
        { merge: true }
    );

    await db.doc(`users/${uid}/subscription/current`).set(
        {
            tier: user.subscriptionTier,
            status: 'active',
            isSubscribed: true,
            updatedAt: now,
        },
        { merge: true }
    );

    return { email: user.email, password, uid };
}

async function main() {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error(
            'Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account JSON path.'
        );
    }

    if (admin.apps.length === 0) {
        admin.initializeApp();
    }

    const projectId = admin.app().options.projectId;
    if (!projectId) {
        throw new Error('Could not read projectId from Firebase Admin app.');
    }
    if (projectId === 'shoouts-6178f' || String(projectId).includes('prod')) {
        throw new Error(`Refusing to seed production-like project: ${projectId}`);
    }

    const auth = admin.auth();
    const db = admin.firestore();

    const seeded = [];
    for (const user of USERS) {
        const info = await ensureUser(auth, db, user);
        seeded.push(info);
    }

    console.log('\nSeeded users (password 12345678):');
    for (const u of seeded) {
        console.log(`- ${u.email} (uid ${u.uid})`);
    }
}

main().catch((err) => {
    console.error('Seed failed:', err.message || err);
    process.exit(1);
});
