/**
 * Script to look up a Firebase user by email and check their Firestore subscription.
 * Usage: node scripts/check-user.mjs
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try to load service account key
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

async function main() {
  console.log(`\n🔍 Looking up user: ${EMAIL}\n`);

  // 1. Find user by email
  const userRecord = await auth.getUserByEmail(EMAIL).catch(err => {
    console.error(`❌ User not found: ${err.message}`);
    process.exit(1);
  });

  console.log('✅ Firebase Auth User Found:');
  console.log(`   UID:           ${userRecord.uid}`);
  console.log(`   Display Name:  ${userRecord.displayName || '(none)'}`);
  console.log(`   Email:         ${userRecord.email}`);
  console.log(`   Email Verified:${userRecord.emailVerified}`);
  console.log(`   Created:       ${new Date(userRecord.metadata.creationTime).toLocaleString()}`);
  console.log(`   Last Sign-In:  ${new Date(userRecord.metadata.lastSignInTime).toLocaleString()}`);

  const uid = userRecord.uid;

  // 2. Fetch Firestore user document
  const userDocSnap = await db.doc(`users/${uid}`).get();
  if (userDocSnap.exists) {
    const userData = userDocSnap.data();
    console.log('\n📄 Firestore User Document:');
    console.log(`   Name:   ${userData.fullName || userData.name || '(none)'}`);
    console.log(`   Role:   ${userData.role || '(not set)'}`);
    console.log(`   Email:  ${userData.email || '(none)'}`);
  } else {
    console.log('\n⚠️  No Firestore user document found at users/' + uid);
  }

  // 3. Fetch subscription document
  const subSnap = await db.doc(`users/${uid}/subscription/current`).get();
  if (subSnap.exists) {
    const sub = subSnap.data();
    console.log('\n💳 Subscription (users/' + uid + '/subscription/current):');
    console.log(`   Tier:         ${sub.tier}`);
    console.log(`   IsSubscribed: ${sub.isSubscribed}`);
    console.log(`   Status:       ${sub.status || '(not set)'}`);
    console.log(`   ExpiresAt:    ${sub.expiresAt ? new Date(sub.expiresAt._seconds * 1000).toLocaleString() : 'null'}`);
    console.log(`   UpdatedAt:    ${sub.updatedAt || '(not set)'}`);
    console.log('\n   Full document:', JSON.stringify(sub, null, 2));
  } else {
    console.log('\n❌ No subscription document found at users/' + uid + '/subscription/current');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
