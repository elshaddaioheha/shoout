/**
 * Subscription payment repository.
 */

import { COLLECTIONS } from '../types';
import { getDb, DocRef } from './base';

const col = () => getDb().collection(COLLECTIONS.SUBSCRIPTION_PAYMENTS);

export function ref(txRef: string): DocRef {
  return col().doc(txRef);
}

export async function getByTxRef(txRef: string) {
  const snap = await ref(txRef).get();
  return snap.exists ? snap.data() : undefined;
}

export async function merge(txRef: string, data: Record<string, unknown>) {
  await ref(txRef).set(data, { merge: true });
}
