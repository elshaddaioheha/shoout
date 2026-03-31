"use strict";
/**
 * Pricing service - Subscription and pricing calculations
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
exports.parseCartItemId = parseCartItemId;
exports.resolveCheckoutLine = resolveCheckoutLine;
exports.getExpectedSubscriptionAmountNgn = getExpectedSubscriptionAmountNgn;
exports.calculateSubscriptionExpiry = calculateSubscriptionExpiry;
exports.calculateCartTotal = calculateCartTotal;
exports.validateCartTotalMatch = validateCartTotalMatch;
exports.activateSubscriptionTier = activateSubscriptionTier;
exports.calculatePlatformFee = calculatePlatformFee;
exports.calculateCreatorPayout = calculateCreatorPayout;
const functions = __importStar(require("firebase-functions"));
const types_1 = require("../types");
const firebase_1 = require("../utils/firebase");
const formatting_1 = require("../utils/formatting");
const subscriptionLifecycle_1 = require("../subscriptionLifecycle");
/**
 * Parses cart item ID to extract upload ID and optional license SKU
 */
function parseCartItemId(rawId) {
    for (const sku of types_1.LICENSE_SKUS_ORDERED) {
        const suf = '_' + sku;
        if (rawId.endsWith(suf)) {
            return { uploadId: rawId.slice(0, -suf.length), licenseSku: sku };
        }
    }
    return { uploadId: rawId, licenseSku: null };
}
/**
 * Resolves a checkout line item by fetching from Firestore and validating
 */
async function resolveCheckoutLine(raw) {
    const db = (0, firebase_1.getDb)();
    const uploaderId = String(raw.uploaderId || '').trim();
    const { uploadId, licenseSku } = parseCartItemId(String(raw.id || '').trim());
    if (!uploadId || !uploaderId) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid cart item');
    }
    const snap = await db
        .collection('users')
        .doc(uploaderId)
        .collection('uploads')
        .doc(uploadId)
        .get();
    if (!snap.exists) {
        throw new functions.https.HttpsError('not-found', 'Listing not found');
    }
    const d = snap.data();
    if (d.isPublic !== true) {
        throw new functions.https.HttpsError('failed-precondition', 'Listing is not public');
    }
    let priceUsd;
    if (licenseSku && types_1.LICENSE_USD_PRICES[licenseSku] != null) {
        priceUsd = types_1.LICENSE_USD_PRICES[licenseSku];
    }
    else {
        priceUsd = Number(d.price);
    }
    if (!Number.isFinite(priceUsd) || priceUsd < 0) {
        throw new functions.https.HttpsError('failed-precondition', 'Invalid listing price');
    }
    priceUsd = (0, formatting_1.roundUsd)(priceUsd);
    return {
        id: raw.id,
        uploaderId,
        title: String(d.title || raw.title || 'Track'),
        artist: String(d.uploaderName || d.artist || raw.artist || 'Artist'),
        price: priceUsd,
        audioUrl: String(d.audioUrl || raw.audioUrl || ''),
        coverUrl: String(d.coverUrl || raw.coverUrl || ''),
    };
}
/**
 * Gets expected subscription amount in NGN based on plan and billing cycle
 */
function getExpectedSubscriptionAmountNgn(planId, billingCycle) {
    const pricing = types_1.SUBSCRIPTION_PLAN_PRICING_USD[planId];
    if (!pricing) {
        throw new functions.https.HttpsError('invalid-argument', `Unsupported planId: ${planId}`);
    }
    const usd = billingCycle === 'annual' ? pricing.annualTotal : pricing.monthly;
    return (0, formatting_1.convertUsdToNgn)(usd);
}
/**
 * Calculates subscription expiry timestamp based on billing cycle
 */
function calculateSubscriptionExpiry(billingCycle) {
    return require('firebase-admin').firestore.Timestamp.fromDate((0, subscriptionLifecycle_1.calculateSubscriptionExpiryDate)(billingCycle));
}
/**
 * Calculates total cart price in USD after resolving all items
 */
async function calculateCartTotal(rawItems) {
    const items = [];
    for (const raw of rawItems) {
        items.push(await resolveCheckoutLine(raw));
    }
    const totalUsd = (0, formatting_1.roundUsd)(items.reduce((sum, i) => sum + i.price, 0));
    return { items, totalUsd };
}
/**
 * Validates that client and server totals match (within epsilon tolerance)
 */
function validateCartTotalMatch(serverTotal, clientTotal) {
    if (Math.abs(serverTotal - clientTotal) > types_1.CART_TOTAL_EPSILON) {
        throw new functions.https.HttpsError('invalid-argument', `Cart total mismatch (server ${serverTotal} USD vs client ${clientTotal} USD)`);
    }
}
/**
 * Activates a subscription tier for a user
 */
async function activateSubscriptionTier(userId, params) {
    const db = (0, firebase_1.getDb)();
    const now = (0, firebase_1.serverTimestamp)();
    const isFreeTier = getExpectedSubscriptionAmountNgn(params.planId, params.billingCycle) === 0 &&
        types_1.FREE_SUBSCRIPTION_PLANS.has(params.planId);
    const expiresAt = isFreeTier ? null : calculateSubscriptionExpiry(params.billingCycle);
    const subscriptionStatus = isFreeTier ? 'trial' : 'active';
    const userRef = db.collection('users').doc(userId);
    const subscriptionRef = userRef.collection('subscription').doc('current');
    const batchWrite = (0, firebase_1.batch)();
    batchWrite.set(subscriptionRef, {
        tier: params.planId,
        status: subscriptionStatus,
        isSubscribed: !isFreeTier,
        billingCycle: isFreeTier ? null : params.billingCycle,
        expiresAt,
        amountNgn: params.verifiedAmountNgn || 0,
        provider: isFreeTier ? 'internal' : 'flutterwave',
        txRef: isFreeTier ? null : params.txRef,
        providerTransactionId: params.providerTransactionId || null,
        updatedAt: now,
        activatedAt: now,
    }, { merge: true });
    batchWrite.set(userRef, {
        role: params.planId,
        lastSubscribedAt: now,
        subscriptionStatus,
    }, { merge: true });
    if (!isFreeTier && params.txRef) {
        const paymentRef = db.collection('subscriptionPayments').doc(params.txRef);
        batchWrite.set(paymentRef, {
            userId,
            planId: params.planId,
            billingCycle: params.billingCycle,
            status: 'completed',
            amountNgn: params.verifiedAmountNgn || 0,
            expectedAmountNgn: getExpectedSubscriptionAmountNgn(params.planId, params.billingCycle),
            provider: 'flutterwave',
            providerTransactionId: params.providerTransactionId || null,
            updatedAt: now,
            createdAt: now,
        }, { merge: true });
    }
    await batchWrite.commit();
}
/**
 * Platform fee rate (10%)
 */
function calculatePlatformFee(amountNgn) {
    return Math.round(amountNgn * 0.1);
}
/**
 * Creator payout after platform fee
 */
function calculateCreatorPayout(amountNgn) {
    return amountNgn - calculatePlatformFee(amountNgn);
}
