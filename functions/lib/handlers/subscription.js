"use strict";
/**
 * Subscription handlers - Subscription activation and downgrade
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
exports.downgradeExpiredSubscriptions = exports.activateSubscriptionTier = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const pricing = __importStar(require("../services/pricing"));
const invoicing = __importStar(require("../services/invoicing"));
const aggregation = __importStar(require("../services/aggregation"));
const types_1 = require("../types");
const firebase_1 = require("../utils/firebase");
/**
 * activateSubscriptionTier - Activates paid or free subscription for user
 */
exports.activateSubscriptionTier = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method Not Allowed' });
        return;
    }
    try {
        // Verify bearer token
        const authHeader = String(req.header('authorization') || '');
        if (!authHeader.startsWith('Bearer ')) {
            res.status(401).json({ success: false, error: 'Missing bearer token' });
            return;
        }
        const idToken = authHeader.slice('Bearer '.length).trim();
        const decoded = await admin.auth().verifyIdToken(idToken);
        const userId = decoded.uid;
        // Parse request
        const planId = String(req.body?.planId || '').trim();
        const billingCycleRaw = String(req.body?.billingCycle || 'monthly').toLowerCase();
        const billingCycle = billingCycleRaw === 'annual' ? 'annual' : 'monthly';
        const txRef = String(req.body?.txRef || '').trim();
        if (!planId) {
            res.status(400).json({ success: false, error: 'planId is required' });
            return;
        }
        const expectedAmountNgn = pricing.getExpectedSubscriptionAmountNgn(planId, billingCycle);
        const isFreeTier = expectedAmountNgn === 0 && types_1.FREE_SUBSCRIPTION_PLANS.has(planId);
        if (expectedAmountNgn > 0 && !txRef) {
            res.status(400).json({ success: false, error: 'txRef is required for paid plans' });
            return;
        }
        // For paid tiers, verify payment
        let verifiedAmountNgn = expectedAmountNgn;
        let providerTransactionId = null;
        if (!isFreeTier) {
            const flutterwaveService = await Promise.resolve().then(() => __importStar(require('../services/flutterwave')));
            const secretKey = require('../utils/firebase').getFlutterwaveSecretKey();
            if (!secretKey) {
                functions.logger.error('FLUTTERWAVE_SECRET_KEY is not configured');
                res.status(500).json({ success: false, error: 'Payment verification is unavailable' });
                return;
            }
            // Check if already processed
            const db = (0, firebase_1.getDb)();
            const paymentRef = db.collection('subscriptionPayments').doc(txRef);
            const existingPaymentSnap = await paymentRef.get();
            if (existingPaymentSnap.exists) {
                const existing = existingPaymentSnap.data();
                if (existing.userId === userId && existing.planId === planId && existing.status === 'completed') {
                    res.status(200).json({ success: true, alreadyProcessed: true, planId });
                    return;
                }
            }
            // Verify with Flutterwave
            try {
                const verifyPayload = await flutterwaveService.verifyFlutterwaveTransaction(txRef);
                const paymentData = verifyPayload?.data || {};
                const paymentStatus = String(paymentData?.status || '').toLowerCase();
                const paymentCurrency = String(paymentData?.currency || '').toUpperCase();
                const paidAmount = Number(paymentData?.amount || 0);
                if (paymentStatus !== 'successful') {
                    res.status(400).json({ success: false, error: 'Payment not successful' });
                    return;
                }
                if (String(paymentData?.tx_ref || '') !== txRef) {
                    res.status(400).json({ success: false, error: 'txRef mismatch' });
                    return;
                }
                if (!Number.isFinite(paidAmount) || paidAmount < expectedAmountNgn) {
                    res.status(400).json({ success: false, error: 'Paid amount is invalid' });
                    return;
                }
                if (paymentCurrency !== 'NGN') {
                    res.status(400).json({ success: false, error: 'Invalid payment currency' });
                    return;
                }
                verifiedAmountNgn = paidAmount;
                providerTransactionId = String(paymentData?.id || '');
            }
            catch (error) {
                functions.logger.error('Payment verification failed', error);
                res.status(400).json({ success: false, error: 'Unable to verify payment' });
                return;
            }
        }
        // Activate subscription
        await pricing.activateSubscriptionTier(userId, {
            planId,
            billingCycle,
            txRef: isFreeTier ? undefined : txRef,
            verifiedAmountNgn,
            providerTransactionId,
        });
        // Send invoice and confirmation email
        try {
            const db = (0, firebase_1.getDb)();
            const userSnap = await db.collection('users').doc(userId).get();
            const userData = userSnap.data();
            const recipientEmail = String(userData?.email || decoded.email || '').trim();
            const recipientName = String(userData?.fullName || userData?.name || 'Shoouts User').trim();
            if (recipientEmail) {
                const subtotal = verifiedAmountNgn;
                const vat = Math.round(subtotal * 0.075);
                const total = subtotal + vat;
                await invoicing.createInvoiceAndSendEmail({
                    userId,
                    recipientEmail,
                    recipientName,
                    lineItems: [
                        {
                            description: `Subscription: ${planId} (${isFreeTier ? 'trial' : billingCycle})`,
                            qty: 1,
                            unitAmountNgn: subtotal,
                            totalAmountNgn: subtotal,
                        },
                    ],
                    subject: `Shoouts Subscription Update: ${planId}`,
                    invoicePrefix: 'SUB',
                    notes: isFreeTier
                        ? 'Your account is currently on the free/trial Vault tier.'
                        : `Your plan is active until ${pricing
                            .calculateSubscriptionExpiry(billingCycle)
                            .toDate()
                            .toISOString()}.`,
                });
            }
        }
        catch (emailError) {
            functions.logger.error('Subscription email/invoice generation failed', emailError);
            // Don't fail the request if email fails
        }
        res.status(200).json({ success: true, planId, billingCycle });
    }
    catch (error) {
        functions.logger.error('activateSubscriptionTier failed', error);
        res.status(500).json({ success: false, error: error?.message || 'Internal error' });
    }
});
/**
 * downgradeExpiredSubscriptions - Scheduled function to downgrade expired subscriptions (24 hours)
 */
exports.downgradeExpiredSubscriptions = (0, scheduler_1.onSchedule)({ schedule: 'every 24 hours' }, async () => {
    await aggregation.downgradeExpiredSubscriptions();
});
