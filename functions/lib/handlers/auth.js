"use strict";
/**
 * Authentication handlers - OTP-based signup and password reset
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
exports.completePasswordResetWithOtp = exports.verifyEmailOtp = exports.sendEmailOtp = void 0;
const functions = __importStar(require("firebase-functions"));
const otp = __importStar(require("../services/otp"));
/**
 * sendEmailOtp - Sends OTP code to user's email
 */
exports.sendEmailOtp = functions.https.onCall(async (data) => {
    const purpose = String(data?.purpose || '').trim().toLowerCase();
    const email = String(data?.email || '').trim();
    if (purpose !== 'signup' && purpose !== 'password_reset') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid OTP purpose');
    }
    const result = await otp.sendEmailOtp(email, purpose);
    return result;
});
/**
 * verifyEmailOtp - Verifies OTP code and returns verification token
 */
exports.verifyEmailOtp = functions.https.onCall(async (data) => {
    const purpose = String(data?.purpose || '').trim().toLowerCase();
    const email = String(data?.email || '').trim();
    const code = String(data?.code || '').trim();
    if (purpose !== 'signup' && purpose !== 'password_reset') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid OTP purpose');
    }
    const result = await otp.verifyEmailOtp(email, code, purpose);
    return result;
});
/**
 * completePasswordResetWithOtp - Resets user password using verified OTP token
 */
exports.completePasswordResetWithOtp = functions.https.onCall(async (data) => {
    const email = String(data?.email || '').trim();
    const verificationToken = String(data?.verificationToken || '').trim();
    const newPassword = String(data?.newPassword || '');
    const result = await otp.completePasswordResetWithOtp(email, verificationToken, newPassword);
    return result;
});
