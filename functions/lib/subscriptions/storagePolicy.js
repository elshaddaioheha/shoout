"use strict";
/**
 * Storage policy — separate vault and studio ledgers.
 * Every upload record has a backend-owned `storageLedger` field ('vault' | 'studio').
 * This module computes usage per ledger.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeVaultUsage = computeVaultUsage;
exports.computeStudioUsage = computeStudioUsage;
const repositories_1 = require("../repositories");
/**
 * Computes total vault storage usage for a user.
 * Only counts uploads where storageLedger === 'vault' (or legacy uploads without a ledger field,
 * which are treated as vault for backward compat).
 */
async function computeVaultUsage(userId) {
    const uploadsSnap = await repositories_1.userRepo.getAllUploads(userId);
    let usedBytes = 0;
    let usedCount = 0;
    for (const doc of uploadsSnap.docs) {
        const data = doc.data();
        const ledger = data.storageLedger || 'vault'; // legacy default
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
async function computeStudioUsage(userId) {
    const uploadsSnap = await repositories_1.userRepo.getAllUploads(userId);
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
