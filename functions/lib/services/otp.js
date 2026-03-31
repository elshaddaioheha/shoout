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
const firebase_1 = require("../utils/firebase");
const validation_1 = require("../utils/validation");
const crypto_1 = require("../utils/crypto");
/**
 * Sends an OTP code to the user's email
 */
async function sendEmailOtp(email, purpose) {
    const db = (0, firebase_1.getDb)();
    const emailLower = (0, validation_1.normalizeEmail)(email);
    (0, validation_1.validateEmail)(emailLower);
    // Verify email exists or doesn't exist based on purpose
    if (purpose === 'signup') {
        const exists = await (0, firebase_1.userExistsInAuth)(emailLower);
        if (exists) {
            throw new functions.https.HttpsError('already-exists', 'Email is already registered');
        }
    }
    if (purpose === 'password_reset') {
        const exists = await (0, firebase_1.userExistsInAuth)(emailLower);
        if (!exists) {
            throw new functions.https.HttpsError('not-found', 'No account found for this email');
        }
    }
    // Check resend rate limit
    const challengeRef = db
        .collection(types_1.OTP_CHALLENGE_COLLECTION)
        .doc((0, crypto_1.challengeDocId)(purpose, emailLower));
    const challengeSnap = await challengeRef.get();
    const nowMs = Date.now();
    if (challengeSnap.exists) {
        const existing = challengeSnap.data();
        const resendAfterMs = existing?.resendAfter?.toMillis?.() || 0;
        if (resendAfterMs > nowMs) {
            const waitSeconds = Math.max(1, Math.ceil((resendAfterMs - nowMs) / 1000));
            throw new functions.https.HttpsError('resource-exhausted', `Please wait ${waitSeconds}s before requesting another code`);
        }
    }
    // Generate OTP
    const code = (0, crypto_1.generateOtpCode)();
    const expiresAt = (0, firebase_1.timestampFromMs)(nowMs + types_1.OTP_EXPIRY_MS);
    const resendAfter = (0, firebase_1.timestampFromMs)(nowMs + types_1.OTP_RESEND_INTERVAL_MS);
    await challengeRef.set({
        purpose,
        email: emailLower,
        codeHash: (0, crypto_1.hashOtp)(code),
        attempts: 0,
        createdAt: (0, firebase_1.serverTimestamp)(),
        updatedAt: (0, firebase_1.serverTimestamp)(),
        expiresAt,
        resendAfter,
        consumedAt: null,
    }, { merge: true });
    // Queue email (handled by buildMailQueuePayload in queueing service)
    // Return info to client
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
    const db = (0, firebase_1.getDb)();
    const emailLower = (0, validation_1.normalizeEmail)(email);
    (0, validation_1.validateEmail)(emailLower);
    if (!/^\d{6}$/.test(code)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid verification code input');
    }
    const challengeRef = db
        .collection(types_1.OTP_CHALLENGE_COLLECTION)
        .doc((0, crypto_1.challengeDocId)(purpose, emailLower));
    const challengeSnap = await challengeRef.get();
    if (!challengeSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Verification code not found');
    }
    const challenge = challengeSnap.data();
    const nowMs = Date.now();
    const expiresAtMs = challenge?.expiresAt?.toMillis?.() || 0;
    const consumedAtMs = challenge?.consumedAt?.toMillis?.() || 0;
    const attempts = Number(challenge?.attempts || 0);
    if (consumedAtMs > 0) {
        throw new functions.https.HttpsError('failed-precondition', 'Verification code already used');
    }
    if (expiresAtMs <= nowMs) {
        throw new functions.https.HttpsError('deadline-exceeded', 'Verification code expired');
    }
    if (attempts >= types_1.OTP_MAX_ATTEMPTS) {
        throw new functions.https.HttpsError('resource-exhausted', 'Too many invalid attempts');
    }
    if ((0, crypto_1.hashOtp)(code) !== String(challenge?.codeHash || '')) {
        await challengeRef.set({
            attempts: attempts + 1,
            updatedAt: (0, firebase_1.serverTimestamp)(),
        }, { merge: true });
        throw new functions.https.HttpsError('permission-denied', 'Invalid verification code');
    }
    // Generate verification token
    const verificationToken = (0, crypto_1.generateVerificationToken)();
    await db.collection(types_1.OTP_TOKEN_COLLECTION).doc(verificationToken).set({
        purpose,
        email: emailLower,
        createdAt: (0, firebase_1.serverTimestamp)(),
        expiresAt: (0, firebase_1.timestampFromMs)(nowMs + types_1.OTP_TOKEN_EXPIRY_MS),
        usedAt: null,
    });
    // Mark challenge as consumed
    await challengeRef.set({
        consumedAt: (0, firebase_1.serverTimestamp)(),
        updatedAt: (0, firebase_1.serverTimestamp)(),
    }, { merge: true });
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
    const db = (0, firebase_1.getDb)();
    const emailLower = (0, validation_1.normalizeEmail)(email);
    (0, validation_1.validateEmail)(emailLower);
    if (verificationToken.length < 32 || newPassword.length < 6) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid reset password payload');
    }
    const tokenRef = db.collection(types_1.OTP_TOKEN_COLLECTION).doc(verificationToken);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Reset session not found');
    }
    const tokenData = tokenSnap.data();
    const tokenPurpose = String(tokenData?.purpose || '');
    const tokenEmail = (0, validation_1.normalizeEmail)(String(tokenData?.email || ''));
    const usedAtMs = tokenData?.usedAt?.toMillis?.() || 0;
    const expiresAtMs = tokenData?.expiresAt?.toMillis?.() || 0;
    const nowMs = Date.now();
    if (tokenPurpose !== 'password_reset' || tokenEmail !== emailLower) {
        throw new functions.https.HttpsError('permission-denied', 'Reset session does not match this email');
    }
    if (usedAtMs > 0 || expiresAtMs <= nowMs) {
        throw new functions.https.HttpsError('deadline-exceeded', 'Reset session expired');
    }
    // Update password in Firebase Auth
    const userRecord = await require('firebase-admin')
        .auth()
        .getUserByEmail(emailLower)
        .catch(() => null);
    if (!userRecord) {
        throw new functions.https.HttpsError('not-found', 'No account found for this email');
    }
    await admin.auth().updateUser(userRecord.uid, { password: newPassword });
    // Mark token as used
    await tokenRef.set({
        usedAt: (0, firebase_1.serverTimestamp)(),
    }, { merge: true });
    return { ok: true };
}
