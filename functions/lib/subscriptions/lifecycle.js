"use strict";
/**
 * Subscription lifecycle — activation, expiry, downgrade, history.
 * Owns all writes to users/{uid}/subscription/current and history subcollection.
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
exports.invoiceStoragePath = exports.buildMailQueuePayload = void 0;
exports.currentExchangeRate = currentExchangeRate;
exports.calculateExpiryDate = calculateExpiryDate;
exports.syncCustomClaims = syncCustomClaims;
exports.getExpectedAmountNgn = getExpectedAmountNgn;
exports.buildDefaultSubscriptionDoc = buildDefaultSubscriptionDoc;
exports.bootstrapNewUser = bootstrapNewUser;
exports.activate = activate;
exports.downgradeToDefault = downgradeToDefault;
exports.downgradeExpiredSubscriptions = downgradeExpiredSubscriptions;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const repositories_1 = require("../repositories");
const catalog_1 = require("./catalog");
const entitlements_1 = require("./entitlements");
const types_1 = require("../types");
const formatting_1 = require("../utils/formatting");
/** Current exchange rate — stored in every payment record for audit trail. */
function currentExchangeRate() {
    return types_1.NAIRA_RATE;
}
// ── History Writes ─────────────────────────────────────────────────────────
function historyRef(userId) {
    return repositories_1.userRepo.subscriptionRef(userId).parent.parent
        .collection('subscription')
        .doc('current')
        .parent // subscription collection
        .parent // user doc
        .collection('subscriptionHistory');
}
async function appendHistory(userId, event) {
    // Write to users/{uid}/subscriptionHistory/{auto}
    const db = repositories_1.userRepo.ref(userId).firestore;
    await db.collection('users').doc(userId).collection('subscriptionHistory').add({
        ...event,
        createdAt: (0, repositories_1.serverTimestamp)(),
    });
}
// ── Expiry Date Calculation ────────────────────────────────────────────────
function calculateExpiryDate(billingCycle, from = new Date()) {
    const next = new Date(from.getTime());
    if (billingCycle === 'annual') {
        next.setFullYear(next.getFullYear() + 1);
    }
    else {
        next.setMonth(next.getMonth() + 1);
    }
    return next;
}
// ── Custom Claims Sync ─────────────────────────────────────────────────────
/**
 * Syncs compact subscription claims to Firebase Auth custom claims.
 * Called after every activation and downgrade so the client token reflects
 * the current plan without hitting Firestore.
 */
