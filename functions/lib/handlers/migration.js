"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateUsersToShooutModel = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const authorization = __importStar(require("../services/authorization"));
const repositories_1 = require("../repositories");
const catalog_1 = require("../subscriptions/catalog");
const entitlements_1 = require("../subscriptions/entitlements");
const lifecycle_1 = require("../subscriptions/lifecycle");
/** Maps legacy tier values to the new model. */
function normalizeTier(raw) {
    if (!raw)
        return catalog_1.DEFAULT_PLAN;
    const cleaned = String(raw).trim().toLowerCase();
    // Legacy mappings
    if (cleaned === 'studio_free')
        return catalog_1.DEFAULT_PLAN;
    if (cleaned === 'free')
        return catalog_1.DEFAULT_PLAN;
    // Valid plan → keep it
    if ((0, catalog_1.isValidPlan)(cleaned))
        return cleaned;
    // Unknown → default
    return catalog_1.DEFAULT_PLAN;
}
exports.migrateUsersToShooutModel = functions.https.onCall(async (_data, context) => {
    authorization.assertRole(context, ['admin']);
    const db = admin.firestore();
    const usersSnap = await db.collection('users').get();
    let migrated = 0;
    let skipped = 0;
    let created = 0;
    let batch = (0, repositories_1.newBatch)();
    let batchOps = 0;
    for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        // Read current subscription
        const subRef = repositories_1.userRepo.subscriptionRef(userId);
        const subSnap = await subRef.get();
        if (!subSnap.exists) {
            // No subscription doc → create default shoout
            const defaultDoc = (0, lifecycle_1.buildDefaultSubscriptionDoc)();
            batch.set(subRef, defaultDoc);
            batch.set(repositories_1.userRepo.ref(userId), {
                role: catalog_1.DEFAULT_PLAN,
                subscriptionStatus: 'free',
                updatedAt: (0, repositories_1.serverTimestamp)(),
            }, { merge: true });
            // Write initial history
            const histRef = db.collection('users').doc(userId).collection('subscriptionHistory').doc();
            batch.set(histRef, {
                type: 'created',
                fromTier: null,
                toTier: catalog_1.DEFAULT_PLAN,
                provider: null,
                txRef: null,
                metadata: { source: 'migration' },
                createdAt: (0, repositories_1.serverTimestamp)(),
                actor: 'system',
            });
            batchOps += 3;
            created++;
        }
        else {
            const subData = subSnap.data();
            const currentTier = String(subData.tier || '');
            const normalizedTier = normalizeTier(currentTier);
            const entitlements = (0, entitlements_1.resolveEntitlements)(normalizedTier);
            const needsUpdate = currentTier !== normalizedTier ||
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
                updatedAt: (0, repositories_1.serverTimestamp)(),
            }, { merge: true });
            // Sync user doc role
            if (userData.role !== normalizedTier) {
                batch.set(repositories_1.userRepo.ref(userId), {
                    role: normalizedTier,
                    updatedAt: (0, repositories_1.serverTimestamp)(),
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
                    createdAt: (0, repositories_1.serverTimestamp)(),
                    actor: 'system',
                });
                batchOps++;
            }
            batchOps++;
            migrated++;
        }
        if (batchOps >= 400) {
            await batch.commit();
            batch = (0, repositories_1.newBatch)();
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
