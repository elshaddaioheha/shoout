/**
 * Shared type definitions across all layers
 */

import type { firestore } from 'firebase-admin';

// ============================================================================
// Admin & Authorization
// ============================================================================

export type AdminRole = 'admin' | 'moderator' | 'auditor';

// ============================================================================
// Subscription & Billing
// ============================================================================

export type SubscriptionBillingCycle = 'monthly' | 'annual';

/**
 * Plan types re-exported from subscriptions catalog for backward compat.
 * Canonical definitions live in subscriptions/catalog.ts.
 */
export type SubscriptionPlan = 'shoout' | 'vault' | 'vault_pro' | 'studio' | 'hybrid';

export type SubscriptionStatus = 'free' | 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';

export interface SubscriptionDocument {
  tier: SubscriptionPlan;
  status: SubscriptionStatus;
  isSubscribed: boolean;
  billingCycle: SubscriptionBillingCycle | null;
  expiresAt: firestore.Timestamp | null;
  amountNgn: number;
  provider: 'internal' | 'flutterwave';
  txRef: string | null;
  providerTransactionId: string | null;
  updatedAt: firestore.FieldValue;
  activatedAt: firestore.FieldValue;
}

export interface SubscriptionPaymentRecord {
  userId: string;
  planId: SubscriptionPlan;
  billingCycle: SubscriptionBillingCycle;
  status: 'completed' | 'failed' | 'processing';
  amountNgn: number;
  expectedAmountNgn: number;
  provider: 'flutterwave';
  providerTransactionId: string | null;
  updatedAt: firestore.FieldValue;
  createdAt: firestore.FieldValue;
}

export interface UserDocument {
  email: string;
  fullName?: string;
  name?: string;
  role: SubscriptionPlan;
  lastSubscribedAt?: firestore.FieldValue;
  subscriptionStatus?: SubscriptionStatus;
  downgradedAt?: firestore.FieldValue;
  suspendedUntil?: firestore.Timestamp | null;
  suspensionReason?: string | null;
  storageUsedBytes?: number;
  createdAt?: firestore.FieldValue;
}

export interface FlutterwaveVerifyResponse {
  status: string;
  data?: {
    status: string;
    currency: string;
    amount: number;
    id: number;
    tx_ref: string;
  };
}

// ============================================================================
// Checkout & Shopping
// ============================================================================

export type CheckoutItem = {
  id: string;
  listingId?: string;
  title: string;
  artist: string;
  price: number; // USD
  uploaderId: string;
  audioUrl?: string;
  coverUrl?: string;
  licenseTierId?: 'basic' | 'premium' | 'exclusive';
  licenseTierTitle?: string;
  licenseSummary?: string;
};

export interface CheckoutSession {
  userId: string;
  items: CheckoutItem[];
  totalAmountUsd: number;
  totalAmountNgn: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired' | 'invalid_currency' | 'amount_mismatch';
  expiresAt?: firestore.Timestamp;
  providerTransactionId?: string | null;
  paidAmount?: number;
  providerPayload?: unknown;
  createdAt: firestore.FieldValue;
  updatedAt: firestore.FieldValue;
}

export type CreateCheckoutSessionData = {
  items: CheckoutItem[];
  totalAmountUsd: number;
};

export type GetCheckoutStatusData = {
  txRef: string;
};

// ============================================================================
// API Responses
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

// ============================================================================
// Invoicing
// ============================================================================

export type InvoiceLine = {
  description: string;
  qty: number;
  unitAmountNgn: number;
  totalAmountNgn: number;
};

// ============================================================================
// Pricing Constants
// ============================================================================

export const NAIRA_RATE = 1600;

/**
 * Canonical USD list prices (source of truth).
 * Flutterwave charges Math.round(usd * NAIRA_RATE) in NGN for settlement.
 * USD is displayed client-side; NGN is internal for payment processing only.
 *
 * NOTE: Annual totals use a discounted base rate (not monthly * 12).
 *   vault_pro annual base: $8.73/mo vs $8.73 monthly (no discount currently)
 *   studio   annual base: $14.34/mo vs $16.88 monthly (~15% discount)
 *   hybrid   annual base: $18.54/mo vs $21.82 monthly (~15% discount)
 */
// Pricing has moved to subscriptions/catalog.ts (PLAN_PRICING_USD)

/**
 * Legacy fixed-price license add-ons are still accepted for backwards compatibility.
 */
export const LICENSE_USD_PRICES: Record<string, number> = {
  mp3_tagged: 4.95,
  wav_2_free: 24.99,
  unlimited_wav_4_free: 32.99,
  unlimited_stems_9_free: 51.99,
};

export const LICENSE_SKUS_ORDERED = ['premium', 'exclusive', ...Object.keys(LICENSE_USD_PRICES)]
  .sort((a, b) => b.length - a.length);

export const CART_TOTAL_EPSILON = 0.02;

// Free plans have moved to subscriptions/catalog.ts (FREE_PLANS)

// ============================================================================
// Storage Limits by Tier (in bytes)
// ============================================================================

// Storage limits have moved to subscriptions/catalog.ts (PLAN_QUOTAS)

// ============================================================================
// OTP Configuration
// ============================================================================

export const EMAIL_COLLECTION = process.env.FIREBASE_TRIGGER_EMAIL_COLLECTION || 'mail';
export const OTP_CHALLENGE_COLLECTION = 'emailOtpChallenges';
export const OTP_TOKEN_COLLECTION = 'emailOtpTokens';
export const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const OTP_RESEND_INTERVAL_MS = 60 * 1000; // 1 minute
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_PURPOSES = new Set(['signup', 'password_reset']);
export const OTP_HASH_SALT = process.env.OTP_HASH_SALT || 'shoouts-otp';

// ============================================================================
// Invoice Configuration
// ============================================================================

export const VAT_RATE = 0.075; // 7.5%
export const PLATFORM_FEE_RATE = 0.1; // 10%
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const INVOICE_PDF_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const CHECKOUT_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const OVERPAYMENT_TOLERANCE_FACTOR = 1.05; // reject payments > 5% above expected (FX rounding tolerance)
export const SUSPENSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days default

// ============================================================================
// Collections
// ============================================================================

export const COLLECTIONS = {
  USERS: 'users',
  UPLOADS: 'uploads',
  PURCHASES: 'purchases',
  SUBSCRIPTION: 'subscription',
  PAYOUTS: 'payouts',
  TRANSACTIONS: 'transactions',
  SUBSCRIPTION_PAYMENTS: 'subscriptionPayments',
  CHECKOUT_SESSIONS: 'checkoutSessions',
  CONTENT_REPORTS: 'contentReports',
  MODERATION_LOG: 'moderationLog',
  PAYOUT_LEDGER: 'payoutLedger',
  EMAIL_OTP_CHALLENGES: OTP_CHALLENGE_COLLECTION,
  EMAIL_OTP_TOKENS: OTP_TOKEN_COLLECTION,
  SUBSCRIPTION_HISTORY: 'subscriptionHistory',
  SYSTEM: 'system',
};

// ============================================================================
// Firebase Configuration
// ============================================================================

export const FLUTTERWAVE_SECRET_HASH = process.env.FLUTTERWAVE_SECRET_HASH || '';
export const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || '';
export const UPLOAD_BUCKET_NAME = process.env.UPLOAD_BUCKET_NAME || '';