async function syncCustomClaims(userId, plan) {
    const ent = (0, entitlements_1.resolveEntitlements)(plan);
    try {
        // Preserve existing admin role claims if present
        const user = await admin.auth().getUser(userId).catch(() => null);
        const existingClaims = (user?.customClaims || {});
        await admin.auth().setCustomUserClaims(userId, {
            ...existingClaims,
            plan,
            canVault: ent.canAccessVaultWorkspace,
            canStudio: ent.canSell,
            canSell: ent.canSell,
            canAds: ent.canUseAds,
        });
    }
    catch (error) {
        // Claims sync is best-effort — don't fail the operation
        functions.logger.error('Failed to sync custom claims', { userId, plan, error });
    }
}
// ── Pricing ────────────────────────────────────────────────────────────────
function getExpectedAmountNgn(plan, cycle) {
    const pricing = catalog_1.PLAN_PRICING_USD[plan];
    const usd = cycle === 'annual' ? pricing.annualTotal : pricing.monthly;
    return (0, formatting_1.convertUsdToNgn)(usd);
}
// ── Bootstrap (new user) ───────────────────────────────────────────────────
function buildDefaultSubscriptionDoc() {
    const entitlements = (0, entitlements_1.resolveEntitlements)(catalog_1.DEFAULT_PLAN);
    return {
        tier: catalog_1.DEFAULT_PLAN,
        status: 'free',
        isSubscribed: false,
        billingCycle: null,
        provider: null,
        providerTransactionRef: null,
        currentPeriodStartAt: null,
        currentPeriodEndAt: null,
        expiresAt: null,
        cancelAtPeriodEnd: false,
        serviceEntitlements: entitlements,
        version: 1,
        createdAt: (0, repositories_1.serverTimestamp)(),
        updatedAt: (0, repositories_1.serverTimestamp)(),
    };
}
async function bootstrapNewUser(userId) {
    const existing = await repositories_1.userRepo.getSubscription(userId);
    if (existing)
        return; // Already has a subscription doc
    const batch = (0, repositories_1.newBatch)();
    batch.set(repositories_1.userRepo.subscriptionRef(userId), buildDefaultSubscriptionDoc());
    batch.set(repositories_1.userRepo.ref(userId), { role: catalog_1.DEFAULT_PLAN, subscriptionStatus: 'free', updatedAt: (0, repositories_1.serverTimestamp)() }, { merge: true });
    await batch.commit();
    await appendHistory(userId, {
        type: 'created',
        fromTier: null,
        toTier: catalog_1.DEFAULT_PLAN,
        provider: null,
        txRef: null,
        metadata: {},
        actor: 'system',
    });
}
async function activate(userId, params) {
    if (!(0, catalog_1.isValidPlan)(params.planId)) {
        throw new functions.https.HttpsError('invalid-argument', `Invalid plan: ${params.planId}`);
    }
    const currentSub = await repositories_1.userRepo.getSubscription(userId);
    const fromTier = currentSub?.tier || catalog_1.DEFAULT_PLAN;
    const free = (0, catalog_1.isFreePlan)(params.planId);
    const expiresAt = free ? null : (0, repositories_1.timestampFromDate)(calculateExpiryDate(params.billingCycle));
    const periodStart = free ? null : (0, repositories_1.timestampNow)();
    const status = free ? 'free' : 'active';
    const entitlements = (0, entitlements_1.resolveEntitlements)(params.planId);
    const batch = (0, repositories_1.newBatch)();
    batch.set(repositories_1.userRepo.subscriptionRef(userId), {
        tier: params.planId,
        status,
        isSubscribed: !free,
        billingCycle: free ? null : params.billingCycle,
        provider: free ? null : 'flutterwave',
        providerTransactionRef: free ? null : (params.txRef || null),
        currentPeriodStartAt: periodStart,
        currentPeriodEndAt: expiresAt,
        expiresAt,
        cancelAtPeriodEnd: false,
        serviceEntitlements: entitlements,
        version: (currentSub?.version || 0) + 1,
        updatedAt: (0, repositories_1.serverTimestamp)(),
        ...(!currentSub ? { createdAt: (0, repositories_1.serverTimestamp)() } : {}),
    }, { merge: true });
    batch.set(repositories_1.userRepo.ref(userId), {
        role: params.planId,
        lastSubscribedAt: (0, repositories_1.serverTimestamp)(),
        subscriptionStatus: status,
    }, { merge: true });
    // Payment record for paid plans
    if (!free && params.txRef) {
        batch.set(repositories_1.paymentRepo.ref(params.txRef), {
            userId,
            planId: params.planId,
            billingCycle: params.billingCycle,
            status: 'completed',
            amountNgn: params.verifiedAmountNgn || 0,
            expectedAmountNgn: getExpectedAmountNgn(params.planId, params.billingCycle),
            exchangeRateNgnPerUsd: currentExchangeRate(),
            provider: 'flutterwave',
            providerTransactionId: params.providerTransactionId || null,
            updatedAt: (0, repositories_1.serverTimestamp)(),
            createdAt: (0, repositories_1.serverTimestamp)(),
        }, { merge: true });
    }
    await batch.commit();
    await appendHistory(userId, {
        type: fromTier === params.planId ? 'renewed' : ((0, catalog_1.isPaidPlan)(params.planId) ? 'upgraded' : 'activated'),
        fromTier,
        toTier: params.planId,
        provider: free ? null : 'flutterwave',
        txRef: params.txRef || null,
        metadata: {
            billingCycle: params.billingCycle,
            amountNgn: params.verifiedAmountNgn || 0,
        },
        actor: params.actor || 'user',
    });
    // Sync custom claims so the client token reflects the new plan
    await syncCustomClaims(userId, params.planId);
}
// ── Downgrade (expiry / cancellation) ──────────────────────────────────────
async function downgradeToDefault(userId, reason) {
    const currentSub = await repositories_1.userRepo.getSubscription(userId);
    const fromTier = currentSub?.tier || catalog_1.DEFAULT_PLAN;
    const entitlements = (0, entitlements_1.resolveEntitlements)(catalog_1.DEFAULT_PLAN);
    const batch = (0, repositories_1.newBatch)();
    batch.set(repositories_1.userRepo.subscriptionRef(userId), {
        tier: catalog_1.DEFAULT_PLAN,
        status: reason,
        isSubscribed: false,
        billingCycle: null,
        expiresAt: null,
        cancelAtPeriodEnd: false,
        serviceEntitlements: entitlements,
        version: (currentSub?.version || 0) + 1,
        updatedAt: (0, repositories_1.serverTimestamp)(),
        downgradedAt: (0, repositories_1.serverTimestamp)(),
    }, { merge: true });
    batch.set(repositories_1.userRepo.ref(userId), {
        role: catalog_1.DEFAULT_PLAN,
        subscriptionStatus: reason,
        downgradedAt: (0, repositories_1.serverTimestamp)(),
    }, { merge: true });
    await batch.commit();
    await appendHistory(userId, {
        type: reason === 'expired' ? 'expired' : 'canceled',
        fromTier,
        toTier: catalog_1.DEFAULT_PLAN,
        provider: null,
        txRef: null,
        metadata: { reason },
        actor: 'system',
    });
    await syncCustomClaims(userId, catalog_1.DEFAULT_PLAN);
}
// ── Bulk downgrade (scheduled job) ─────────────────────────────────────────
async function downgradeExpiredSubscriptions() {
    const now = (0, repositories_1.timestampNow)();
    const entitlements = (0, entitlements_1.resolveEntitlements)(catalog_1.DEFAULT_PLAN);
    const expiredSnap = await repositories_1.systemRepo.subscriptionCollectionGroup()
        .where('status', '==', 'active')
        .where('expiresAt', '<=', now)
        .get();
    if (expiredSnap.empty)
        return 0;
    let downgraded = 0;
    let batch = (0, repositories_1.newBatch)();
    let batchOps = 0;
    for (const docSnap of expiredSnap.docs) {
        const userDocRef = docSnap.ref.parent.parent;
        if (!userDocRef)
            continue;
        batch.set(docSnap.ref, {
            tier: catalog_1.DEFAULT_PLAN,
            status: 'expired',
            isSubscribed: false,
            billingCycle: null,
            expiresAt: null,
            cancelAtPeriodEnd: false,
            serviceEntitlements: entitlements,
            updatedAt: (0, repositories_1.serverTimestamp)(),
            downgradedAt: (0, repositories_1.serverTimestamp)(),
        }, { merge: true });
        batch.set(userDocRef, {
            role: catalog_1.DEFAULT_PLAN,
            subscriptionStatus: 'expired',
            downgradedAt: (0, repositories_1.serverTimestamp)(),
        }, { merge: true });
        batchOps += 2;
        downgraded += 1;
        if (batchOps >= 400) {
            await batch.commit();
            batch = (0, repositories_1.newBatch)();
            batchOps = 0;
        }
    }
    if (batchOps > 0)
        await batch.commit();
    functions.logger.info('Downgraded expired subscriptions', { downgraded });
    return downgraded;
}
// ── Helpers kept for backward compat (used by invoicing, email) ────────────
var subscriptionLifecycle_1 = require("../subscriptionLifecycle");
Object.defineProperty(exports, "buildMailQueuePayload", { enumerable: true, get: function () { return subscriptionLifecycle_1.buildMailQueuePayload; } });
Object.defineProperty(exports, "invoiceStoragePath", { enumerable: true, get: function () { return subscriptionLifecycle_1.invoiceStoragePath; } });
