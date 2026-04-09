"use strict";
/**
 * Validation utilities - input validation and sanitization
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
exports.normalizeEmail = normalizeEmail;
exports.isValidEmail = isValidEmail;
exports.isValidOtpCode = isValidOtpCode;
exports.isValidOtpPurpose = isValidOtpPurpose;
exports.isValidPlanId = isValidPlanId;
exports.isValidLicenseSku = isValidLicenseSku;
exports.isValidFileSize = isValidFileSize;
exports.isValidCheckoutItem = isValidCheckoutItem;
exports.isValidCheckoutItems = isValidCheckoutItems;
exports.isValidCartTotal = isValidCartTotal;
exports.isValidPassword = isValidPassword;
exports.isValidExchangeRate = isValidExchangeRate;
exports.validateEmail = validateEmail;
exports.validateOtpCode = validateOtpCode;
exports.validateOtpPurpose = validateOtpPurpose;
exports.validatePlanId = validatePlanId;
exports.validateFileSize = validateFileSize;
exports.validatePassword = validatePassword;
const functions = __importStar(require("firebase-functions"));
const types_1 = require("../types");
/**
 * Normalizes an email to lowercase and trims whitespace
 */
function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}
/**
 * Validates email format using simple regex
 */
function isValidEmail(email) {
    return /^\S+@\S+\.\S+$/.test(email);
}
/**
 * Validates OTP code format (must be 6 digits)
 */
function isValidOtpCode(code) {
    return /^\d{6}$/.test(code);
}
/**
 * Validates OTP purpose
 */
function isValidOtpPurpose(purpose) {
    return types_1.OTP_PURPOSES.has(purpose.toLowerCase());
}
/**
 * Validates plan ID exists in known plans
 */
function isValidPlanId(planId) {
    const validPlans = ['shoout', 'vault', 'vault_pro', 'studio', 'hybrid'];
    return validPlans.includes(planId);
}
/**
 * Validates license SKU exists
 */
function isValidLicenseSku(sku) {
    return sku in types_1.LICENSE_USD_PRICES;
}
/**
 * Validates file size is within acceptable range
 */
function isValidFileSize(fileSizeBytes) {
    if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
        return false;
    }
    return fileSizeBytes <= types_1.MAX_FILE_SIZE_BYTES;
}
/**
 * Validates a checkout item structure
 */
function isValidCheckoutItem(item) {
    if (!item || typeof item !== 'object')
        return false;
    if (!item.id || !item.title || !item.artist)
        return false;
    if (typeof item.price !== 'number' || item.price < 0)
        return false;
    if (!item.uploaderId)
        return false;
    return true;
}
/**
 * Validates an array of checkout items
 */
function isValidCheckoutItems(items) {
    if (!Array.isArray(items) || items.length === 0)
        return false;
    return items.every(isValidCheckoutItem);
}
/**
 * Validates cart total USD amount
 */
function isValidCartTotal(totalUsd) {
    return Number.isFinite(totalUsd) && totalUsd > 0;
}
/**
 * Validates password meets minimum requirements
 */
function isValidPassword(password) {
    return String(password || '').length >= 6;
}
/**
 * Validates conversion rate (exchange) is reasonable
 */
function isValidExchangeRate(rate) {
    return Number.isFinite(rate) && rate > 0 && rate < 10000; // Sanity check
}
/**
 * Throws HttpsError if validation fails
 */
function validateEmail(email) {
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid email address');
    }
}
function validateOtpCode(code) {
    if (!isValidOtpCode(code)) {
        throw new functions.https.HttpsError('invalid-argument', 'Code must be 6 digits');
    }
}
function validateOtpPurpose(purpose) {
    if (!isValidOtpPurpose(purpose)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid OTP purpose');
    }
}
function validatePlanId(planId) {
    if (!isValidPlanId(planId)) {
        throw new functions.https.HttpsError('invalid-argument', `Unsupported plan: ${planId}`);
    }
}
function validateFileSize(fileSizeBytes) {
    if (!isValidFileSize(fileSizeBytes)) {
        throw new functions.https.HttpsError('invalid-argument', `File size must be between 1 byte and ${types_1.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
    }
}
function validatePassword(password) {
    if (!isValidPassword(password)) {
        throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters');
    }
}
