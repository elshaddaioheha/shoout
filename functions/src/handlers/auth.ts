/**
 * Authentication handlers - OTP-based signup and password reset
 */

import * as functions from 'firebase-functions';
import * as otp from '../services/otp';

/**
 * sendEmailOtp - Sends OTP code to user's email
 */
export const sendEmailOtp = functions.https.onCall(async (data: any) => {
  const purpose = String(data?.purpose || '').trim().toLowerCase();
  const email = String(data?.email || '').trim();

  if (purpose !== 'signup' && purpose !== 'password_reset') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid OTP purpose');
  }

  const result = await otp.sendEmailOtp(email, purpose as 'signup' | 'password_reset');
  return result;
});

/**
 * verifyEmailOtp - Verifies OTP code and returns verification token
 */
export const verifyEmailOtp = functions.https.onCall(async (data: any) => {
  const purpose = String(data?.purpose || '').trim().toLowerCase();
  const email = String(data?.email || '').trim();
  const code = String(data?.code || '').trim();

  if (purpose !== 'signup' && purpose !== 'password_reset') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid OTP purpose');
  }

  const result = await otp.verifyEmailOtp(email, code, purpose as 'signup' | 'password_reset');
  return result;
});

/**
 * completePasswordResetWithOtp - Resets user password using verified OTP token
 */
export const completePasswordResetWithOtp = functions.https.onCall(async (data: any) => {
  const email = String(data?.email || '').trim();
  const verificationToken = String(data?.verificationToken || '').trim();
  const newPassword = String(data?.newPassword || '');

  const result = await otp.completePasswordResetWithOtp(email, verificationToken, newPassword);
  return result;
});
