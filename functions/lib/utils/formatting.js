"use strict";
/**
 * Formatting utilities - currency conversion, data formatting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertUsdToNgn = convertUsdToNgn;
exports.convertNgnToUsd = convertNgnToUsd;
exports.roundUsd = roundUsd;
exports.formatCurrency = formatCurrency;
exports.calculateVat = calculateVat;
exports.calculateInvoiceTotal = calculateInvoiceTotal;
exports.parseTimestamp = parseTimestamp;
exports.msToIso = msToIso;
exports.isoToMs = isoToMs;
exports.formatNairaAmount = formatNairaAmount;
exports.formatPlanName = formatPlanName;
exports.formatBillingCycle = formatBillingCycle;
exports.generateInvoiceNumber = generateInvoiceNumber;
exports.calculatePlatformFee = calculatePlatformFee;
exports.calculateCreatorPayout = calculateCreatorPayout;
const types_1 = require("../types");
/**
 * Converts USD amount to NGN using current exchange rate and rounds
 */
function convertUsdToNgn(totalUsd) {
    return Math.round(totalUsd * types_1.NAIRA_RATE);
}
/**
 * Converts NGN to USD
 */
function convertNgnToUsd(totalNgn) {
    return Math.round((totalNgn / types_1.NAIRA_RATE) * 100) / 100;
}
/**
 * Rounds USD amounts to 2 decimal places
 */
function roundUsd(amount) {
    return Math.round(amount * 100) / 100;
}
/**
 * Formats currency for display with locale-specific formatting
 */
function formatCurrency(amount, locale = 'en-NG') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'NGN',
    }).format(amount);
}
/**
 * Calculates VAT (7.5%) from subtotal
 */
function calculateVat(subtotalNgn) {
    return Math.round(subtotalNgn * types_1.VAT_RATE);
}
/**
 * Calculates total invoice amount (subtotal + VAT)
 */
function calculateInvoiceTotal(subtotalNgn) {
    const vat = calculateVat(subtotalNgn);
    return subtotalNgn + vat;
}
/**
 * Parses timestamp from various formats (ms, ISO string, Timestamp object)
 */
function parseTimestamp(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed))
            return parsed;
        const dateMs = Date.parse(value);
        if (Number.isFinite(dateMs))
            return dateMs;
    }
    if (value && typeof value.toMillis === 'function') {
        return value.toMillis();
    }
    return null;
}
/**
 * Converts milliseconds to ISO date string
 */
function msToIso(ms) {
    return new Date(ms).toISOString();
}
/**
 * Converts ISO date string to milliseconds
 */
function isoToMs(iso) {
    return Date.parse(iso);
}
/**
 * Formats naira amount as localized string with commas
 */
function formatNairaAmount(amountNgn) {
    return (Math.round(amountNgn) || 0).toLocaleString('en-NG');
}
/**
 * Formats a subscription plan ID to display name
 */
function formatPlanName(planId) {
    const names = {
        vault: 'Vault',
        vault_pro: 'Vault Pro',
        studio: 'Studio',
        hybrid: 'Hybrid',
    };
    return names[planId] || planId;
}
/**
 * Formats billing cycle to display name
 */
function formatBillingCycle(cycle) {
    return cycle === 'annual' ? 'Annual' : 'Monthly';
}
/**
 * Generates a unique invoice number
 */
function generateInvoiceNumber(prefix = 'INV') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}
/**
 * Calculates platform fee (10%) from transaction amount
 */
function calculatePlatformFee(amountNgn) {
    return Math.round(amountNgn * 0.1);
}
/**
 * Calculates creator payout (amount - platform fee)
 */
function calculateCreatorPayout(amountNgn) {
    return amountNgn - calculatePlatformFee(amountNgn);
}
