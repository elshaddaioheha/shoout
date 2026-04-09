"use strict";
/**
 * OTP service - Email OTP generation, verification, and password reset
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
exports.sendEmailOtp = sendEmailOtp;
exports.verifyEmailOtp = verifyEmailOtp;
exports.completePasswordResetWithOtp = completePasswordResetWithOtp;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const types_1 = require("../types");
const repositories_1 = require("../repositories");
const validation_1 = require("../utils/validation");
const crypto_1 = require("../utils/crypto");
async function userExistsInAuth(email) {
    try {
        await admin.auth().getUserByEmail(email);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Sends an OTP code to the user's email
 */
async function sendEmailOtp(email, purpose) {
    const emailLower = (0, validation_1.normalizeEmail)(email);
    (0, validation_1.validateEmail)(emailLower);
    if (purpose === 'signup') {
        if (await userExistsInAuth(emailLower)) {
            throw new functions.https.HttpsError('already-exists', 'Email is already registered');
        }
    }
    if (purpose === 'password_reset') {
        if (!(await userExistsInAuth(emailLower))) {
            throw new functions.https.HttpsError('not-found', 'No account found for this email');
        }
    }
    // Check resend rate limit
    const docId = (0, crypto_1.challengeDocId)(purpose, emailLower);
    const { exists, data: existing } = await repositories_1.otpRepo.getChallenge(docId);
    const nowMs = Date.now();
    if (exists && existing) {
        const resendAfterMs = existing?.resendAfter?.toMillis?.() || 0;
        if (resendAfterMs > nowMs) {
            const waitSeconds = Math.max(1, Math.ceil((resendAfterMs - nowMs) / 1000));
            throw new functions.https.HttpsError('resource-exhausted', `Please wait ${waitSeconds}s before requesting another code`);
        }
    }
    const code = (0, crypto_1.generateOtpCode)();
    const expiresAt = (0, repositories_1.timestampFromMs)(nowMs + types_1.OTP_EXPIRY_MS);
    const resendAfter = (0, repositories_1.timestampFromMs)(nowMs + types_1.OTP_RESEND_INTERVAL_MS);
    await repositories_1.otpRepo.setChallenge(docId, {
        purpose,
        email: emailLower,
        codeHash: (0, crypto_1.hashOtp)(code),
        attempts: 0,
        createdAt: (0, repositories_1.serverTimestamp)(),
        updatedAt: (0, repositories_1.serverTimestamp)(),
        expiresAt,
        resendAfter,
        consumedAt: null,
    });
    // Queue OTP email
    await repositories_1.emailRepo.queueEmail({
        to: emailLower,
        subject: `Shoouts verification code: ${code}`,
        text: `Your Shoouts verification code is ${code}. It expires in ${Math.floor(types_1.OTP_EXPIRY_MS / 60000)} minutes.`,
        html: `<p>Your Shoouts verification code is <strong>${code}</strong>.</p><p>It expires in ${Math.floor(types_1.OTP_EXPIRY_MS / 60000)} minutes. If you did not request this, ignore this email.</p>`,
    });
    return {
        ok: true,
        expiresInSeconds: Math.floor(types_1.OTP_EXPIRY_MS / 1000),
        resendInSeconds: Math.floor(types_1.OTP_RESEND_INTERVAL_MS / 1000),
    };
}
/**
 * Verifies an OTP code and returns a verification token
 */
async function verifyEmailOtp(email, code, purpose) {
    const emailLower = (0, validation_1.normalizeEmail)(email);
    (0, validation_1.validateEmail)(emailLower);
    if (!/^\d{6}$/.test(code)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid verification code input');
    }
    const docId = (0, crypto_1.challengeDocId)(purpose, emailLower);
    const { exists, data: challenge } = await repositories_1.otpRepo.getChallenge(docId);
    if (!exists || !challenge) {
        throw new functions.https.HttpsError('not-found', 'Verification code not found');
    }
    const c = challenge;
    const nowMs = Date.now();
    const expiresAtMs = c.expiresAt?.toMillis?.() || 0;
    const consumedAtMs = c.consumedAt?.toMillis?.() || 0;
    const attempts = Number(c.attempts || 0);
    if (consumedAtMs > 0) {
        throw new functions.https.HttpsError('failed-precondition', 'Verification code already used');
    }
    if (expiresAtMs <= nowMs) {
        throw new functions.https.HttpsError('deadline-exceeded', 'Verification code expired');
    }
    if (attempts >= types_1.OTP_MAX_ATTEMPTS) {
        throw new functions.https.HttpsError('resource-exhausted', 'Too many invalid attempts');
    }
    if ((0, crypto_1.hashOtp)(code) !== String(c.codeHash || '')) {
        await repositories_1.otpRepo.setChallenge(docId, {
            attempts: attempts + 1,
            updatedAt: (0, repositories_1.serverTimestamp)(),
        });
        throw new functions.https.HttpsError('permission-denied', 'Invalid verification code');
    }
    const verificationToken = (0, crypto_1.generateVerificationToken)();
    await repositories_1.otpRepo.setToken(verificationToken, {
        purpose,
        email: emailLower,
        createdAt: (0, repositories_1.serverTimestamp)(),
        expiresAt: (0, repositories_1.timestampFromMs)(nowMs + types_1.OTP_TOKEN_EXPIRY_MS),
        usedAt: null,
    });
    await repositories_1.otpRepo.setChallenge(docId, {
        consumedAt: (0, repositories_1.serverTimestamp)(),
        updatedAt: (0, repositories_1.serverTimestamp)(),
    });
    return {
        ok: true,
        verificationToken,
        expiresInSeconds: Math.floor(types_1.OTP_TOKEN_EXPIRY_MS / 1000),
    };
}
/**
 * Completes password reset using a verification token
 */
async function completePasswordResetWithOtp(email, verificationToken, newPassword) {
    const emailLower = (0, validation_1.normalizeEmail)(email);
    (0, validation_1.validateEmail)(emailLower);
    if (verificationToken.length < 32 || newPassword.length < 6) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid reset password payload');
    }
    const { exists, data: tokenData } = await repositories_1.otpRepo.getToken(verificationToken);
    if (!exists || !tokenData) {
        throw new functions.https.HttpsError('not-found', 'Reset session not found');
    }
    const t = tokenData;
    const tokenPurpose = String(t.purpose || '');
    const tokenEmail = (0, validation_1.normalizeEmail)(String(t.email || ''));
    const usedAtMs = t.usedAt?.toMillis?.() || 0;
    const expiresAtMs = t.expiresAt?.toMillis?.() || 0;
    const nowMs = Date.now();
    if (tokenPurpose !== 'password_reset' || tokenEmail !== emailLower) {
        throw new functions.https.HttpsError('permission-denied', 'Reset session does not match this email');
    }
    if (usedAtMs > 0 || expiresAtMs <= nowMs) {
        throw new functions.https.HttpsError('deadline-exceeded', 'Reset session expired');
    }
    const userRecord = await admin.auth().getUserByEmail(emailLower).catch(() => null);
    if (!userRecord) {
        throw new functions.https.HttpsError('not-found', 'No account found for this email');
    }
    await admin.auth().updateUser(userRecord.uid, { password: newPassword });
    await repositories_1.otpRepo.mergeToken(verificationToken, { usedAt: (0, repositories_1.serverTimestamp)() });
    return { ok: true };
}
