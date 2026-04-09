/**
 * Subscription lifecycle — activation, expiry, downgrade, history.
 * Owns all writes to users/{uid}/subscription/current and history subcollection.
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {
  userRepo,
  paymentRepo,
  serverTimestamp,
  newBatch,
  timestampFromDate,
  timestampNow,
  systemRepo,
} from '../repositories';
import {
  SubscriptionPlan,
  BillingCycle,
  SubscriptionStatus,
  DEFAULT_PLAN,
  isFreePlan,
  isPaidPlan,
  isValidPlan,
  PLAN_PRICING_USD,
} from './catalog';
import { resolveEntitlements } from './entitlements';
import { NAIRA_RATE } from '../types';
import { convertUsdToNgn } from '../utils/formatting';

/** Current exchange rate — stored in every payment record for audit trail. */
export function currentExchangeRate(): number {
  return NAIRA_RATE;
}

// ── Types ──────────────────────────────────────────────────────────────────

export type HistoryEventType =
  | 'created'
  | 'activated'
  | 'renewed'
  | 'upgraded'
  | 'downgraded'
  | 'expired'
  | 'canceled'
  | 'payment_failed';

export type HistoryActor = 'system' | 'user' | 'admin' | 'webhook';

export interface SubscriptionHistoryEvent {
  type: HistoryEventType;
  fromTier: string | null;
  toTier: string;
  provider: string | null;
  txRef: string | null;
  metadata: Record<string, unknown>;
  createdAt: unknown; // FieldValue
  actor: HistoryActor;
}

// ── History Writes ─────────────────────────────────────────────────────────

function historyRef(userId: string) {
  return userRepo.subscriptionRef(userId).parent.parent!
    .collection('subscription')
    .doc('current')
    .parent // subscription collection
    .parent! // user doc
    .collection('subscriptionHistory');
}

async function appendHistory(userId: string, event: Omit<SubscriptionHistoryEvent, 'createdAt'>): Promise<void> {
  // Write to users/{uid}/subscriptionHistory/{auto}
  const db = userRepo.ref(userId).firestore;
  await db.collection('users').doc(userId).collection('subscriptionHistory').add({
    ...event,
    createdAt: serverTimestamp(),
  });
}

// ── Expiry Date Calculation ────────────────────────────────────────────────

