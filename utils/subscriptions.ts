export type SubscriptionPlanId = 'shoout' | 'vault' | 'vault_pro' | 'studio' | 'hybrid';
export type AppMode = SubscriptionPlanId;

export type SubscriptionFeatureFlags = {
  canBuy: boolean;
  canUpload: boolean;
  canSell: boolean;
  canAccessVaultWorkspace: boolean;
  canUploadToVault: boolean;
  canShareVaultLinks: boolean;
  canEditVaultTracks: boolean;
  canUsePrivateSharing: boolean;
  canUseCart: boolean;
  canUseMarketplaceMessaging: boolean;
  canReplyAsSeller: boolean;
  canUseAnalytics: boolean;
  canUseAds: boolean;
  canUseVaultStorage: boolean;
  canUseVaultPermissions: boolean;
  canUseTeamAccess: boolean;
  maxVaultUploads: number;
  storageLimitGB: number;
};

export type SubscriptionConfig = {
  id: SubscriptionPlanId;
  label: string;
  shortLabel: string;
  description: string;
  category: 'Shoout' | 'Vault' | 'Studio' | 'Hybrid';
  monthlyPriceUsd: number;
  annualPerMonthUsd: number;
  annualTotalUsd: number;
  color: string;
  gradient: readonly [string, string, ...string[]];
  borderColor: string;
  recommended?: boolean;
  features: string[];
  upgradeTarget: SubscriptionPlanId | null;
  flags: SubscriptionFeatureFlags;
};

const makeFlags = (flags: Partial<SubscriptionFeatureFlags>): SubscriptionFeatureFlags => ({
  canBuy: false,
  canUpload: false,
  canSell: false,
  canAccessVaultWorkspace: false,
  canUploadToVault: false,
  canShareVaultLinks: false,
  canEditVaultTracks: false,
  canUsePrivateSharing: false,
  canUseCart: false,
  canUseMarketplaceMessaging: false,
  canReplyAsSeller: false,
  canUseAnalytics: false,
  canUseAds: false,
  canUseVaultStorage: false,
  canUseVaultPermissions: false,
  canUseTeamAccess: false,
  maxVaultUploads: 0,
  storageLimitGB: 0,
  ...flags,
});

export const SUBSCRIPTION_PLANS: SubscriptionConfig[] = [
  {
    id: 'shoout',
    label: 'Shoout',
    shortLabel: 'Shoout',
    description: 'Buyer and marketplace mode for discovery, cart, and messaging.',
    category: 'Shoout',
    monthlyPriceUsd: 0,
    annualPerMonthUsd: 0,
    annualTotalUsd: 0,
    color: '#6AA7FF',
    gradient: ['rgba(106, 167, 255, 0.15)', 'rgba(106, 167, 255, 0.05)', 'rgba(0,0,0,0)'],
    borderColor: '#6AA7FF',
    features: ['Marketplace browsing', 'Buy beats', 'Cart and checkout', 'Buyer messaging'],
    upgradeTarget: 'vault',
    flags: makeFlags({
      canBuy: true,
      canUseCart: true,
      canUseMarketplaceMessaging: true,
    }),
  },
  {
    id: 'vault',
    label: 'Vault',
    shortLabel: 'Vault',
    description: 'Private storage and secure sharing for works in progress.',
    category: 'Vault',
    monthlyPriceUsd: 0,
    annualPerMonthUsd: 0,
    annualTotalUsd: 0,
    color: '#EC5C39',
    gradient: ['rgba(236, 92, 57, 0.15)', 'rgba(236, 92, 57, 0.05)', 'rgba(0,0,0,0)'],
    borderColor: '#EC5C39',
    features: ['Private uploads', 'Folders and secure links', '50 uploads with 0.5GB storage'],
    upgradeTarget: 'vault_pro',
    flags: makeFlags({
      canBuy: true,
      canUseCart: true,
      canUseMarketplaceMessaging: true,
      canUpload: true,
      canAccessVaultWorkspace: true,
      canUploadToVault: true,
      canShareVaultLinks: true,
      canEditVaultTracks: true,
      canUsePrivateSharing: true,
      canUseVaultStorage: true,
      maxVaultUploads: 50,
      storageLimitGB: 0.5,
    }),
  },
  {
    id: 'vault_pro',
    label: 'Vault Pro',
    shortLabel: 'Vault Pro',
    description: 'The same private Vault workflow with much higher upload and storage limits.',
    category: 'Vault',
    monthlyPriceUsd: 5.99,
    annualPerMonthUsd: 5.99,
    annualTotalUsd: 71.88,
    color: '#EC5C39',
    gradient: ['rgba(236, 92, 57, 0.15)', 'rgba(236, 92, 57, 0.05)', 'rgba(0,0,0,0)'],
    borderColor: '#EC5C39',
    features: ['Private uploads and folders', '500 uploads', '5GB storage'],
    upgradeTarget: 'hybrid',
    flags: makeFlags({
      canBuy: true,
      canUseCart: true,
      canUseMarketplaceMessaging: true,
      canUpload: true,
      canAccessVaultWorkspace: true,
      canUploadToVault: true,
      canShareVaultLinks: true,
      canEditVaultTracks: true,
      canUsePrivateSharing: true,
      canUseVaultStorage: true,
      maxVaultUploads: 500,
      storageLimitGB: 5,
    }),
  },
  {
    id: 'studio',
    label: 'Studio',
    shortLabel: 'Studio',
    description: 'Seller tools, analytics, listings, and payouts.',
    category: 'Studio',
    monthlyPriceUsd: 18.99,
    annualPerMonthUsd: 18.99,
    annualTotalUsd: 227.88,
    color: '#4CAF50',
    gradient: ['rgba(76, 175, 80, 0.15)', 'rgba(76, 175, 80, 0.05)', 'rgba(0,0,0,0)'],
    borderColor: '#4CAF50',
    recommended: true,
    features: ['Unlimited listings', 'Buyer-seller chat', 'Payout access', 'Standard visibility'],
    upgradeTarget: 'hybrid',
    flags: makeFlags({
      canBuy: true,
      canUseCart: true,
      canUseMarketplaceMessaging: true,
      canUpload: true,
      canSell: true,
      canReplyAsSeller: true,
      canUseAnalytics: true,
      canUseAds: true,
      maxVaultUploads: 0,
      storageLimitGB: 2,
    }),
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    shortLabel: 'Hybrid',
    description: 'Combined creator mode with Publish, Promote, and Vault workflows.',
    category: 'Hybrid',
    monthlyPriceUsd: 24.99,
    annualPerMonthUsd: 24.99,
    annualTotalUsd: 299.88,
    color: '#FFD700',
    gradient: ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)', 'rgba(0,0,0,0)'],
    borderColor: '#FFD700',
    features: ['Publish tools', 'Promote & Ads tools', 'Vault workspace access', 'Team collaboration', 'Dedicated support', '10% transaction fee'],
    upgradeTarget: null,
    flags: makeFlags({
      canBuy: true,
      canUseCart: true,
      canUseMarketplaceMessaging: true,
      canUpload: true,
      canSell: true,
      canAccessVaultWorkspace: true,
      canUploadToVault: true,
      canShareVaultLinks: true,
      canEditVaultTracks: true,
      canUsePrivateSharing: true,
      canReplyAsSeller: true,
      canUseAnalytics: true,
      canUseAds: true,
      canUseVaultStorage: true,
      canUseVaultPermissions: true,
      canUseTeamAccess: true,
      maxVaultUploads: 500,
      storageLimitGB: 10,
    }),
  },
];

