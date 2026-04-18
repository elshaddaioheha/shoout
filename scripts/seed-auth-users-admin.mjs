/**
 * Seeds test Auth users + Firestore role/subscription docs using the Admin SDK
 * (bypasses client Firestore rules).
 *
 * Prerequisites:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path with
 *     Firebase Auth + Cloud Datastore / Firestore access for the target project.
 *   - Or add serviceAccountKey.json at the repo root for local Admin SDK auth.
 *   Run from repo root (shoout/):
 *     npm run dev:seed:auth-admin
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
    const envPath = resolve(process.cwd(), '.env');
    const content = readFileSync(envPath, 'utf8');
    const entries = content
        .split('\n')
        .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
        .map((line) => {
            const [key, ...rest] = line.split('=');
            return [key.trim(), rest.join('=').trim()];
        });

    return Object.fromEntries(entries);
}

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
    {
        email: 'allaccess@seed.shoouts.com',
        displayName: 'All Access Creator',
        role: 'hybrid',
        subscriptionTier: 'hybrid',
        fullAccess: true,
    },
    {
        email: 'e2e-tester@shoouts.com',
        displayName: 'E2E Automation User',
        role: 'hybrid',
        subscriptionTier: 'hybrid',
        fullAccess: true,
    },
];

const FULL_ACCESS_ENTITLEMENTS = {
    canBuy: true,
    canUseCart: true,
    canUseMarketplaceMessaging: true,
    canAccessVaultWorkspace: true,
    canUploadToVault: true,
    canShareVaultLinks: true,
    canEditVaultTracks: true,
    canSell: true,
    canReplyAsSeller: true,
    canUseAnalytics: true,
    canUseAds: true,
    canUseVaultStorage: true,
    canUseTeamAccess: true,
    maxVaultUploads: 1000,
    vaultStorageLimitBytes: 10 * 1024 * 1024 * 1024,
    studioStorageLimitBytes: 2 * 1024 * 1024 * 1024,
};

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

    // Keep seeded credentials deterministic for test automation.
    await auth.updateUser(userRecord.uid, {
        password,
        displayName: user.displayName,
    });

    const uid = userRecord.uid;
    const now = admin.firestore.Timestamp.now();
    const subscriptionExpiresAt = admin.firestore.Timestamp.fromMillis(
        Date.now() + 365 * 24 * 60 * 60 * 1000
    );

    if (user.fullAccess) {
        const existingClaims = userRecord.customClaims || {};
        await auth.setCustomUserClaims(uid, {
            ...existingClaims,
            plan: 'hybrid',
            canBuy: true,
            canUseCart: true,
            canUseMarketplaceMessaging: true,
            canVault: true,
            canStudio: true,
            canSell: true,
            canAds: true,
        });
    }

    await db.doc(`users/${uid}`).set(
        {
            uid,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            actualRole: user.subscriptionTier,
            subscriptionTier: user.subscriptionTier,
            subscriptionStatus: 'active',
            isPremium: true,
            canSell: true,
            canBuy: true,
            canUseCart: true,
            canUseMarketplaceMessaging: true,
            canAccessVaultWorkspace: true,
            canUploadToVault: true,
            canShareVaultLinks: true,
            canEditVaultTracks: true,
            canReplyAsSeller: true,
            canUseAnalytics: true,
            canUseAds: true,
            canUseTeamAccess: true,
            createdAt: now,
            updatedAt: now,
            ...(user.fullAccess
                ? {
                    storageLimitGB: 10,
                    maxVaultUploads: 1000,
                }
                : {}),
        },
        { merge: true }
    );

    await db.doc(`users/${uid}/subscription/current`).set(
        {
            tier: user.subscriptionTier,
            status: 'active',
            isSubscribed: true,
            billingCycle: 'manual_admin',
            provider: 'admin_seed',
            providerTransactionRef: 'seeded-all-access',
            currentPeriodStartAt: now,
            currentPeriodEndAt: subscriptionExpiresAt,
            expiresAt: subscriptionExpiresAt,
            cancelAtPeriodEnd: false,
            version: 1,
            updatedAt: now,
            createdAt: now,
            ...(user.fullAccess
                ? { serviceEntitlements: FULL_ACCESS_ENTITLEMENTS }
                : {}),
        },
        { merge: true }
    );

    return { email: user.email, password, uid };
}

async function main() {
    const env = loadEnv();
    const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

    if (admin.apps.length === 0) {
        const serviceAccountPath = resolve(process.cwd(), 'serviceAccountKey.json');

        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            admin.initializeApp({ projectId });
        } else if (existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId });
        } else {
            admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
        }
    }

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
