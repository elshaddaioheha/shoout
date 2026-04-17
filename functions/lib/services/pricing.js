"use strict";
/**
 * Pricing service — cart resolution and total validation.
 * Subscription activation has moved to subscriptions/lifecycle.ts.
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
exports.resolveLicensePriceUsd = resolveLicensePriceUsd;
exports.resolveCheckoutLine = resolveCheckoutLine;
exports.calculateCartTotal = calculateCartTotal;
exports.validateCartTotalMatch = validateCartTotalMatch;
const functions = __importStar(require("firebase-functions"));
const types_1 = require("../types");
const repositories_1 = require("../repositories");
const formatting_1 = require("../utils/formatting");
const TIER_TITLES = {
    basic: 'Basic',
    premium: 'Premium',
    exclusive: 'Exclusive',
};
function parseCartItemId(rawId) {
    for (const sku of types_1.LICENSE_SKUS_ORDERED) {
        const suf = '_' + sku;
        if (rawId.endsWith(suf)) {
            return { uploadId: rawId.slice(0, -suf.length), licenseSku: sku };
        }
    }
    return { uploadId: rawId, licenseSku: null };
}
function resolveLicensePriceUsd(basePriceUsd, licenseSku) {
    const basePrice = (0, formatting_1.roundUsd)(Number(basePriceUsd || 0));
    if (licenseSku === 'premium') {
        return (0, formatting_1.roundUsd)(basePrice * 2.5);
    }
    if (licenseSku === 'exclusive') {
        return (0, formatting_1.roundUsd)(basePrice * 7);
    }
    if (licenseSku && types_1.LICENSE_USD_PRICES[licenseSku] != null) {
        return types_1.LICENSE_USD_PRICES[licenseSku];
    }
    return basePrice;
}
async function resolveCheckoutLine(raw) {
    const uploaderId = String(raw.uploaderId || '').trim();
    const { uploadId, licenseSku } = parseCartItemId(String(raw.id || '').trim());
    if (!uploadId || !uploaderId) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid cart item');
    }
    const d = await repositories_1.userRepo.getUpload(uploaderId, uploadId);
    if (!d) {
        throw new functions.https.HttpsError('not-found', 'Listing not found');
    }
    if (d.isPublic !== true) {
        throw new functions.https.HttpsError('failed-precondition', 'Listing is not public');
    }
    const storedBasePrice = Number(d.price);
    if (!Number.isFinite(storedBasePrice)) {
        throw new functions.https.HttpsError('failed-precondition', 'Listing has invalid price');
    }
    const normalizedTierId = licenseSku === 'premium' || licenseSku === 'exclusive'
        ? licenseSku
        : (raw.licenseTierId || 'basic');
    let priceUsd = resolveLicensePriceUsd(storedBasePrice, licenseSku);
    if (priceUsd < 0) {
        throw new functions.https.HttpsError('failed-precondition', 'Invalid listing price');
    }
    return {
        id: raw.id,
        listingId: uploadId,
        uploaderId,
        title: String(d.title || raw.title || 'Track'),
        artist: String(d.uploaderName || d.artist || raw.artist || 'Artist'),
        price: priceUsd,
        audioUrl: String(d.audioUrl || raw.audioUrl || ''),
        coverUrl: String(d.coverUrl || raw.coverUrl || ''),
        licenseTierId: normalizedTierId,
        licenseTierTitle: TIER_TITLES[normalizedTierId || 'basic'] || raw.licenseTierTitle || 'Basic',
        licenseSummary: String(raw.licenseSummary || ''),
    };
}
async function calculateCartTotal(rawItems) {
    const items = [];
    for (const raw of rawItems) {
        items.push(await resolveCheckoutLine(raw));
    }
    const totalUsd = (0, formatting_1.roundUsd)(items.reduce((sum, i) => sum + i.price, 0));
    return { items, totalUsd };
}
function validateCartTotalMatch(serverTotal, clientTotal) {
    if (Math.abs(serverTotal - clientTotal) > types_1.CART_TOTAL_EPSILON) {
        throw new functions.https.HttpsError('invalid-argument', `Cart total mismatch (server ${serverTotal} USD vs client ${clientTotal} USD)`);
    }
}