export function calculateExpiryDate(billingCycle: BillingCycle, from: Date = new Date()): Date {
  const next = new Date(from.getTime());
  if (billingCycle === 'annual') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
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
export async function syncCustomClaims(userId: string, plan: SubscriptionPlan): Promise<void> {
  const ent = resolveEntitlements(plan);
  try {
    // Preserve existing admin role claims if present
    const user = await admin.auth().getUser(userId).catch(() => null);
    const existingClaims = (user?.customClaims || {}) as Record<string, unknown>;

    await admin.auth().setCustomUserClaims(userId, {
      ...existingClaims,
      plan,
      canVault: ent.canAccessVaultWorkspace,
      canStudio: ent.canSell,
      canSell: ent.canSell,
      canAds: ent.canUseAds,
    });
  } catch (error) {
    // Claims sync is best-effort — don't fail the operation
    functions.logger.error('Failed to sync custom claims', { userId, plan, error });
  }
}

// ── Pricing ────────────────────────────────────────────────────────────────

export function getExpectedAmountNgn(plan: SubscriptionPlan, cycle: BillingCycle): number {
  const pricing = PLAN_PRICING_USD[plan];
  const usd = cycle === 'annual' ? pricing.annualTotal : pricing.monthly;
  return convertUsdToNgn(usd);
}

// ── Bootstrap (new user) ───────────────────────────────────────────────────

export function buildDefaultSubscriptionDoc() {
  const entitlements = resolveEntitlements(DEFAULT_PLAN);
  return {
    tier: DEFAULT_PLAN,
    status: 'free' as SubscriptionStatus,
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export async function bootstrapNewUser(userId: string): Promise<void> {
  const existing = await userRepo.getSubscription(userId);
  if (existing) return; // Already has a subscription doc

  const batch = newBatch();

  batch.set(userRepo.subscriptionRef(userId), buildDefaultSubscriptionDoc());
  batch.set(
    userRepo.ref(userId),
    { role: DEFAULT_PLAN, subscriptionStatus: 'free', updatedAt: serverTimestamp() },
    { merge: true }
  );

  await batch.commit();

  await appendHistory(userId, {
    type: 'created',
    fromTier: null,
    toTier: DEFAULT_PLAN,
    provider: null,
    txRef: null,
    metadata: {},
    actor: 'system',
  });
}

// ── Activation ─────────────────────────────────────────────────────────────

export interface ActivationParams {
  planId: SubscriptionPlan;
  billingCycle: BillingCycle;
  txRef?: string;
  verifiedAmountNgn?: number;
  providerTransactionId?: string | null;
  actor?: HistoryActor;
}

export async function activate(userId: string, params: ActivationParams): Promise<void> {
  if (!isValidPlan(params.planId)) {
    throw new functions.https.HttpsError('invalid-argument', `Invalid plan: ${params.planId}`);
  }

  const currentSub = await userRepo.getSubscription(userId);
  const fromTier = (currentSub?.tier as string) || DEFAULT_PLAN;

  const free = isFreePlan(params.planId);
  const expiresAt = free ? null : timestampFromDate(calculateExpiryDate(params.billingCycle));
  const periodStart = free ? null : timestampNow();
  const status: SubscriptionStatus = free ? 'free' : 'active';
  const entitlements = resolveEntitlements(params.planId);

  const batch = newBatch();

  batch.set(
    userRepo.subscriptionRef(userId),
    {
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
      updatedAt: serverTimestamp(),
      ...(!currentSub ? { createdAt: serverTimestamp() } : {}),
    },
    { merge: true }
  );

  batch.set(
    userRepo.ref(userId),
    {
      role: params.planId,
      lastSubscribedAt: serverTimestamp(),
      subscriptionStatus: status,
    },
    { merge: true }
  );

  // Payment record for paid plans
  if (!free && params.txRef) {
    batch.set(
      paymentRepo.ref(params.txRef),
      {
        userId,
        planId: params.planId,
        billingCycle: params.billingCycle,
        status: 'completed',
        amountNgn: params.verifiedAmountNgn || 0,
        expectedAmountNgn: getExpectedAmountNgn(params.planId, params.billingCycle),
        exchangeRateNgnPerUsd: currentExchangeRate(),
        provider: 'flutterwave',
        providerTransactionId: params.providerTransactionId || null,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();

  await appendHistory(userId, {
    type: fromTier === params.planId ? 'renewed' : (isPaidPlan(params.planId) ? 'upgraded' : 'activated'),
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

export async function downgradeToDefault(userId: string, reason: 'expired' | 'canceled'): Promise<void> {
  const currentSub = await userRepo.getSubscription(userId);
  const fromTier = (currentSub?.tier as string) || DEFAULT_PLAN;
  const entitlements = resolveEntitlements(DEFAULT_PLAN);

  const batch = newBatch();

  batch.set(
    userRepo.subscriptionRef(userId),
    {
      tier: DEFAULT_PLAN,
      status: reason,
      isSubscribed: false,
      billingCycle: null,
      expiresAt: null,
      cancelAtPeriodEnd: false,
      serviceEntitlements: entitlements,
      version: (currentSub?.version || 0) + 1,
      updatedAt: serverTimestamp(),
      downgradedAt: serverTimestamp(),
    },
    { merge: true }
  );

  batch.set(
    userRepo.ref(userId),
    {
      role: DEFAULT_PLAN,
      subscriptionStatus: reason,
      downgradedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();

  await appendHistory(userId, {
    type: reason === 'expired' ? 'expired' : 'canceled',
    fromTier,
    toTier: DEFAULT_PLAN,
    provider: null,
    txRef: null,
    metadata: { reason },
    actor: 'system',
  });

  await syncCustomClaims(userId, DEFAULT_PLAN);
}

// ── Bulk downgrade (scheduled job) ─────────────────────────────────────────

export async function downgradeExpiredSubscriptions(): Promise<number> {
  const now = timestampNow();
  const entitlements = resolveEntitlements(DEFAULT_PLAN);

  const expiredSnap = await systemRepo.subscriptionCollectionGroup()
    .where('status', '==', 'active')
    .where('expiresAt', '<=', now)
    .get();

  if (expiredSnap.empty) return 0;

  let downgraded = 0;
  let batch = newBatch();
  let batchOps = 0;

  for (const docSnap of expiredSnap.docs) {
    const userDocRef = docSnap.ref.parent.parent;
    if (!userDocRef) continue;

    batch.set(
      docSnap.ref,
      {
        tier: DEFAULT_PLAN,
        status: 'expired' as SubscriptionStatus,
        isSubscribed: false,
        billingCycle: null,
        expiresAt: null,
        cancelAtPeriodEnd: false,
        serviceEntitlements: entitlements,
        updatedAt: serverTimestamp(),
        downgradedAt: serverTimestamp(),
      },
      { merge: true }
    );

    batch.set(
      userDocRef,
      {
        role: DEFAULT_PLAN,
        subscriptionStatus: 'expired',
        downgradedAt: serverTimestamp(),
      },
      { merge: true }
    );

    batchOps += 2;
    downgraded += 1;

    if (batchOps >= 400) {
      await batch.commit();
      batch = newBatch();
      batchOps = 0;
    }
  }

  if (batchOps > 0) await batch.commit();

  functions.logger.info('Downgraded expired subscriptions', { downgraded });
  return downgraded;
}

// ── Helpers kept for backward compat (used by invoicing, email) ────────────

export { buildMailQueuePayload, invoiceStoragePath } from '../subscriptionLifecycle';
