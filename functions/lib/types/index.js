"use strict";
/**
 * Shared type definitions across all layers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_BUCKET_NAME = exports.FLUTTERWAVE_SECRET_KEY = exports.FLUTTERWAVE_SECRET_HASH = exports.COLLECTIONS = exports.INVOICE_PDF_EXPIRY_MS = exports.MAX_FILE_SIZE_BYTES = exports.PLATFORM_FEE_RATE = exports.VAT_RATE = exports.OTP_HASH_SALT = exports.OTP_PURPOSES = exports.OTP_MAX_ATTEMPTS = exports.OTP_RESEND_INTERVAL_MS = exports.OTP_TOKEN_EXPIRY_MS = exports.OTP_EXPIRY_MS = exports.OTP_TOKEN_COLLECTION = exports.OTP_CHALLENGE_COLLECTION = exports.EMAIL_COLLECTION = exports.TIER_STORAGE_LIMITS = exports.FREE_SUBSCRIPTION_PLANS = exports.CART_TOTAL_EPSILON = exports.LICENSE_SKUS_ORDERED = exports.LICENSE_USD_PRICES = exports.SUBSCRIPTION_PLAN_PRICING_USD = exports.NAIRA_RATE = void 0;
// ============================================================================
// Pricing Constants
// ============================================================================
exports.NAIRA_RATE = 1600;
/**
 * Canonical USD list prices; Flutterwave charges Math.round(usd * NAIRA_RATE) in NGN.
 */
exports.SUBSCRIPTION_PLAN_PRICING_USD = {
    vault: { monthly: 0, annualTotal: 0 },
    vault_pro: { monthly: 13962 / exports.NAIRA_RATE, annualTotal: (13962 * 12) / exports.NAIRA_RATE },
    studio: { monthly: 27000 / exports.NAIRA_RATE, annualTotal: (22950 * 12) / exports.NAIRA_RATE },
    hybrid: { monthly: 34906 / exports.NAIRA_RATE, annualTotal: (29670 * 12) / exports.NAIRA_RATE },
};
/**
 * License add-on SKUs must match `app/listing/[id].tsx` LICENSE_OPTIONS (USD).
 */
exports.LICENSE_USD_PRICES = {
    mp3_tagged: 4.95,
    wav_2_free: 24.99,
    unlimited_wav_4_free: 32.99,
    unlimited_stems_9_free: 51.99,
};
exports.LICENSE_SKUS_ORDERED = Object.keys(exports.LICENSE_USD_PRICES).sort((a, b) => b.length - a.length);
exports.CART_TOTAL_EPSILON = 0.02;
exports.FREE_SUBSCRIPTION_PLANS = new Set(['vault']);
// ============================================================================
// Storage Limits by Tier (in bytes)
// ============================================================================
exports.TIER_STORAGE_LIMITS = {
    vault: 0.5 * 1024 * 1024 * 1024, // 500MB
    vault_pro: 1 * 1024 * 1024 * 1024, // 1GB
    studio: 2 * 1024 * 1024 * 1024, // 2GB
    hybrid: 10 * 1024 * 1024 * 1024, // 10GB
};
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
// ============================================================================
// Collections
// ============================================================================
exports.COLLECTIONS = {
    USERS: 'users',
    UPLOADS: 'uploads',
    PURCHASES: 'purchases',
    TRANSACTIONS: 'transactions',
    SUBSCRIPTION_PAYMENTS: 'subscriptionPayments',
    CHECKOUT_SESSIONS: 'checkoutSessions',
    CONTENT_REPORTS: 'contentReports',
    MODERATION_LOG: 'moderationLog',
    PAYOUT_LEDGER: 'payoutLedger',
    EMAIL_OTP_CHALLENGES: exports.OTP_CHALLENGE_COLLECTION,
    EMAIL_OTP_TOKENS: exports.OTP_TOKEN_COLLECTION,
    SYSTEM: 'system',
};
// ============================================================================
// Firebase Configuration
// ============================================================================
exports.FLUTTERWAVE_SECRET_HASH = process.env.FLUTTERWAVE_SECRET_HASH || '';
exports.FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || '';
exports.UPLOAD_BUCKET_NAME = process.env.UPLOAD_BUCKET_NAME || '';
