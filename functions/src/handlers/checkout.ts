/**
 * Checkout handlers - Shopping cart and payment session management
 */

import * as functions from 'firebase-functions';
import * as pricing from '../services/pricing';
import { CART_TOTAL_EPSILON, CHECKOUT_SESSION_TTL_MS, NAIRA_RATE, CheckoutItem } from '../types';
import { checkoutRepo, serverTimestamp, timestampFromMs } from '../repositories';
import { convertUsdToNgn } from '../utils/formatting';

export const createCheckoutSession = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const userId = context.auth.uid;
  const rawItems = (data?.items || []) as CheckoutItem[];
  const clientTotalUsd = Number(data?.totalAmountUsd || 0);

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Cart is empty');
  }
  if (!Number.isFinite(clientTotalUsd) || clientTotalUsd <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid cart total');
  }

  const { items, totalUsd } = await pricing.calculateCartTotal(rawItems);
  pricing.validateCartTotalMatch(totalUsd, clientTotalUsd);

  const txRef = `shoouts_cart_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const totalAmountNgn = convertUsdToNgn(totalUsd);

  await checkoutRepo.create(txRef, {
    userId,
    items,
    totalAmountUsd: totalUsd,
    totalAmountNgn,
    exchangeRateNgnPerUsd: NAIRA_RATE,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt: timestampFromMs(Date.now() + CHECKOUT_SESSION_TTL_MS),
  });

  return { txRef, amountNgn: totalAmountNgn, currency: 'NGN' };
});

export const getCheckoutStatus = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const userId = context.auth.uid;
  const txRef = String(data?.txRef || '');
  if (!txRef) {
    throw new functions.https.HttpsError('invalid-argument', 'txRef is required');
  }

  const session = await checkoutRepo.getByTxRef(txRef);
  if (!session) {
    throw new functions.https.HttpsError('not-found', 'Checkout session not found');
  }
  if ((session as any).userId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Not allowed to view this session');
  }

  return { status: (session as any).status, txRef };
});
