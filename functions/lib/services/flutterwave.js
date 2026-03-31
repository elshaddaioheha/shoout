"use strict";
/**
 * Flutterwave service - Payment verification and transaction handling
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
exports.verifyFlutterwaveTransaction = verifyFlutterwaveTransaction;
exports.validateWebhookSignature = validateWebhookSignature;
exports.processChargeCompletedEvent = processChargeCompletedEvent;
exports.validatePaymentAmount = validatePaymentAmount;
const functions = __importStar(require("firebase-functions"));
const firebase_1 = require("../utils/firebase");
const crypto_1 = require("../utils/crypto");
/**
 * Verifies a payment transaction with Flutterwave API
 */
async function verifyFlutterwaveTransaction(txRef) {
    const secretKey = (0, firebase_1.getFlutterwaveSecretKey)();
    if (!secretKey) {
        throw new functions.https.HttpsError('unavailable', 'Flutterwave is not configured');
    }
    const verifyUrl = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`;
    const response = await fetch(verifyUrl, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        functions.logger.error('Flutterwave verify request failed', {
            status: response.status,
            txRef,
        });
        throw new functions.https.HttpsError('internal', 'Payment verification failed');
    }
    const payload = (await response.json());
    if (payload?.status !== 'success') {
        throw new functions.https.HttpsError('failed-precondition', 'Payment verification returned error');
    }
    return payload;
}
/**
 * Validates Flutterwave webhook signature
 */
function validateWebhookSignature(rawBody, signature) {
    const secret = (0, firebase_1.getFlutterwaveSecret)();
    return (0, crypto_1.verifyWebhookSignature)(rawBody, signature, secret);
}
/**
 * Processes a charge.completed webhook event
 */
async function processChargeCompletedEvent(data) {
    const errors = [];
    const txRef = String(data?.tx_ref || '');
    const chargeStatus = String(data?.status || '').toLowerCase();
    const currency = String(data?.currency || '').toUpperCase();
    const amount = Number(data?.amount || 0);
    if (!txRef) {
        errors.push('Missing tx_ref');
    }
    if (chargeStatus !== 'successful') {
        errors.push(`Charge status is not successful: ${chargeStatus}`);
    }
    if (currency !== 'NGN') {
        errors.push(`Invalid currency: ${currency}, expected NGN`);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        errors.push(`Invalid amount: ${amount}`);
    }
    if (errors.length > 0) {
        return { isValid: false, errors };
    }
    return {
        isValid: true,
        txRef,
        amountNgn: amount,
        transactionId: data?.id,
    };
}
/**
 * Validates the expected amount matches paid amount
 */
function validatePaymentAmount(expectedNgn, paidNgn, toleranceNgn = 0) {
    return paidNgn >= expectedNgn - toleranceNgn;
}
