import * as admin from 'firebase-admin';

const projectId = process.env.SEED_FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  throw new Error('Missing SEED_FIREBASE_PROJECT_ID (or EXPO_PUBLIC_FIREBASE_PROJECT_ID) for seeding.');
}

if (projectId === 'shoouts-6178f' || projectId.toLowerCase().includes('prod')) {
  throw new Error(`Refusing to seed production-like project: ${projectId}`);
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();

const updates = [
  {
    id: 'launch-updates-tab',
    title: 'Updates tab now live',
    body: 'Stay current on drops, fixes, and releases without leaving the app.',
    tag: 'new',
    icon: 'launch',
    priority: 20,
    publishedAt: admin.firestore.Timestamp.fromDate(new Date('2024-02-20T10:00:00Z')),
  },
  {
    id: 'notify-refresh',
    title: 'Notifications refresh',
    body: 'Cleaner grouping, faster delivery, and quieter noise for busy creators.',
    tag: 'notify',
    icon: 'bell',
    priority: 15,
    publishedAt: admin.firestore.Timestamp.fromDate(new Date('2024-02-18T09:00:00Z')),
  },
  {
    id: 'stability-fixes',
    title: 'Playback stability',
    body: 'Reduced stalls on slow networks and smoother resume across tabs.',
    tag: 'fix',
    icon: 'zap',
    priority: 12,
    publishedAt: admin.firestore.Timestamp.fromDate(new Date('2024-02-15T08:30:00Z')),
  },
  {
    id: 'profile-polish',
    title: 'Profile polish',
    body: 'A refreshed header and stats so fans see your highlights instantly.',
    tag: 'ui',
    icon: 'design',
    priority: 10,
    publishedAt: admin.firestore.Timestamp.fromDate(new Date('2024-02-12T08:00:00Z')),
  },
];

async function seedAppUpdates() {
  console.log(`Seeding appUpdates into project ${projectId}...`);

  const batch = db.batch();
  const colRef = db.collection('appUpdates');

  updates.forEach((update) => {
    const docRef = colRef.doc(update.id);
    batch.set(docRef, {
      title: update.title,
      body: update.body,
      published: true,
      publishedAt: update.publishedAt,
      priority: update.priority,
      tag: update.tag,
      icon: update.icon,
    }, { merge: true });
  });

  await batch.commit();
  console.log(`Seeded ${updates.length} updates.`);
}

seedAppUpdates().catch((err) => {
  console.error(err);
  process.exit(1);
});
