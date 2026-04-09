/**
 * User repository — all reads/writes to users collection and subcollections.
 */

import { COLLECTIONS } from '../types';
import { getDb, serverTimestamp, DocRef } from './base';

const col = () => getDb().collection(COLLECTIONS.USERS);

// ── User Document ──────────────────────────────────────────────────────────

export function ref(userId: string): DocRef {
  return col().doc(userId);
}

export async function getById(userId: string) {
  const snap = await ref(userId).get();
  return snap.exists ? snap.data() : undefined;
}

export async function merge(userId: string, data: Record<string, unknown>) {
  await ref(userId).set(data, { merge: true });
}

export function query() {
  return col();
}

// ── Subscription Subcollection ─────────────────────────────────────────────

export function subscriptionRef(userId: string): DocRef {
  return ref(userId).collection(COLLECTIONS.SUBSCRIPTION).doc('current');
}

export async function getSubscription(userId: string) {
  const snap = await subscriptionRef(userId).get();
  return snap.exists ? snap.data() : undefined;
}

// ── Uploads Subcollection ──────────────────────────────────────────────────

export function uploadRef(userId: string, uploadId: string): DocRef {
  return ref(userId).collection(COLLECTIONS.UPLOADS).doc(uploadId);
}

export async function getUpload(userId: string, uploadId: string) {
  const snap = await uploadRef(userId, uploadId).get();
  return snap.exists ? snap.data() : undefined;
}

export async function getAllUploads(userId: string) {
  return ref(userId).collection(COLLECTIONS.UPLOADS).get();
}

export function uploadsCollection(userId: string) {
  return ref(userId).collection(COLLECTIONS.UPLOADS);
}

// ── Purchases Subcollection ────────────────────────────────────────────────

export function purchaseRef(userId: string, purchaseId: string): DocRef {
  return ref(userId).collection(COLLECTIONS.PURCHASES).doc(purchaseId);
}

export function purchasesQuery(userId: string) {
  return ref(userId).collection(COLLECTIONS.PURCHASES);
}

// ── Payouts Subcollection ──────────────────────────────────────────────────

export function payoutsQuery(userId: string) {
  return ref(userId).collection(COLLECTIONS.PAYOUTS);
}
