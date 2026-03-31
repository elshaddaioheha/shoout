/**
 * Shared type definitions across all layers
 */

// ============================================================================
// Admin & Authorization
// ============================================================================

export type AdminRole = 'admin' | 'moderator' | 'auditor';

// ============================================================================
// Subscription & Billing
// ============================================================================

export type SubscriptionBillingCycle = 'monthly' | 'annual';

export type SubscriptionPlan = 'vault' | 'vault_pro' | 'studio' | 'hybrid';

// ============================================================================
// Checkout & Shopping
// ============================================================================

export type CheckoutItem = {
  id: string;
  title: string;
  artist: string;
  price: number; // USD
  uploaderId: string;
  audioUrl?: string;
  coverUrl?: string;
};

export type CreateCheckoutSessionData = {
  items: CheckoutItem[];
  totalAmountUsd: number;
};

export type GetCheckoutStatusData = {
  txRef: string;
};

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
 * Canonical USD list prices; Flutterwave charges Math.round(usd * NAIRA_RATE) in NGN.
 */
export const SUBSCRIPTION_PLAN_PRICING_USD: Record<string, { monthly: number; annualTotal: number }> = {
  vault: { monthly: 0, annualTotal: 0 },
  vault_pro: { monthly: 13962 / NAIRA_RATE, annualTotal: (13962 * 12) / NAIRA_RATE },
  studio: { monthly: 27000 / NAIRA_RATE, annualTotal: (22950 * 12) / NAIRA_RATE },
  hybrid: { monthly: 34906 / NAIRA_RATE, annualTotal: (29670 * 12) / NAIRA_RATE },
};

/**
 * License add-on SKUs must match `app/listing/[id].tsx` LICENSE_OPTIONS (USD).
 */
export const LICENSE_USD_PRICES: Record<string, number> = {
  mp3_tagged: 4.95,
  wav_2_free: 24.99,
  unlimited_wav_4_free: 32.99,
  unlimited_stems_9_free: 51.99,
};

export const LICENSE_SKUS_ORDERED = Object.keys(LICENSE_USD_PRICES).sort((a, b) => b.length - a.length);

export const CART_TOTAL_EPSILON = 0.02;

export const FREE_SUBSCRIPTION_PLANS = new Set(['vault']);

// ============================================================================
// Storage Limits by Tier (in bytes)
// ============================================================================

export const TIER_STORAGE_LIMITS: Record<SubscriptionPlan, number> = {
  vault: 0.5 * 1024 * 1024 * 1024, // 500MB
  vault_pro: 1 * 1024 * 1024 * 1024, // 1GB
  studio: 2 * 1024 * 1024 * 1024, // 2GB
  hybrid: 10 * 1024 * 1024 * 1024, // 10GB
};

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

// ============================================================================
// Collections
// ============================================================================

export const COLLECTIONS = {
  USERS: 'users',
  UPLOADS: 'uploads',
  PURCHASES: 'purchases',
  TRANSACTIONS: 'transactions',
  SUBSCRIPTION_PAYMENTS: 'subscriptionPayments',
  CHECKOUT_SESSIONS: 'checkoutSessions',
  CONTENT_REPORTS: 'contentReports',
  MODERATION_LOG: 'moderationLog',
  PAYOUT_LEDGER: 'payoutLedger',
  EMAIL_OTP_CHALLENGES: OTP_CHALLENGE_COLLECTION,
  EMAIL_OTP_TOKENS: OTP_TOKEN_COLLECTION,
  SYSTEM: 'system',
};

// ============================================================================
// Firebase Configuration
// ============================================================================

export const FLUTTERWAVE_SECRET_HASH = process.env.FLUTTERWAVE_SECRET_HASH || '';
export const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || '';
export const UPLOAD_BUCKET_NAME = process.env.UPLOAD_BUCKET_NAME || '';
