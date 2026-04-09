/**
 * System repository — aggregation caches and global collection-group queries.
 */

import { COLLECTIONS } from '../types';
import { getDb } from './base';


const col = () => getDb().collection(COLLECTIONS.SYSTEM);

export async function setBestSellers(data: Record<string, unknown>) {
  await col().doc('bestSellers').set(data);
}

export async function setTrending(data: Record<string, unknown>) {
  await col().doc('trending').set(data);
}

// ── Collection Group Queries ───────────────────────────────────────────────

export function uploadsCollectionGroup() {
  return getDb().collectionGroup(COLLECTIONS.UPLOADS);
}

export function subscriptionCollectionGroup() {
  return getDb().collectionGroup(COLLECTIONS.SUBSCRIPTION);
}
