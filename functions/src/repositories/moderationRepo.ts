/**
 * Moderation repository — content reports, moderation log, payout ledger.
 */

import { COLLECTIONS } from '../types';
import { getDb, DocRef } from './base';

// ── Content Reports ────────────────────────────────────────────────────────

const reports = () => getDb().collection(COLLECTIONS.CONTENT_REPORTS);

export function reportRef(reportId: string): DocRef {
  return reports().doc(reportId);
}

export async function getReport(reportId: string) {
  const snap = await reportRef(reportId).get();
  return { exists: snap.exists, data: snap.data(), snap };
}

export function reportsQuery() {
  return reports();
}

// ── Moderation Log ─────────────────────────────────────────────────────────

const modLog = () => getDb().collection(COLLECTIONS.MODERATION_LOG);

export async function addLogEntry(data: Record<string, unknown>) {
  await modLog().add(data);
}

// ── Payout Ledger ──────────────────────────────────────────────────────────

const ledger = () => getDb().collection(COLLECTIONS.PAYOUT_LEDGER);

export function ledgerQuery() {
  return ledger();
}

export function ledgerRef(entryId?: string): DocRef {
  return entryId ? ledger().doc(entryId) : ledger().doc();
}

export async function createLedgerEntry(data: Record<string, unknown>) {
  const docRef = ledger().doc();
  await docRef.set(data);
  return docRef.id;
}
