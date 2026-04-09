"use strict";
/**
 * Payout service — initiates creator payouts via Flutterwave transfer API.
 *
 * Flow: pending ledger entry → verify creator bank → initiate transfer → track status
 *
 * Flutterwave Transfers API: POST https://api.flutterwave.com/v3/transfers
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateTransfer = initiateTransfer;
exports.checkTransferStatus = checkTransferStatus;
const functions = __importStar(require("firebase-functions"));
const types_1 = require("../types");
const repositories_1 = require("../repositories");
/**
 * Initiates a Flutterwave transfer for a pending payout ledger entry.
 */
async function initiateTransfer(ledgerEntryId, bankDetails) {
    const secretKey = types_1.FLUTTERWAVE_SECRET_KEY;
    if (!secretKey) {
        return { success: false, error: 'Flutterwave secret key not configured' };
    }
    // Read ledger entry
    const entrySnap = await repositories_1.moderationRepo.ledgerRef(ledgerEntryId).get();
    if (!entrySnap.exists) {
        return { success: false, error: 'Payout ledger entry not found' };
    }
    const entry = entrySnap.data();
    if (entry.status !== 'pending') {
        return { success: false, error: `Payout is not pending (current: ${entry.status})` };
    }
    const amount = Number(entry.amount || 0);
    if (amount <= 0) {
        return { success: false, error: 'Invalid payout amount' };
    }
    const reference = `shoouts_payout_${ledgerEntryId}_${Date.now()}`;
    // Mark as processing before calling Flutterwave
    await repositories_1.moderationRepo.ledgerRef(ledgerEntryId).set({
        status: 'processing',
        transferReference: reference,
        updatedAt: (0, repositories_1.serverTimestamp)(),
    }, { merge: true });
    try {
        const response = await fetch('https://api.flutterwave.com/v3/transfers', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                account_bank: bankDetails.accountBank,
                account_number: bankDetails.accountNumber,
                amount,
                narration: `Shoouts creator payout - ${reference}`,
                currency: 'NGN',
                reference,
                beneficiary_name: bankDetails.beneficiaryName,
                callback_url: null, // Webhook will handle status updates
            }),
        });
        const payload = await response.json();
        if (!response.ok || payload?.status !== 'success') {
            await repositories_1.moderationRepo.ledgerRef(ledgerEntryId).set({
                status: 'failed',
                transferError: payload?.message || 'Transfer initiation failed',
                updatedAt: (0, repositories_1.serverTimestamp)(),
            }, { merge: true });
            functions.logger.error('Flutterwave transfer failed', {
                ledgerEntryId,
                response: payload,
            });
            return {
                success: false,
                error: payload?.message || 'Transfer initiation failed',
            };
        }
        const transferId = String(payload?.data?.id || '');
        const transferStatus = String(payload?.data?.status || '');
        // Update ledger with transfer details
        await repositories_1.moderationRepo.ledgerRef(ledgerEntryId).set({
            status: transferStatus === 'NEW' ? 'processing' : transferStatus.toLowerCase(),
            transferId,
            transferReference: reference,
            transferStatus,
            updatedAt: (0, repositories_1.serverTimestamp)(),
        }, { merge: true });
        return {
            success: true,
            transferId,
            status: transferStatus,
        };
    }
    catch (error) {
        functions.logger.error('Payout transfer error', { ledgerEntryId, error });
        await repositories_1.moderationRepo.ledgerRef(ledgerEntryId).set({
            status: 'failed',
            transferError: 'Network error during transfer',
            updatedAt: (0, repositories_1.serverTimestamp)(),
        }, { merge: true });
        return { success: false, error: 'Network error during transfer' };
    }
}
/**
 * Checks the status of a payout transfer with Flutterwave.
 */
async function checkTransferStatus(transferId) {
    const secretKey = types_1.FLUTTERWAVE_SECRET_KEY;
    if (!secretKey) {
        throw new functions.https.HttpsError('unavailable', 'Flutterwave not configured');
    }
    const response = await fetch(`https://api.flutterwave.com/v3/transfers/${transferId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${secretKey}` },
    });
    const payload = await response.json();
    return {
        status: String(payload?.data?.status || 'UNKNOWN'),
        completeMessage: payload?.data?.complete_message || undefined,
    };
}
