/**
 * OTP service - Email OTP generation, verification, and password reset
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {
  OTP_EXPIRY_MS,
  OTP_TOKEN_EXPIRY_MS,
  OTP_RESEND_INTERVAL_MS,
  OTP_MAX_ATTEMPTS,
} from '../types';
import { otpRepo, emailRepo, serverTimestamp, timestampFromMs } from '../repositories';
import { normalizeEmail, validateEmail } from '../utils/validation';
import { generateOtpCode, hashOtp, challengeDocId, generateVerificationToken } from '../utils/crypto';

async function userExistsInAuth(email: string): Promise<boolean> {
  try {
    await admin.auth().getUserByEmail(email);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sends an OTP code to the user's email
 */
export async function sendEmailOtp(email: string, purpose: 'signup' | 'password_reset'): Promise<{
  ok: boolean;
  expiresInSeconds: number;
  resendInSeconds: number;
}> {
  const emailLower = normalizeEmail(email);
  validateEmail(emailLower);

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
  const docId = challengeDocId(purpose, emailLower);
  const { exists, data: existing } = await otpRepo.getChallenge(docId);
  const nowMs = Date.now();

  if (exists && existing) {
    const resendAfterMs = (existing as Record<string, any>)?.resendAfter?.toMillis?.() || 0;
    if (resendAfterMs > nowMs) {
      const waitSeconds = Math.max(1, Math.ceil((resendAfterMs - nowMs) / 1000));
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Please wait ${waitSeconds}s before requesting another code`
      );
    }
  }

  const code = generateOtpCode();
  const expiresAt = timestampFromMs(nowMs + OTP_EXPIRY_MS);
  const resendAfter = timestampFromMs(nowMs + OTP_RESEND_INTERVAL_MS);

  await otpRepo.setChallenge(docId, {
    purpose,
    email: emailLower,
    codeHash: hashOtp(code),
    attempts: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt,
    resendAfter,
    consumedAt: null,
  });

  // Queue OTP email
  await emailRepo.queueEmail({
    to: emailLower,
    subject: `Shoouts verification code: ${code}`,
    text: `Your Shoouts verification code is ${code}. It expires in ${Math.floor(OTP_EXPIRY_MS / 60000)} minutes.`,
    html: `<p>Your Shoouts verification code is <strong>${code}</strong>.</p><p>It expires in ${Math.floor(OTP_EXPIRY_MS / 60000)} minutes. If you did not request this, ignore this email.</p>`,
  });

  return {
    ok: true,
    expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
    resendInSeconds: Math.floor(OTP_RESEND_INTERVAL_MS / 1000),
  };
}

/**
 * Verifies an OTP code and returns a verification token
 */
export async function verifyEmailOtp(
  email: string,
  code: string,
  purpose: 'signup' | 'password_reset'
): Promise<{ ok: boolean; verificationToken: string; expiresInSeconds: number }> {
  const emailLower = normalizeEmail(email);
  validateEmail(emailLower);

  if (!/^\d{6}$/.test(code)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid verification code input');
  }

  const docId = challengeDocId(purpose, emailLower);
  const { exists, data: challenge } = await otpRepo.getChallenge(docId);

  if (!exists || !challenge) {
    throw new functions.https.HttpsError('not-found', 'Verification code not found');
  }

  const c = challenge as Record<string, any>;
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
  if (attempts >= OTP_MAX_ATTEMPTS) {
    throw new functions.https.HttpsError('resource-exhausted', 'Too many invalid attempts');
  }

  if (hashOtp(code) !== String(c.codeHash || '')) {
    await otpRepo.setChallenge(docId, {
      attempts: attempts + 1,
      updatedAt: serverTimestamp(),
    });
    throw new functions.https.HttpsError('permission-denied', 'Invalid verification code');
  }

  const verificationToken = generateVerificationToken();
  await otpRepo.setToken(verificationToken, {
    purpose,
    email: emailLower,
    createdAt: serverTimestamp(),
    expiresAt: timestampFromMs(nowMs + OTP_TOKEN_EXPIRY_MS),
    usedAt: null,
  });

  await otpRepo.setChallenge(docId, {
    consumedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    ok: true,
    verificationToken,
    expiresInSeconds: Math.floor(OTP_TOKEN_EXPIRY_MS / 1000),
  };
}

/**
 * Completes password reset using a verification token
 */
export async function completePasswordResetWithOtp(
  email: string,
  verificationToken: string,
  newPassword: string
): Promise<{ ok: boolean }> {
  const emailLower = normalizeEmail(email);
  validateEmail(emailLower);

  if (verificationToken.length < 32 || newPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid reset password payload');
  }

  const { exists, data: tokenData } = await otpRepo.getToken(verificationToken);
  if (!exists || !tokenData) {
    throw new functions.https.HttpsError('not-found', 'Reset session not found');
  }

  const t = tokenData as Record<string, any>;
  const tokenPurpose = String(t.purpose || '');
  const tokenEmail = normalizeEmail(String(t.email || ''));
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

  await otpRepo.mergeToken(verificationToken, { usedAt: serverTimestamp() });

  return { ok: true };
}
