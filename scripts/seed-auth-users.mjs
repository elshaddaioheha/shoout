/**
 * Client SDK seeder — Firestore rules usually block role/subscription writes.
 * Prefer: npm run dev:seed:auth-admin with GOOGLE_APPLICATION_CREDENTIALS set.
 */
import { initializeApp, getApps } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getFirestore, setDoc, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
    const envPath = resolve(process.cwd(), '.env');
    const content = readFileSync(envPath, 'utf-8');
    const entries = content
        .split('\n')
        .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
        .map((line) => {
            const [key, ...rest] = line.split('=');
            return [key.trim(), rest.join('=').trim()];
        });
    return Object.fromEntries(entries);
}

function getFirebaseConfig(env) {
    return {
        apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
    };
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
    let cred;
    try {
        cred = await signInWithEmailAndPassword(auth, user.email, password);
    } catch (err) {
        cred = await createUserWithEmailAndPassword(auth, user.email, password);
    }

    const uid = cred.user.uid;
    const now = Timestamp.now();
    const subscriptionExpiresAt = Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

    await setDoc(
        doc(db, 'users', uid),
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

    await setDoc(
        doc(db, `users/${uid}/subscription`, 'current'),
        {
            tier: user.subscriptionTier,
            status: 'active',
            isSubscribed: true,
            billingCycle: 'manual_admin',
            provider: 'client_seed',
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
    const config = getFirebaseConfig(env);

    if (!config.projectId) {
        throw new Error('EXPO_PUBLIC_FIREBASE_PROJECT_ID is required in .env');
    }
    if (config.projectId === 'shoouts-6178f' || config.projectId.includes('prod')) {
        throw new Error(`Refusing to seed production-like project: ${config.projectId}`);
    }

    const app = getApps().length ? getApps()[0] : initializeApp(config);
    const db = getFirestore(app);
    const auth = getAuth(app);

    const seeded = [];
    for (const user of USERS) {
        const info = await ensureUser(auth, db, user);
        seeded.push(info);
    }

    console.log('\nSeeded users (password 12345678):');
    for (const user of seeded) {
        console.log(`- ${user.email} (uid ${user.uid})`);
    }
}

main().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
