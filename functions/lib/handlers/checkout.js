"use strict";
/**
 * Checkout handlers - Shopping cart and payment session management
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
exports.getCheckoutStatus = exports.createCheckoutSession = void 0;
const functions = __importStar(require("firebase-functions"));
const pricing = __importStar(require("../services/pricing"));
const types_1 = require("../types");
const repositories_1 = require("../repositories");
const formatting_1 = require("../utils/formatting");
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
    if (!context?.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const userId = context.auth.uid;
    const rawItems = (data?.items || []);
    const clientTotalUsd = Number(data?.totalAmountUsd || 0);
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Cart is empty');
    }
    if (!Number.isFinite(clientTotalUsd) || clientTotalUsd <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid cart total');
    }
    const { items, totalUsd } = await pricing.calculateCartTotal(rawItems);
    pricing.validateCartTotalMatch(totalUsd, clientTotalUsd);
    const txRef = `shoouts_cart_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const totalAmountNgn = (0, formatting_1.convertUsdToNgn)(totalUsd);
    await repositories_1.checkoutRepo.create(txRef, {
        userId,
        items,
        totalAmountUsd: totalUsd,
        totalAmountNgn,
        exchangeRateNgnPerUsd: types_1.NAIRA_RATE,
        status: 'pending',
        createdAt: (0, repositories_1.serverTimestamp)(),
        updatedAt: (0, repositories_1.serverTimestamp)(),
        expiresAt: (0, repositories_1.timestampFromMs)(Date.now() + types_1.CHECKOUT_SESSION_TTL_MS),
    });
    return { txRef, amountNgn: totalAmountNgn, currency: 'NGN' };
});
exports.getCheckoutStatus = functions.https.onCall(async (data, context) => {
    if (!context?.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const userId = context.auth.uid;
    const txRef = String(data?.txRef || '');
    if (!txRef) {
        throw new functions.https.HttpsError('invalid-argument', 'txRef is required');
    }
    const session = await repositories_1.checkoutRepo.getByTxRef(txRef);
    if (!session) {
        throw new functions.https.HttpsError('not-found', 'Checkout session not found');
    }
    if (session.userId !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Not allowed to view this session');
    }
    return { status: session.status, txRef };
});
