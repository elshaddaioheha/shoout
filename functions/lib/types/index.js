"use strict";
/**
 * Shared type definitions across all layers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_BUCKET_NAME = exports.FLUTTERWAVE_SECRET_KEY = exports.FLUTTERWAVE_SECRET_HASH = exports.COLLECTIONS = exports.SUSPENSION_DURATION_MS = exports.OVERPAYMENT_TOLERANCE_FACTOR = exports.CHECKOUT_SESSION_TTL_MS = exports.INVOICE_PDF_EXPIRY_MS = exports.MAX_FILE_SIZE_BYTES = exports.PLATFORM_FEE_RATE = exports.VAT_RATE = exports.OTP_HASH_SALT = exports.OTP_PURPOSES = exports.OTP_MAX_ATTEMPTS = exports.OTP_RESEND_INTERVAL_MS = exports.OTP_TOKEN_EXPIRY_MS = exports.OTP_EXPIRY_MS = exports.OTP_TOKEN_COLLECTION = exports.OTP_CHALLENGE_COLLECTION = exports.EMAIL_COLLECTION = exports.CART_TOTAL_EPSILON = exports.LICENSE_SKUS_ORDERED = exports.LICENSE_USD_PRICES = exports.NAIRA_RATE = void 0;
// ============================================================================
// Pricing Constants
// ============================================================================
exports.NAIRA_RATE = 1600;
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
exports.LICENSE_USD_PRICES = {
    mp3_tagged: 4.95,
    wav_2_free: 24.99,
    unlimited_wav_4_free: 32.99,
    unlimited_stems_9_free: 51.99,
};
exports.LICENSE_SKUS_ORDERED = ['premium', 'exclusive', ...Object.keys(exports.LICENSE_USD_PRICES)]
    .sort((a, b) => b.length - a.length);
exports.CART_TOTAL_EPSILON = 0.02;
// Free plans have moved to subscriptions/catalog.ts (FREE_PLANS)
// ============================================================================
// Storage Limits by Tier (in bytes)
// ============================================================================
// Storage limits have moved to subscriptions/catalog.ts (PLAN_QUOTAS)
// ============================================================================
// OTP Configuration
// ============================================================================
exports.EMAIL_COLLECTION = process.env.FIREBASE_TRIGGER_EMAIL_COLLECTION || 'mail';
exports.OTP_CHALLENGE_COLLECTION = 'emailOtpChallenges';
exports.OTP_TOKEN_COLLECTION = 'emailOtpTokens';
exports.OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
exports.OTP_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
exports.OTP_RESEND_INTERVAL_MS = 60 * 1000; // 1 minute
exports.OTP_MAX_ATTEMPTS = 5;
exports.OTP_PURPOSES = new Set(['signup', 'password_reset']);
exports.OTP_HASH_SALT = process.env.OTP_HASH_SALT || 'shoouts-otp';
// ============================================================================
// Invoice Configuration
// ============================================================================
exports.VAT_RATE = 0.075; // 7.5%
exports.PLATFORM_FEE_RATE = 0.1; // 10%
exports.MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
exports.INVOICE_PDF_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
exports.CHECKOUT_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
exports.OVERPAYMENT_TOLERANCE_FACTOR = 1.05; // reject payments > 5% above expected (FX rounding tolerance)
exports.SUSPENSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days default
// ============================================================================
// Collections
// ============================================================================
exports.COLLECTIONS = {
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
    EMAIL_OTP_CHALLENGES: exports.OTP_CHALLENGE_COLLECTION,
    EMAIL_OTP_TOKENS: exports.OTP_TOKEN_COLLECTION,
    SUBSCRIPTION_HISTORY: 'subscriptionHistory',
    SYSTEM: 'system',
};
// ============================================================================
// Firebase Configuration
// ============================================================================
exports.FLUTTERWAVE_SECRET_HASH = process.env.FLUTTERWAVE_SECRET_HASH || '';
exports.FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || '';
exports.UPLOAD_BUCKET_NAME = process.env.UPLOAD_BUCKET_NAME || '';
