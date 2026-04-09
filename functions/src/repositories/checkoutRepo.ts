/**
 * Checkout session repository.
 */

import { COLLECTIONS } from '../types';
import { getDb, serverTimestamp, DocRef } from './base';

const col = () => getDb().collection(COLLECTIONS.CHECKOUT_SESSIONS);

export function ref(txRef: string): DocRef {
  return col().doc(txRef);
}

export async function getByTxRef(txRef: string) {
  const snap = await ref(txRef).get();
  return snap.exists ? snap.data() : undefined;
}

export async function getSnapByTxRef(txRef: string) {
  return ref(txRef).get();
}

export async function create(txRef: string, data: Record<string, unknown>) {
  await ref(txRef).set(data);
}

export async function merge(txRef: string, data: Record<string, unknown>) {
  await ref(txRef).set(data, { merge: true });
}
