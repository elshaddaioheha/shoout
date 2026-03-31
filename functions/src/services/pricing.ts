/**
 * Pricing service - Subscription and pricing calculations
 */

import * as functions from 'firebase-functions';
import {
  SUBSCRIPTION_PLAN_PRICING_USD,
  LICENSE_USD_PRICES,
  LICENSE_SKUS_ORDERED,
  NAIRA_RATE,
  SubscriptionBillingCycle,
  CheckoutItem,
  CART_TOTAL_EPSILON,
  FREE_SUBSCRIPTION_PLANS,
} from '../types';
import { getDb, serverTimestamp, batch } from '../utils/firebase';
import { convertUsdToNgn, roundUsd } from '../utils/formatting';
import {
  calculateSubscriptionExpiryDate,
  firestoreExpiredSubscriptionDocPatch,
  firestoreExpiredUserRolePatch,
} from '../subscriptionLifecycle';

/**
 * Parses cart item ID to extract upload ID and optional license SKU
 */
export function parseCartItemId(rawId: string): { uploadId: string; licenseSku: string | null } {
  for (const sku of LICENSE_SKUS_ORDERED) {
    const suf = '_' + sku;
    if (rawId.endsWith(suf)) {
      return { uploadId: rawId.slice(0, -suf.length), licenseSku: sku };
    }
  }
  return { uploadId: rawId, licenseSku: null };
}

/**
 * Resolves a checkout line item by fetching from Firestore and validating
 */
export async function resolveCheckoutLine(raw: CheckoutItem): Promise<CheckoutItem> {
  const db = getDb();
  const uploaderId = String(raw.uploaderId || '').trim();
  const { uploadId, licenseSku } = parseCartItemId(String(raw.id || '').trim());

  if (!uploadId || !uploaderId) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid cart item');
  }

  const snap = await db
    .collection('users')
    .doc(uploaderId)
    .collection('uploads')
    .doc(uploadId)
    .get();

  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Listing not found');
  }

  const d = snap.data() as Record<string, any>;
  if (d.isPublic !== true) {
    throw new functions.https.HttpsError('failed-precondition', 'Listing is not public');
  }

  let priceUsd: number;
  if (licenseSku && LICENSE_USD_PRICES[licenseSku] != null) {
    priceUsd = LICENSE_USD_PRICES[licenseSku];
  } else {
    priceUsd = Number(d.price);
  }

  if (!Number.isFinite(priceUsd) || priceUsd < 0) {
    throw new functions.https.HttpsError('failed-precondition', 'Invalid listing price');
  }

  priceUsd = roundUsd(priceUsd);

  return {
    id: raw.id,
    uploaderId,
    title: String(d.title || raw.title || 'Track'),
    artist: String(d.uploaderName || d.artist || raw.artist || 'Artist'),
    price: priceUsd,
    audioUrl: String(d.audioUrl || raw.audioUrl || ''),
    coverUrl: String(d.coverUrl || raw.coverUrl || ''),
  };
}

/**
 * Gets expected subscription amount in NGN based on plan and billing cycle
 */
export function getExpectedSubscriptionAmountNgn(
  planId: string,
  billingCycle: SubscriptionBillingCycle
): number {
  const pricing = SUBSCRIPTION_PLAN_PRICING_USD[planId];
  if (!pricing) {
    throw new functions.https.HttpsError('invalid-argument', `Unsupported planId: ${planId}`);
  }
  const usd = billingCycle === 'annual' ? pricing.annualTotal : pricing.monthly;
  return convertUsdToNgn(usd);
}

/**
 * Calculates subscription expiry timestamp based on billing cycle
 */
export function calculateSubscriptionExpiry(
  billingCycle: SubscriptionBillingCycle
): any {
  return require('firebase-admin').firestore.Timestamp.fromDate(
    calculateSubscriptionExpiryDate(billingCycle)
  );
}

/**
 * Calculates total cart price in USD after resolving all items
 */
export async function calculateCartTotal(
  rawItems: CheckoutItem[]
): Promise<{ items: CheckoutItem[]; totalUsd: number }> {
  const items: CheckoutItem[] = [];
  for (const raw of rawItems) {
    items.push(await resolveCheckoutLine(raw));
  }

  const totalUsd = roundUsd(items.reduce((sum, i) => sum + i.price, 0));
  return { items, totalUsd };
}

/**
 * Validates that client and server totals match (within epsilon tolerance)
 */
export function validateCartTotalMatch(serverTotal: number, clientTotal: number): void {
  if (Math.abs(serverTotal - clientTotal) > CART_TOTAL_EPSILON) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Cart total mismatch (server ${serverTotal} USD vs client ${clientTotal} USD)`
    );
  }
}

/**
 * Activates a subscription tier for a user
 */
export async function activateSubscriptionTier(userId: string, params: {
  planId: string;
  billingCycle: SubscriptionBillingCycle;
  txRef?: string;
  verifiedAmountNgn?: number;
  providerTransactionId?: string | null;
}): Promise<void> {
  const db = getDb();
  const now = serverTimestamp();
  const isFreeTier =
    getExpectedSubscriptionAmountNgn(params.planId, params.billingCycle) === 0 &&
    FREE_SUBSCRIPTION_PLANS.has(params.planId);

  const expiresAt = isFreeTier ? null : calculateSubscriptionExpiry(params.billingCycle);
  const subscriptionStatus = isFreeTier ? 'trial' : 'active';

  const userRef = db.collection('users').doc(userId);
  const subscriptionRef = userRef.collection('subscription').doc('current');
  const batchWrite = batch();

  batchWrite.set(
    subscriptionRef,
    {
      tier: params.planId,
      status: subscriptionStatus,
      isSubscribed: !isFreeTier,
      billingCycle: isFreeTier ? null : params.billingCycle,
      expiresAt,
      amountNgn: params.verifiedAmountNgn || 0,
      provider: isFreeTier ? 'internal' : 'flutterwave',
      txRef: isFreeTier ? null : params.txRef,
      providerTransactionId: params.providerTransactionId || null,
      updatedAt: now,
      activatedAt: now,
    },
    { merge: true }
  );

  batchWrite.set(
    userRef,
    {
      role: params.planId,
      lastSubscribedAt: now,
      subscriptionStatus,
    },
    { merge: true }
  );

  if (!isFreeTier && params.txRef) {
    const paymentRef = db.collection('subscriptionPayments').doc(params.txRef);
    batchWrite.set(
      paymentRef,
      {
        userId,
        planId: params.planId,
        billingCycle: params.billingCycle,
        status: 'completed',
        amountNgn: params.verifiedAmountNgn || 0,
        expectedAmountNgn: getExpectedSubscriptionAmountNgn(params.planId, params.billingCycle),
        provider: 'flutterwave',
        providerTransactionId: params.providerTransactionId || null,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );
  }

  await batchWrite.commit();
}

/**
 * Platform fee rate (10%)
 */
export function calculatePlatformFee(amountNgn: number): number {
  return Math.round(amountNgn * 0.1);
}

/**
 * Creator payout after platform fee
 */
export function calculateCreatorPayout(amountNgn: number): number {
  return amountNgn - calculatePlatformFee(amountNgn);
}
