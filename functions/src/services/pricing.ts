/**
 * Pricing service — cart resolution and total validation.
 * Subscription activation has moved to subscriptions/lifecycle.ts.
 */

import * as functions from 'firebase-functions';
import {
  LICENSE_USD_PRICES,
  LICENSE_SKUS_ORDERED,
  CheckoutItem,
  CART_TOTAL_EPSILON,
} from '../types';
import { userRepo } from '../repositories';
import { roundUsd } from '../utils/formatting';

const TIER_TITLES: Record<string, string> = {
  basic: 'Basic',
  premium: 'Premium',
  exclusive: 'Exclusive',
};

export function parseCartItemId(rawId: string): { uploadId: string; licenseSku: string | null } {
  for (const sku of LICENSE_SKUS_ORDERED) {
    const suf = '_' + sku;
    if (rawId.endsWith(suf)) {
      return { uploadId: rawId.slice(0, -suf.length), licenseSku: sku };
    }
  }
  return { uploadId: rawId, licenseSku: null };
}

export function resolveLicensePriceUsd(basePriceUsd: number, licenseSku: string | null): number {
  const basePrice = roundUsd(Number(basePriceUsd || 0));

  if (licenseSku === 'premium') {
    return roundUsd(basePrice * 2.5);
  }

  if (licenseSku === 'exclusive') {
    return roundUsd(basePrice * 7);
  }

  if (licenseSku && LICENSE_USD_PRICES[licenseSku] != null) {
    return LICENSE_USD_PRICES[licenseSku];
  }

  return basePrice;
}

export async function resolveCheckoutLine(raw: CheckoutItem): Promise<CheckoutItem> {
  const uploaderId = String(raw.uploaderId || '').trim();
  const { uploadId, licenseSku } = parseCartItemId(String(raw.id || '').trim());

  if (!uploadId || !uploaderId) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid cart item');
  }

  const d = await userRepo.getUpload(uploaderId, uploadId);
  if (!d) {
    throw new functions.https.HttpsError('not-found', 'Listing not found');
  }

  if (d.isPublic !== true) {
    throw new functions.https.HttpsError('failed-precondition', 'Listing is not public');
  }

  const storedBasePrice = Number(d.price);
  if (!Number.isFinite(storedBasePrice)) {
    throw new functions.https.HttpsError('failed-precondition', 'Listing has invalid price');
  }

  const normalizedTierId =
    licenseSku === 'premium' || licenseSku === 'exclusive'
      ? licenseSku
      : ((raw.licenseTierId || 'basic') as CheckoutItem['licenseTierId']);

  let priceUsd = resolveLicensePriceUsd(storedBasePrice, licenseSku);

  if (priceUsd < 0) {
    throw new functions.https.HttpsError('failed-precondition', 'Invalid listing price');
  }

  return {
    id: raw.id,
    listingId: uploadId,
    uploaderId,
    title: String(d.title || raw.title || 'Track'),
    artist: String(d.uploaderName || d.artist || raw.artist || 'Artist'),
    price: priceUsd,
    audioUrl: String(d.audioUrl || raw.audioUrl || ''),
    coverUrl: String(d.coverUrl || raw.coverUrl || ''),
    licenseTierId: normalizedTierId,
    licenseTierTitle: TIER_TITLES[normalizedTierId || 'basic'] || raw.licenseTierTitle || 'Basic',
    licenseSummary: String(raw.licenseSummary || ''),
  };
}

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

export function validateCartTotalMatch(serverTotal: number, clientTotal: number): void {
  if (Math.abs(serverTotal - clientTotal) > CART_TOTAL_EPSILON) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Cart total mismatch (server ${serverTotal} USD vs client ${clientTotal} USD)`
    );
  }
}
