/**
 * Cryptographic utilities - hashing, encoding, random generation
 */

import * as crypto from 'crypto';
import { OTP_HASH_SALT } from '../types';

/**
 * Generates a random 6-digit OTP code
 */
export function generateOtpCode(): string {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

/**
 * Hashes an OTP code using SHA256 with salt
 */
export function hashOtp(code: string): string {
  return crypto
    .createHash('sha256')
    .update(`${OTP_HASH_SALT}:${code}`)
    .digest('hex');
}

/**
 * Creates a challenge document ID as SHA256 hash of "purpose:email"
 */
export function challengeDocId(purpose: string, emailLower: string): string {
  return crypto
    .createHash('sha256')
    .update(`${purpose}:${emailLower}`)
    .digest('hex')
    .slice(0, 40);
}

/**
 * Verifies a webhook signature using HMAC SHA256
 */
export function verifyWebhookSignature(rawBody: string, signature: string | undefined, secret: string): boolean {
  if (!signature || !secret) return false;
  const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return hash === signature;
}

/**
 * Generates a random verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
