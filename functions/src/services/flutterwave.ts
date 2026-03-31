/**
 * Flutterwave service - Payment verification and transaction handling
 */

import * as functions from 'firebase-functions';
import { getFlutterwaveSecretKey, getFlutterwaveSecret } from '../utils/firebase';
import { verifyWebhookSignature } from '../utils/crypto';
import { convertNgnToUsd } from '../utils/formatting';

/**
 * Verifies a payment transaction with Flutterwave API
 */
export async function verifyFlutterwaveTransaction(txRef: string): Promise<any> {
  const secretKey = getFlutterwaveSecretKey();

  if (!secretKey) {
    throw new functions.https.HttpsError(
      'unavailable',
      'Flutterwave is not configured'
    );
  }

  const verifyUrl = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`;

  const response = await fetch(verifyUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    functions.logger.error('Flutterwave verify request failed', {
      status: response.status,
      txRef,
    });
    throw new functions.https.HttpsError('internal', 'Payment verification failed');
  }

  const payload = (await response.json()) as any;

  if (payload?.status !== 'success') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Payment verification returned error'
    );
  }

  return payload;
}

/**
 * Validates Flutterwave webhook signature
 */
export function validateWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  const secret = getFlutterwaveSecret();
  return verifyWebhookSignature(rawBody, signature, secret);
}

/**
 * Processes a charge.completed webhook event
 */
export async function processChargeCompletedEvent(data: any): Promise<{
  isValid: boolean;
  errors?: string[];
  txRef?: string;
  amountNgn?: number;
  transactionId?: string;
}> {
  const errors: string[] = [];
  const txRef = String(data?.tx_ref || '');
  const chargeStatus = String(data?.status || '').toLowerCase();
  const currency = String(data?.currency || '').toUpperCase();
  const amount = Number(data?.amount || 0);

  if (!txRef) {
    errors.push('Missing tx_ref');
  }

  if (chargeStatus !== 'successful') {
    errors.push(`Charge status is not successful: ${chargeStatus}`);
  }

  if (currency !== 'NGN') {
    errors.push(`Invalid currency: ${currency}, expected NGN`);
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push(`Invalid amount: ${amount}`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    txRef,
    amountNgn: amount,
    transactionId: data?.id,
  };
}

/**
 * Validates the expected amount matches paid amount
 */
export function validatePaymentAmount(
  expectedNgn: number,
  paidNgn: number,
  toleranceNgn: number = 0
): boolean {
  return paidNgn >= expectedNgn - toleranceNgn;
}
