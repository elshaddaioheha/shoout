/**
 * Storage policy — separate vault and studio ledgers.
 * Every upload record has a backend-owned `storageLedger` field ('vault' | 'studio').
 * This module computes usage per ledger.
 */

import { userRepo } from '../repositories';
import { StorageLedger } from './catalog';

export interface LedgerUsage {
  usedBytes: number;
  usedCount: number;
}

/**
 * Computes total vault storage usage for a user.
 * Only counts uploads where storageLedger === 'vault' (or legacy uploads without a ledger field,
 * which are treated as vault for backward compat).
 */
export async function computeVaultUsage(userId: string): Promise<LedgerUsage> {
  const uploadsSnap = await userRepo.getAllUploads(userId);
  let usedBytes = 0;
  let usedCount = 0;

  for (const doc of uploadsSnap.docs) {
    const data = doc.data();
    const ledger: StorageLedger = data.storageLedger || 'vault'; // legacy default
    if (ledger === 'vault') {
      usedBytes += data.fileSizeBytes || 0;
      usedCount += 1;
    }
  }

  return { usedBytes, usedCount };
}

/**
 * Computes total studio storage usage for a user.
 * Only counts uploads where storageLedger === 'studio'.
 */
export async function computeStudioUsage(userId: string): Promise<LedgerUsage> {
  const uploadsSnap = await userRepo.getAllUploads(userId);
  let usedBytes = 0;
  let usedCount = 0;

  for (const doc of uploadsSnap.docs) {
    const data = doc.data();
    if (data.storageLedger === 'studio') {
      usedBytes += data.fileSizeBytes || 0;
      usedCount += 1;
    }
  }

  return { usedBytes, usedCount };
}
