/**
 * Payout service — initiates creator payouts via Flutterwave transfer API.
 *
 * Flow: pending ledger entry → verify creator bank → initiate transfer → track status
 *
 * Flutterwave Transfers API: POST https://api.flutterwave.com/v3/transfers
 */

import * as functions from 'firebase-functions';
import { FLUTTERWAVE_SECRET_KEY } from '../types';
import { moderationRepo, serverTimestamp } from '../repositories';

export interface PayoutBankDetails {
  accountBank: string;     // Bank code (e.g., "044" for Access Bank)
  accountNumber: string;   // 10-digit NUBAN
  beneficiaryName: string; // Account holder name
}

export interface PayoutResult {
  success: boolean;
  transferId?: string;
  status?: string;
  error?: string;
}

/**
 * Initiates a Flutterwave transfer for a pending payout ledger entry.
 */
export async function initiateTransfer(
  ledgerEntryId: string,
  bankDetails: PayoutBankDetails
): Promise<PayoutResult> {
  const secretKey = FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) {
    return { success: false, error: 'Flutterwave secret key not configured' };
  }

  // Read ledger entry
  const entrySnap = await moderationRepo.ledgerRef(ledgerEntryId).get();
  if (!entrySnap.exists) {
    return { success: false, error: 'Payout ledger entry not found' };
  }

  const entry = entrySnap.data() as Record<string, any>;
  if (entry.status !== 'pending') {
    return { success: false, error: `Payout is not pending (current: ${entry.status})` };
  }

  const amount = Number(entry.amount || 0);
  if (amount <= 0) {
    return { success: false, error: 'Invalid payout amount' };
  }

  const reference = `shoouts_payout_${ledgerEntryId}_${Date.now()}`;

  // Mark as processing before calling Flutterwave
  await moderationRepo.ledgerRef(ledgerEntryId).set({
    status: 'processing',
    transferReference: reference,
    updatedAt: serverTimestamp(),
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

    const payload = await response.json() as any;

    if (!response.ok || payload?.status !== 'success') {
      await moderationRepo.ledgerRef(ledgerEntryId).set({
        status: 'failed',
        transferError: payload?.message || 'Transfer initiation failed',
        updatedAt: serverTimestamp(),
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
    await moderationRepo.ledgerRef(ledgerEntryId).set({
      status: transferStatus === 'NEW' ? 'processing' : transferStatus.toLowerCase(),
      transferId,
      transferReference: reference,
      transferStatus,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return {
      success: true,
      transferId,
      status: transferStatus,
    };
  } catch (error) {
    functions.logger.error('Payout transfer error', { ledgerEntryId, error });

    await moderationRepo.ledgerRef(ledgerEntryId).set({
      status: 'failed',
      transferError: 'Network error during transfer',
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { success: false, error: 'Network error during transfer' };
  }
}

/**
 * Checks the status of a payout transfer with Flutterwave.
 */
export async function checkTransferStatus(transferId: string): Promise<{
  status: string;
  completeMessage?: string;
}> {
  const secretKey = FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) {
    throw new functions.https.HttpsError('unavailable', 'Flutterwave not configured');
  }

  const response = await fetch(
    `https://api.flutterwave.com/v3/transfers/${transferId}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${secretKey}` },
    }
  );

  const payload = await response.json() as any;
  return {
    status: String(payload?.data?.status || 'UNKNOWN'),
    completeMessage: payload?.data?.complete_message || undefined,
  };
}
