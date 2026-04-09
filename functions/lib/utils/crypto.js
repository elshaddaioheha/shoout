"use strict";
/**
 * Cryptographic utilities - hashing, encoding, random generation
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
exports.generateOtpCode = generateOtpCode;
exports.hashOtp = hashOtp;
exports.challengeDocId = challengeDocId;
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.generateVerificationToken = generateVerificationToken;
const crypto = __importStar(require("crypto"));
const types_1 = require("../types");
/**
 * Generates a random 6-digit OTP code
 */
function generateOtpCode() {
    return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}
/**
 * Hashes an OTP code using SHA256 with salt
 */
function hashOtp(code) {
    return crypto
        .createHash('sha256')
        .update(`${types_1.OTP_HASH_SALT}:${code}`)
        .digest('hex');
}
/**
 * Creates a challenge document ID as SHA256 hash of "purpose:email"
 */
function challengeDocId(purpose, emailLower) {
    return crypto
        .createHash('sha256')
        .update(`${purpose}:${emailLower}`)
        .digest('hex')
        .slice(0, 40);
}
/**
 * Verifies a webhook signature using HMAC SHA256
 */
function verifyWebhookSignature(rawBody, signature, secret) {
    if (!secret) {
        // Fail loudly — misconfigured secret should never silently reject all webhooks
        throw new Error('FLUTTERWAVE_SECRET_HASH is not configured. All webhooks will be rejected.');
    }
    if (!signature)
        return false;
    const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (hash.length !== signature.length)
        return false;
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}
/**
 * Generates a random verification token
 */
function generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
}
