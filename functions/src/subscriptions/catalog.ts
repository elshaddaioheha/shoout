/**
 * Subscription catalog — single source of truth for plans, pricing, and quotas.
 * No other module should hardcode plan logic.
 */

export type SubscriptionPlan = 'shoout' | 'vault' | 'vault_pro' | 'studio' | 'hybrid';

export type SubscriptionStatus = 'free' | 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';

export type BillingCycle = 'monthly' | 'annual';

export type StorageLedger = 'vault' | 'studio';

export const ALL_PLANS: SubscriptionPlan[] = ['shoout', 'vault', 'vault_pro', 'studio', 'hybrid'];

export const FREE_PLANS = new Set<SubscriptionPlan>(['shoout', 'vault']);

export const PAID_PLANS = new Set<SubscriptionPlan>(['vault_pro', 'studio', 'hybrid']);

/** Default tier for new users and downgrade target for expired/canceled paid plans. */
export const DEFAULT_PLAN: SubscriptionPlan = 'shoout';

/**
 * USD pricing (source of truth). Annual = 10 months (2 months free).
 * Flutterwave settles in NGN at runtime via NAIRA_RATE.
 */
export const PLAN_PRICING_USD: Record<SubscriptionPlan, { monthly: number; annualTotal: number }> = {
  shoout: { monthly: 0, annualTotal: 0 },
  vault: { monthly: 0, annualTotal: 0 },
  vault_pro: { monthly: 5.99, annualTotal: 5.99 * 10 },
  studio: { monthly: 18.99, annualTotal: 18.99 * 10 },
  hybrid: { monthly: 24.99, annualTotal: 24.99 * 10 },
};

export interface PlanQuotas {
  vaultStorageBytes: number;
  vaultMaxUploads: number;
  studioStorageBytes: number;
}

export const PLAN_QUOTAS: Record<SubscriptionPlan, PlanQuotas> = {
  shoout: { vaultStorageBytes: 0, vaultMaxUploads: 0, studioStorageBytes: 0 },
  vault: { vaultStorageBytes: 100 * 1024 * 1024, vaultMaxUploads: 50, studioStorageBytes: 0 },
  vault_pro: { vaultStorageBytes: 5 * 1024 * 1024 * 1024, vaultMaxUploads: 500, studioStorageBytes: 0 },
  studio: { vaultStorageBytes: 0, vaultMaxUploads: 0, studioStorageBytes: 2 * 1024 * 1024 * 1024 },
  hybrid: { vaultStorageBytes: 10 * 1024 * 1024 * 1024, vaultMaxUploads: 500, studioStorageBytes: 2 * 1024 * 1024 * 1024 },
};

export function isValidPlan(planId: string): planId is SubscriptionPlan {
  return ALL_PLANS.includes(planId as SubscriptionPlan);
}

export function isFreePlan(plan: SubscriptionPlan): boolean {
  return FREE_PLANS.has(plan);
}

export function isPaidPlan(plan: SubscriptionPlan): boolean {
  return PAID_PLANS.has(plan);
}

export function getPricing(plan: SubscriptionPlan, cycle: BillingCycle): number {
  const p = PLAN_PRICING_USD[plan];
  return cycle === 'annual' ? p.annualTotal : p.monthly;
}
