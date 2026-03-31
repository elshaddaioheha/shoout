/**
 * Checkout handlers - Shopping cart and payment session management
 */

import * as functions from 'firebase-functions';
import * as pricing from '../services/pricing';
import { CART_TOTAL_EPSILON, CheckoutItem } from '../types';
import { getDb, serverTimestamp } from '../utils/firebase';
import { convertUsdToNgn } from '../utils/formatting';

/**
 * createCheckoutSession - Creates a new checkout session
 */
export const createCheckoutSession = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required'
    );
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

  // Resolve and validate all items
  const { items, totalUsd } = await pricing.calculateCartTotal(rawItems);

  // Verify client and server totals match
  pricing.validateCartTotalMatch(totalUsd, clientTotalUsd);

  // Create checkout session
  const txRef = `shoouts_cart_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const totalAmountNgn = convertUsdToNgn(totalUsd);

  const db = getDb();
  await db.collection('checkoutSessions').doc(txRef).set({
    userId,
    items,
    totalAmountUsd: totalUsd,
    totalAmountNgn,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt: require('firebase-admin').firestore.Timestamp.fromMillis(
      Date.now() + 1000 * 60 * 30
    ),
  });

  return {
    txRef,
    amountNgn: totalAmountNgn,
    currency: 'NGN',
  };
});

/**
 * getCheckoutStatus - Gets status of a checkout session
 */
export const getCheckoutStatus = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required'
    );
  }

  const userId = context.auth.uid;
  const txRef = String(data?.txRef || '');

  if (!txRef) {
    throw new functions.https.HttpsError('invalid-argument', 'txRef is required');
  }

  const db = getDb();
  const sessionSnap = await db.collection('checkoutSessions').doc(txRef).get();

  if (!sessionSnap.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'Checkout session not found'
    );
  }

  const session = sessionSnap.data() as { userId: string; status: string };

  if (session.userId !== userId) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Not allowed to view this session'
    );
  }

  return {
    status: session.status,
    txRef,
  };
});
