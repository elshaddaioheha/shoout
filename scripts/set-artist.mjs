/**
 * Script to upgrade a user to Studio (artist) tier in Firebase.
 * Usage: node scripts/set-artist.mjs
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const serviceAccountPath = resolve(__dirname, '../serviceAccountKey.json');
let app;

if (existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  app = getApps().length === 0
    ? initializeApp({ credential: cert(serviceAccount) })
    : getApps()[0];
} else {
  console.error('❌ serviceAccountKey.json not found at project root.');
  console.log('   Download it from Firebase Console → Project Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

const auth = getAuth(app);
const db = getFirestore(app);

const EMAIL = 'elshaddaioheha@outlook.com';
const NEW_TIER = 'studio'; // vault | vault_pro | studio | hybrid

async function main() {
  console.log(`\n🎨 Setting user ${EMAIL} to "${NEW_TIER}" tier...\n`);

  const userRecord = await auth.getUserByEmail(EMAIL).catch(err => {
    console.error(`❌ User not found: ${err.message}`);
    process.exit(1);
  });

  const uid = userRecord.uid;
  console.log(`✅ Found user UID: ${uid}`);

  // Update subscription document
  const subRef = db.doc(`users/${uid}/subscription/current`);
  const oneYearFromNow = Timestamp.fromMillis(Date.now() + 365 * 24 * 60 * 60 * 1000);

  await subRef.set({
    tier: NEW_TIER,
    isSubscribed: true,
    status: 'active',
    billingCycle: 'manual_admin',
    expiresAt: oneYearFromNow,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  // Also update role on the user document
  await db.doc(`users/${uid}`).set({ role: NEW_TIER }, { merge: true });

  console.log(`\n✅ Done! User is now on the "${NEW_TIER}" plan.`);
  console.log(`   Subscription expires: ${new Date(oneYearFromNow.toMillis()).toLocaleString()}`);
  console.log('\n   The user must re-open the app for changes to take effect.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