export const SWITCHER_ORDER: AppMode[] = ['shoout', 'vault', 'vault_pro', 'studio', 'hybrid'];

export function getSubscriptionPlan(planId: SubscriptionPlanId): SubscriptionConfig {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) || SUBSCRIPTION_PLANS[0];
}

export function getEffectivePlan(planId: string | null | undefined): SubscriptionPlanId {
  const normalized = String(planId || '').trim().toLowerCase() as SubscriptionPlanId;
  if (SWITCHER_ORDER.includes(normalized)) return normalized;
  return 'shoout';
}

export function getFeatureFlags(planId: string | null | undefined): SubscriptionFeatureFlags {
  return getSubscriptionPlan(getEffectivePlan(planId)).flags;
}

export function getVaultCapabilities(planId: string | null | undefined) {
  const plan = getEffectivePlan(planId);
  const flags = getFeatureFlags(plan);
  return {
    currentPlan: plan,
    canAccessVaultWorkspace: flags.canAccessVaultWorkspace,
    canUploadToVault: flags.canUploadToVault,
    canShareVaultLinks: flags.canShareVaultLinks,
    canEditVaultTracks: flags.canEditVaultTracks,
    maxVaultUploads: flags.maxVaultUploads,
    storageLimitGB: flags.storageLimitGB,
  };
}

export function canAccessAppMode(currentPlan: string | null | undefined, targetMode: AppMode): boolean {
  return SWITCHER_ORDER.includes(targetMode);
}

export function canUseStudioServices(currentPlan: string | null | undefined): boolean {
  const plan = getEffectivePlan(currentPlan);
  return plan === 'studio' || plan === 'hybrid';
}

export function canUseHybridServices(currentPlan: string | null | undefined): boolean {
  return getEffectivePlan(currentPlan) === 'hybrid';
}

export function getDefaultAppModeForPlan(currentPlan: string | null | undefined): AppMode {
  const plan = getEffectivePlan(currentPlan);
  return plan === 'shoout' ? 'shoout' : plan;
}

export function getUpgradeTargetForMode(mode: AppMode): SubscriptionPlanId | null {
  return getSubscriptionPlan(mode).upgradeTarget;
}

export function formatPlanLabel(planId: string | null | undefined): string {
  return getSubscriptionPlan(getEffectivePlan(planId)).label;
}
