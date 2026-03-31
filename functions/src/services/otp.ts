/**
 * OTP service - Email OTP generation, verification, and password reset
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {
  OTP_CHALLENGE_COLLECTION,
  OTP_TOKEN_COLLECTION,
  OTP_EXPIRY_MS,
  OTP_TOKEN_EXPIRY_MS,
  OTP_RESEND_INTERVAL_MS,
  OTP_MAX_ATTEMPTS,
} from '../types';
import { getDb, serverTimestamp, timestampFromMs, userExistsInAuth } from '../utils/firebase';
import { normalizeEmail, isValidEmail, validateEmail } from '../utils/validation';
import { generateOtpCode, hashOtp, challengeDocId, generateVerificationToken } from '../utils/crypto';

/**
 * Sends an OTP code to the user's email
 */
export async function sendEmailOtp(email: string, purpose: 'signup' | 'password_reset'): Promise<{
  ok: boolean;
  expiresInSeconds: number;
  resendInSeconds: number;
}> {
  const db = getDb();
  const emailLower = normalizeEmail(email);

  validateEmail(emailLower);

  // Verify email exists or doesn't exist based on purpose
  if (purpose === 'signup') {
    const exists = await userExistsInAuth(emailLower);
    if (exists) {
      throw new functions.https.HttpsError('already-exists', 'Email is already registered');
    }
  }

  if (purpose === 'password_reset') {
    const exists = await userExistsInAuth(emailLower);
    if (!exists) {
      throw new functions.https.HttpsError('not-found', 'No account found for this email');
    }
  }

  // Check resend rate limit
  const challengeRef = db
    .collection(OTP_CHALLENGE_COLLECTION)
    .doc(challengeDocId(purpose, emailLower));
  const challengeSnap = await challengeRef.get();
  const nowMs = Date.now();

  if (challengeSnap.exists) {
    const existing = challengeSnap.data() as Record<string, any>;
    const resendAfterMs = existing?.resendAfter?.toMillis?.() || 0;
    if (resendAfterMs > nowMs) {
      const waitSeconds = Math.max(1, Math.ceil((resendAfterMs - nowMs) / 1000));
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Please wait ${waitSeconds}s before requesting another code`
      );
    }
  }

  // Generate OTP
  const code = generateOtpCode();
  const expiresAt = timestampFromMs(nowMs + OTP_EXPIRY_MS);
  const resendAfter = timestampFromMs(nowMs + OTP_RESEND_INTERVAL_MS);

  await challengeRef.set(
    {
      purpose,
      email: emailLower,
      codeHash: hashOtp(code),
      attempts: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt,
      resendAfter,
      consumedAt: null,
    },
    { merge: true }
  );

  // Queue email (handled by buildMailQueuePayload in queueing service)
  // Return info to client
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
): Promise<{
  ok: boolean;
  verificationToken: string;
  expiresInSeconds: number;
}> {
  const db = getDb();
  const emailLower = normalizeEmail(email);

  validateEmail(emailLower);

  if (!/^\d{6}$/.test(code)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid verification code input');
  }

  const challengeRef = db
    .collection(OTP_CHALLENGE_COLLECTION)
    .doc(challengeDocId(purpose, emailLower));
  const challengeSnap = await challengeRef.get();

  if (!challengeSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Verification code not found');
  }

  const challenge = challengeSnap.data() as Record<string, any>;
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

  if (attempts >= OTP_MAX_ATTEMPTS) {
    throw new functions.https.HttpsError('resource-exhausted', 'Too many invalid attempts');
  }

  if (hashOtp(code) !== String(challenge?.codeHash || '')) {
    await challengeRef.set(
      {
        attempts: attempts + 1,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    throw new functions.https.HttpsError('permission-denied', 'Invalid verification code');
  }

  // Generate verification token
  const verificationToken = generateVerificationToken();
  await db.collection(OTP_TOKEN_COLLECTION).doc(verificationToken).set({
    purpose,
    email: emailLower,
    createdAt: serverTimestamp(),
    expiresAt: timestampFromMs(nowMs + OTP_TOKEN_EXPIRY_MS),
    usedAt: null,
  });

  // Mark challenge as consumed
  await challengeRef.set(
    {
      consumedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

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
  const db = getDb();
  const emailLower = normalizeEmail(email);

  validateEmail(emailLower);

  if (verificationToken.length < 32 || newPassword.length < 6) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid reset password payload'
    );
  }

  const tokenRef = db.collection(OTP_TOKEN_COLLECTION).doc(verificationToken);
  const tokenSnap = await tokenRef.get();

  if (!tokenSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Reset session not found');
  }

  const tokenData = tokenSnap.data() as Record<string, any>;
  const tokenPurpose = String(tokenData?.purpose || '');
  const tokenEmail = normalizeEmail(String(tokenData?.email || ''));
  const usedAtMs = tokenData?.usedAt?.toMillis?.() || 0;
  const expiresAtMs = tokenData?.expiresAt?.toMillis?.() || 0;
  const nowMs = Date.now();

  if (tokenPurpose !== 'password_reset' || tokenEmail !== emailLower) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Reset session does not match this email'
    );
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
  await tokenRef.set(
    {
      usedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true };
}
