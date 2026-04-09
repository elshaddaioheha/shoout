/**
 * Validation utilities - input validation and sanitization
 */

import * as functions from 'firebase-functions';
import { LICENSE_USD_PRICES, OTP_PURPOSES, MAX_FILE_SIZE_BYTES, CheckoutItem } from '../types';

/**
 * Normalizes an email to lowercase and trims whitespace
 */
export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

/**
 * Validates email format using simple regex
 */
export function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email);
}

/**
 * Validates OTP code format (must be 6 digits)
 */
export function isValidOtpCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Validates OTP purpose
 */
export function isValidOtpPurpose(purpose: string): boolean {
  return OTP_PURPOSES.has(purpose.toLowerCase());
}

/**
 * Validates plan ID exists in known plans
 */
export function isValidPlanId(planId: string): boolean {
  const validPlans = ['shoout', 'vault', 'vault_pro', 'studio', 'hybrid'];
  return validPlans.includes(planId);
}

/**
 * Validates license SKU exists
 */
export function isValidLicenseSku(sku: string): boolean {
  return sku in LICENSE_USD_PRICES;
}

/**
 * Validates file size is within acceptable range
 */
export function isValidFileSize(fileSizeBytes: number): boolean {
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return false;
  }
  return fileSizeBytes <= MAX_FILE_SIZE_BYTES;
}

/**
 * Validates a checkout item structure
 */
export function isValidCheckoutItem(item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  if (!item.id || !item.title || !item.artist) return false;
  if (typeof item.price !== 'number' || item.price < 0) return false;
  if (!item.uploaderId) return false;
  return true;
}

/**
 * Validates an array of checkout items
 */
export function isValidCheckoutItems(items: any[]): boolean {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.every(isValidCheckoutItem);
}

/**
 * Validates cart total USD amount
 */
export function isValidCartTotal(totalUsd: number): boolean {
  return Number.isFinite(totalUsd) && totalUsd > 0;
}

/**
 * Validates password meets minimum requirements
 */
export function isValidPassword(password: string): boolean {
  return String(password || '').length >= 6;
}

/**
 * Validates conversion rate (exchange) is reasonable
 */
export function isValidExchangeRate(rate: number): boolean {
  return Number.isFinite(rate) && rate > 0 && rate < 10000; // Sanity check
}

/**
 * Throws HttpsError if validation fails
 */
export function validateEmail(email: string): void {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid email address');
  }
}

export function validateOtpCode(code: string): void {
  if (!isValidOtpCode(code)) {
    throw new functions.https.HttpsError('invalid-argument', 'Code must be 6 digits');
  }
}

export function validateOtpPurpose(purpose: string): void {
  if (!isValidOtpPurpose(purpose)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid OTP purpose');
  }
}

export function validatePlanId(planId: string): void {
  if (!isValidPlanId(planId)) {
    throw new functions.https.HttpsError('invalid-argument', `Unsupported plan: ${planId}`);
  }
}

export function validateFileSize(fileSizeBytes: number): void {
  if (!isValidFileSize(fileSizeBytes)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `File size must be between 1 byte and ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`
    );
  }
}

export function validatePassword(password: string): void {
  if (!isValidPassword(password)) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters');
  }
}
