"use strict";
/**
 * Webhook handlers - Payment webhooks from Flutterwave
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
exports.flutterwaveWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const flutterwaveService = __importStar(require("../services/flutterwave"));
const invoicing = __importStar(require("../services/invoicing"));
const types_1 = require("../types");
const repositories_1 = require("../repositories");
exports.flutterwaveWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    try {
        const signature = (req.header('verif-hash') || req.header('x-flutterwave-signature') || '').trim();
        const rawBody = (req.rawBody || Buffer.from(JSON.stringify(req.body))).toString('utf8');
        if (!flutterwaveService.validateWebhookSignature(rawBody, signature)) {
            functions.logger.warn('Invalid Flutterwave webhook signature');
            res.status(401).send('Invalid signature');
            return;
        }
        const payload = req.body;
        const event = payload?.event;
        const data = payload?.data;
        const txRef = String(data?.tx_ref || '');
        if (event !== 'charge.completed' || !txRef) {
            res.status(200).send('Ignored');
            return;
        }
        // Handle failed charges
        if (data?.status !== 'successful') {
            await repositories_1.checkoutRepo.merge(txRef, {
                status: 'failed',
                updatedAt: (0, repositories_1.serverTimestamp)(),
                providerPayload: data || null,
            });
            res.status(200).send('Recorded failed payment');
            return;
        }
        // Get checkout session
        const sessionSnap = await repositories_1.checkoutRepo.getSnapByTxRef(txRef);
        if (!sessionSnap.exists) {
            functions.logger.error('No checkout session for txRef', { txRef });
            res.status(404).send('Session not found');
            return;
        }
        const session = sessionSnap.data();
        // Check if already processed or in progress
        if (session.status === 'completed' || session.status === 'processing') {
            res.status(200).send('Already processed');
            return;
        }
        // Check if session expired
        if (session.expiresAt && typeof session.expiresAt.toMillis === 'function') {
            if (session.expiresAt.toMillis() < Date.now()) {
                await repositories_1.checkoutRepo.merge(txRef, { status: 'expired', updatedAt: (0, repositories_1.serverTimestamp)() });
                res.status(200).send('Session expired');
                return;
            }
        }
        // Validate payment details
        const paymentCurrency = String(data?.currency || '').toUpperCase();
        if (paymentCurrency !== 'NGN') {
            await repositories_1.checkoutRepo.merge(txRef, {
                status: 'invalid_currency',
                updatedAt: (0, repositories_1.serverTimestamp)(),
                providerPayload: data || null,
            });
            res.status(400).send('Invalid currency');
            return;
        }
        // Round to integer NGN to avoid float comparison issues from Flutterwave
        const paidAmount = Math.round(Number(data?.amount || 0));
        const maxAcceptable = Math.round(session.totalAmountNgn * types_1.OVERPAYMENT_TOLERANCE_FACTOR);
        if (!Number.isFinite(paidAmount) || paidAmount < session.totalAmountNgn || paidAmount > maxAcceptable) {
            await repositories_1.checkoutRepo.merge(txRef, {
                status: 'amount_mismatch',
                updatedAt: (0, repositories_1.serverTimestamp)(),
                paidAmount,
            });
            functions.logger.error('Amount mismatch', {
                txRef,
                expected: session.totalAmountNgn,
                paidAmount,
            });
            res.status(400).send('Amount mismatch');
            return;
        }
        // Mark session as processing to prevent retry loops
        await repositories_1.checkoutRepo.merge(txRef, { status: 'processing', updatedAt: (0, repositories_1.serverTimestamp)() });
        // Create purchase records with deterministic IDs
        const batchWrite = (0, repositories_1.newBatch)();
        const now = (0, repositories_1.serverTimestamp)();
        // Exchange rate used at checkout time (stored in session for audit trail)
        const exchangeRate = session.exchangeRateNgnPerUsd || types_1.NAIRA_RATE;
        for (const item of session.items) {
            const txnId = `${txRef}_${item.id}`;
            const itemPriceUsd = Number(item.price || 0);
            const itemPriceNgn = Math.round(itemPriceUsd * exchangeRate);
            batchWrite.set(repositories_1.transactionRepo.ref(txnId), {
                trackId: item.id,
                buyerId: session.userId,
                sellerId: item.uploaderId,
                priceUsd: itemPriceUsd,
                amountNgn: itemPriceNgn,
                exchangeRateNgnPerUsd: exchangeRate,
                trackTitle: item.title,
                status: 'completed',
                paymentProvider: 'flutterwave',
                flutterwaveTxRef: txRef,
                createdAt: now,
            });
            batchWrite.set(repositories_1.userRepo.purchaseRef(session.userId, txnId), {
                trackId: item.id,
                title: item.title,
                artist: item.artist,
                priceUsd: itemPriceUsd,
                amountNgn: itemPriceNgn,
                exchangeRateNgnPerUsd: exchangeRate,
                uploaderId: item.uploaderId,
                audioUrl: item.audioUrl || '',
                coverUrl: item.coverUrl || '',
                purchasedAt: now,
            });
        }
        batchWrite.set(repositories_1.checkoutRepo.ref(txRef), {
            status: 'completed',
            providerTransactionId: data?.id || null,
            paidAmount,
            updatedAt: now,
        }, { merge: true });
        await batchWrite.commit();
        // Send receipt email (non-blocking)
        try {
            const userData = await repositories_1.userRepo.getById(session.userId);
            const recipientEmail = String(userData?.email || '').trim();
            const recipientName = String(userData?.fullName || userData?.name || 'Shoouts User').trim();
            if (recipientEmail) {
                const exchangeRateForEmail = session.exchangeRateNgnPerUsd || types_1.NAIRA_RATE;
                const lineItems = session.items.map((item) => {
                    const usd = Number(item.price || 0);
                    const lineNgn = Math.round(usd * exchangeRateForEmail);
                    return {
                        description: `${item.title} by ${item.artist}`,
                        qty: 1,
                        unitAmountNgn: lineNgn,
                        totalAmountNgn: lineNgn,
                    };
                });
                await invoicing.createReceiptEmail({
                    userId: session.userId,
                    recipientEmail,
                    recipientName,
                    lineItems,
                    totalChargedNgn: paidAmount,
                    subject: 'Shoouts Purchase Receipt',
                    invoicePrefix: 'PUR',
                    notes: `Payment reference: ${txRef}`,
                });
            }
        }
        catch (emailError) {
            functions.logger.error('Purchase email/invoice generation failed', emailError);
        }
        res.status(200).send('Processed');
    }
    catch (error) {
        functions.logger.error('flutterwaveWebhook failed', error);
        res.status(500).send('Internal error');
    }
});
