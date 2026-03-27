import { app } from '@/firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';

export type EmailOtpPurpose = 'signup' | 'password_reset';

type SendOtpRequest = {
  purpose: EmailOtpPurpose;
  email: string;
};

type VerifyOtpRequest = {
  purpose: EmailOtpPurpose;
  email: string;
  code: string;
};

type CompletePasswordResetRequest = {
  email: string;
  verificationToken: string;
  newPassword: string;
};

type SendOtpResponse = {
  ok: boolean;
  expiresInSeconds: number;
  resendInSeconds: number;
};

type VerifyOtpResponse = {
  ok: boolean;
  verificationToken: string;
  expiresInSeconds: number;
};

type CompletePasswordResetResponse = {
  ok: boolean;
};

const functions = getFunctions(app);
const sendEmailOtpFn = httpsCallable<SendOtpRequest, SendOtpResponse>(functions, 'sendEmailOtp');
const verifyEmailOtpFn = httpsCallable<VerifyOtpRequest, VerifyOtpResponse>(functions, 'verifyEmailOtp');
const completePasswordResetWithOtpFn = httpsCallable<CompletePasswordResetRequest, CompletePasswordResetResponse>(
  functions,
  'completePasswordResetWithOtp'
);

export async function sendEmailOtp(purpose: EmailOtpPurpose, email: string): Promise<SendOtpResponse> {
  const result = await sendEmailOtpFn({ purpose, email });
  return result.data;
}

export async function verifyEmailOtp(
  purpose: EmailOtpPurpose,
  email: string,
  code: string
): Promise<VerifyOtpResponse> {
  const result = await verifyEmailOtpFn({ purpose, email, code });
  return result.data;
}

export async function completePasswordResetWithOtp(
  email: string,
  verificationToken: string,
  newPassword: string
): Promise<CompletePasswordResetResponse> {
  const result = await completePasswordResetWithOtpFn({ email, verificationToken, newPassword });
  return result.data;
}
