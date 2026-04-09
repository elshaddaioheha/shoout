/**
 * Flutterwave service - Payment verification and webhook validation
 */

import * as functions from 'firebase-functions';
import { FLUTTERWAVE_SECRET_KEY, FLUTTERWAVE_SECRET_HASH, FlutterwaveVerifyResponse } from '../types';
import { verifyWebhookSignature } from '../utils/crypto';

function getSecretKey(): string {
  return FLUTTERWAVE_SECRET_KEY || '';
}

function getSecretHash(): string {
  return FLUTTERWAVE_SECRET_HASH || '';
}

export async function verifyFlutterwaveTransaction(txRef: string): Promise<FlutterwaveVerifyResponse> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    throw new functions.https.HttpsError('unavailable', 'Flutterwave is not configured');
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
    functions.logger.error('Flutterwave verify request failed', { status: response.status, txRef });
    throw new functions.https.HttpsError('internal', 'Payment verification failed');
  }

  const payload = (await response.json()) as FlutterwaveVerifyResponse;
  if (payload?.status !== 'success') {
    throw new functions.https.HttpsError('failed-precondition', 'Payment verification returned error');
  }

  return payload;
}

export function validateWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  const secret = getSecretHash();
  return verifyWebhookSignature(rawBody, signature, secret);
}
