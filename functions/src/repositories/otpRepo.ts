/**
 * OTP repository — challenge and token documents.
 */

import { COLLECTIONS } from '../types';
import { getDb, DocRef } from './base';

// ── OTP Challenges ─────────────────────────────────────────────────────────

const challenges = () => getDb().collection(COLLECTIONS.EMAIL_OTP_CHALLENGES);

export function challengeRef(docId: string): DocRef {
  return challenges().doc(docId);
}

export async function getChallenge(docId: string) {
  const snap = await challengeRef(docId).get();
  return { exists: snap.exists, data: snap.data() };
}

export async function setChallenge(docId: string, data: Record<string, unknown>) {
  await challengeRef(docId).set(data, { merge: true });
}

// ── OTP Tokens ─────────────────────────────────────────────────────────────

const tokens = () => getDb().collection(COLLECTIONS.EMAIL_OTP_TOKENS);

export function tokenRef(tokenId: string): DocRef {
  return tokens().doc(tokenId);
}

export async function getToken(tokenId: string) {
  const snap = await tokenRef(tokenId).get();
  return { exists: snap.exists, data: snap.data() };
}

export async function setToken(tokenId: string, data: Record<string, unknown>) {
  await tokenRef(tokenId).set(data);
}

export async function mergeToken(tokenId: string, data: Record<string, unknown>) {
  await tokenRef(tokenId).set(data, { merge: true });
}
