"use strict";
/**
 * Subscription catalog — single source of truth for plans, pricing, and quotas.
 * No other module should hardcode plan logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_QUOTAS = exports.PLAN_PRICING_USD = exports.DEFAULT_PLAN = exports.PAID_PLANS = exports.FREE_PLANS = exports.ALL_PLANS = void 0;
exports.isValidPlan = isValidPlan;
exports.isFreePlan = isFreePlan;
exports.isPaidPlan = isPaidPlan;
exports.getPricing = getPricing;
exports.ALL_PLANS = ['shoout', 'vault', 'vault_pro', 'studio', 'hybrid'];
exports.FREE_PLANS = new Set(['shoout', 'vault']);
exports.PAID_PLANS = new Set(['vault_pro', 'studio', 'hybrid']);
/** Default tier for new users and downgrade target for expired/canceled paid plans. */
exports.DEFAULT_PLAN = 'shoout';
/**
 * USD pricing (source of truth). Annual = 10 months (2 months free).
 * Flutterwave settles in NGN at runtime via NAIRA_RATE.
 */
exports.PLAN_PRICING_USD = {
    shoout: { monthly: 0, annualTotal: 0 },
    vault: { monthly: 0, annualTotal: 0 },
    vault_pro: { monthly: 5.99, annualTotal: 5.99 * 10 },
    studio: { monthly: 18.99, annualTotal: 18.99 * 10 },
    hybrid: { monthly: 24.99, annualTotal: 24.99 * 10 },
};
exports.PLAN_QUOTAS = {
    shoout: { vaultStorageBytes: 0, vaultMaxUploads: 0, studioStorageBytes: 0 },
    vault: { vaultStorageBytes: 100 * 1024 * 1024, vaultMaxUploads: 50, studioStorageBytes: 0 },
    vault_pro: { vaultStorageBytes: 5 * 1024 * 1024 * 1024, vaultMaxUploads: 500, studioStorageBytes: 0 },
    studio: { vaultStorageBytes: 0, vaultMaxUploads: 0, studioStorageBytes: 2 * 1024 * 1024 * 1024 },
    hybrid: { vaultStorageBytes: 10 * 1024 * 1024 * 1024, vaultMaxUploads: 500, studioStorageBytes: 2 * 1024 * 1024 * 1024 },
};
function isValidPlan(planId) {
    return exports.ALL_PLANS.includes(planId);
}
function isFreePlan(plan) {
    return exports.FREE_PLANS.has(plan);
}
function isPaidPlan(plan) {
    return exports.PAID_PLANS.has(plan);
}
function getPricing(plan, cycle) {
    const p = exports.PLAN_PRICING_USD[plan];
    return cycle === 'annual' ? p.annualTotal : p.monthly;
}
