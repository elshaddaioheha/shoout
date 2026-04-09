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
const invoicing = __importStar(require("../services/invoicing"));
const types_1 = require("../types");
const repositories_1 = require("../repositories");
const catalog_1 = require("../subscriptions/catalog");
const lifecycle_1 = require("../subscriptions/lifecycle");
exports.activateSubscriptionTier = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method Not Allowed' });
        return;
    }
    try {
        const authHeader = String(req.header('authorization') || '');
        if (!authHeader.startsWith('Bearer ')) {
            res.status(401).json({ success: false, error: 'Missing bearer token' });
            return;
        }
        const idToken = authHeader.slice('Bearer '.length).trim();
        const decoded = await admin.auth().verifyIdToken(idToken);
        const userId = decoded.uid;
        const planId = String(req.body?.planId || '').trim();
        const billingCycleRaw = String(req.body?.billingCycle || 'monthly').toLowerCase();
        const billingCycle = billingCycleRaw === 'annual' ? 'annual' : 'monthly';
        const txRef = String(req.body?.txRef || '').trim();
        if (!planId || !(0, catalog_1.isValidPlan)(planId)) {
            res.status(400).json({ success: false, error: 'Invalid or missing planId' });
            return;
        }
        const plan = planId;
        const expectedAmountNgn = (0, lifecycle_1.getExpectedAmountNgn)(plan, billingCycle);
        const free = (0, catalog_1.isFreePlan)(plan);
        if (!free && !txRef) {
            res.status(400).json({ success: false, error: 'txRef is required for paid plans' });
            return;
        }
        let verifiedAmountNgn = expectedAmountNgn;
        let providerTransactionId = null;
        if (!free) {
            const flutterwaveService = await Promise.resolve().then(() => __importStar(require('../services/flutterwave')));
            // Idempotency: only skip if fully completed. Re-verify if stuck in processing.
            const existing = await repositories_1.paymentRepo.getByTxRef(txRef);
            if (existing) {
                const e = existing;
                if (e.status === 'completed') {
                    res.status(200).json({ success: true, alreadyProcessed: true, planId: e.planId });
                    return;
                }
                // processing status = previous attempt may have failed mid-flight. Re-verify below.
            }
            // Mark as processing before verification
            await repositories_1.paymentRepo.merge(txRef, {
                userId, planId, billingCycle,
                status: 'processing',
                updatedAt: (0, repositories_1.serverTimestamp)(),
                createdAt: (0, repositories_1.serverTimestamp)(),
            });
            try {
                const verifyPayload = await flutterwaveService.verifyFlutterwaveTransaction(txRef);
                const paymentData = verifyPayload?.data;
                const paymentStatus = String(paymentData?.status || '').toLowerCase();
                const paymentCurrency = String(paymentData?.currency || '').toUpperCase();
                // Round to integer NGN to avoid float comparison issues
                const paidAmount = Math.round(Number(paymentData?.amount || 0));
                const maxAcceptable = Math.round(expectedAmountNgn * types_1.OVERPAYMENT_TOLERANCE_FACTOR);
                if (paymentStatus !== 'successful') {
                    res.status(400).json({ success: false, error: 'Payment not successful' });
                    return;
                }
                if (String(paymentData?.tx_ref || '') !== txRef) {
                    res.status(400).json({ success: false, error: 'txRef mismatch' });
                    return;
                }
                if (paymentCurrency !== 'NGN') {
                    res.status(400).json({ success: false, error: 'Invalid payment currency' });
                    return;
                }
                if (!Number.isFinite(paidAmount) || paidAmount < expectedAmountNgn || paidAmount > maxAcceptable) {
                    res.status(400).json({ success: false, error: 'Paid amount is invalid or out of range' });
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
        // Activate via lifecycle module — rollback on failure
        try {
            await (0, lifecycle_1.activate)(userId, {
                planId: plan,
                billingCycle,
                txRef: free ? undefined : txRef,
                verifiedAmountNgn,
                providerTransactionId,
                actor: 'user',
            });
        }
        catch (activationError) {
            if (!free && txRef) {
                await repositories_1.paymentRepo.merge(txRef, { status: 'failed', updatedAt: (0, repositories_1.serverTimestamp)() });
            }
            throw activationError;
        }
        // Send invoice (non-blocking)
        try {
            const userData = await repositories_1.userRepo.getById(userId);
            const recipientEmail = String(userData?.email || decoded.email || '').trim();
            const recipientName = String(userData?.fullName || userData?.name || 'Shoouts User').trim();
            if (recipientEmail && !free) {
                await invoicing.createReceiptEmail({
                    userId,
                    recipientEmail,
                    recipientName,
                    lineItems: [{
                            description: `Subscription: ${planId} (${billingCycle})`,
                            qty: 1,
                            unitAmountNgn: verifiedAmountNgn,
                            totalAmountNgn: verifiedAmountNgn,
                        }],
                    totalChargedNgn: verifiedAmountNgn,
                    subject: `Shoouts Subscription Update: ${planId}`,
                    invoicePrefix: 'SUB',
                    notes: `Your plan is active until ${(0, lifecycle_1.calculateExpiryDate)(billingCycle).toISOString()}.`,
                });
            }
        }
        catch (emailError) {
            functions.logger.error('Subscription email/invoice generation failed', emailError);
        }
        res.status(200).json({ success: true, planId, billingCycle });
    }
    catch (error) {
        functions.logger.error('activateSubscriptionTier failed', error);
        res.status(500).json({ success: false, error: error?.message || 'Internal error' });
    }
});
exports.downgradeExpiredSubscriptions = (0, scheduler_1.onSchedule)({ schedule: 'every 24 hours' }, async () => {
    await (0, lifecycle_1.downgradeExpiredSubscriptions)();
});
