/**
 * Migration handler — normalizes existing users to the new subscription model.
 *
 * Run once via: firebase functions:call migrateUsersToShooutModel --data '{}'
 * Or invoke via HTTP: POST /migrateUsersToShooutModel (admin auth required)
 *
 * What it does:
 *  - Scans all users
 *  - For each user, reads users/{uid}/subscription/current
 *  - Normalizes tier: studio_free → shoout, missing doc → creates shoout default
 *  - Backfills serviceEntitlements from catalog
 *  - Backfills version field if missing
 *  - Appends initial history event if absent
 *  - Updates user doc role to match normalized tier
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as authorization from '../services/authorization';
import {
  userRepo,
  serverTimestamp,
  newBatch,
} from '../repositories';
import { isValidPlan, DEFAULT_PLAN, SubscriptionPlan } from '../subscriptions/catalog';
import { resolveEntitlements } from '../subscriptions/entitlements';
import { buildDefaultSubscriptionDoc } from '../subscriptions/lifecycle';

/** Maps legacy tier values to the new model. */
function normalizeTier(raw: string | undefined | null): SubscriptionPlan {
  if (!raw) return DEFAULT_PLAN;
  const cleaned = String(raw).trim().toLowerCase();

  // Legacy mappings
  if (cleaned === 'studio_free') return DEFAULT_PLAN;
  if (cleaned === 'free') return DEFAULT_PLAN;

  // Valid plan → keep it
  if (isValidPlan(cleaned)) return cleaned as SubscriptionPlan;

  // Unknown → default
  return DEFAULT_PLAN;
}

export const migrateUsersToShooutModel = functions.https.onCall(async (_data: any, context: any) => {
  authorization.assertRole(context, ['admin']);

  const db = admin.firestore();
  const usersSnap = await db.collection('users').get();

  let migrated = 0;
  let skipped = 0;
  let created = 0;
  let batch = newBatch();
  let batchOps = 0;

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data();

    // Read current subscription
    const subRef = userRepo.subscriptionRef(userId);
    const subSnap = await subRef.get();

    if (!subSnap.exists) {
      // No subscription doc → create default shoout
      const defaultDoc = buildDefaultSubscriptionDoc();
      batch.set(subRef, defaultDoc);
      batch.set(userRepo.ref(userId), {
        role: DEFAULT_PLAN,
        subscriptionStatus: 'free',
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Write initial history
      const histRef = db.collection('users').doc(userId).collection('subscriptionHistory').doc();
      batch.set(histRef, {
        type: 'created',
        fromTier: null,
        toTier: DEFAULT_PLAN,
        provider: null,
        txRef: null,
        metadata: { source: 'migration' },
        createdAt: serverTimestamp(),
        actor: 'system',
      });

      batchOps += 3;
      created++;
    } else {
      const subData = subSnap.data() as Record<string, any>;
      const currentTier = String(subData.tier || '');
      const normalizedTier = normalizeTier(currentTier);
      const entitlements = resolveEntitlements(normalizedTier);

      const needsUpdate =
        currentTier !== normalizedTier ||
        !subData.serviceEntitlements ||
        subData.version === undefined;

      if (!needsUpdate) {
        skipped++;
        continue;
      }

      // Update subscription doc
      batch.set(subRef, {
        tier: normalizedTier,
        serviceEntitlements: entitlements,
        version: (subData.version || 0) + 1,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Sync user doc role
      if (userData.role !== normalizedTier) {
        batch.set(userRepo.ref(userId), {
          role: normalizedTier,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        batchOps++;
      }

      // Append migration history if tier changed
      if (currentTier !== normalizedTier) {
        const histRef = db.collection('users').doc(userId).collection('subscriptionHistory').doc();
        batch.set(histRef, {
          type: 'downgraded',
          fromTier: currentTier,
          toTier: normalizedTier,
          provider: null,
          txRef: null,
          metadata: { source: 'migration', reason: 'legacy_tier_normalization' },
          createdAt: serverTimestamp(),
          actor: 'system',
        });
        batchOps++;
      }

      batchOps++;
      migrated++;
    }

    if (batchOps >= 400) {
      await batch.commit();
      batch = newBatch();
      batchOps = 0;
    }
  }

  if (batchOps > 0) {
    await batch.commit();
  }

  const summary = { migrated, created, skipped, total: usersSnap.size };
  functions.logger.info('Migration complete', summary);

  await authorization.logAdminAction({
    actorId: context.auth.uid,
    action: 'migrate_users_to_shoout_model',
    targetType: 'system',
    targetId: 'all_users',
    details: summary,
  });

  return { success: true, ...summary };
});
