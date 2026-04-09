/**
 * Entitlement resolver — pure function that maps a plan to capabilities.
 * This is the single place that defines "what can plan X do?"
 */

import { SubscriptionPlan, PLAN_QUOTAS } from './catalog';

export interface ServiceEntitlements {
  canBuy: boolean;
  canUseCart: boolean;
  canUseMarketplaceMessaging: boolean;
  canAccessVaultWorkspace: boolean;
  canUploadToVault: boolean;
  canShareVaultLinks: boolean;
  canEditVaultTracks: boolean;
  canSell: boolean;
  canReplyAsSeller: boolean;
  canUseAnalytics: boolean;
  canUseAds: boolean;
  canUseVaultStorage: boolean;
  canUseTeamAccess: boolean;
  maxVaultUploads: number;
  vaultStorageLimitBytes: number;
  studioStorageLimitBytes: number;
}

export function resolveEntitlements(plan: SubscriptionPlan): ServiceEntitlements {
  const q = PLAN_QUOTAS[plan];

  const hasVault = plan === 'vault' || plan === 'vault_pro' || plan === 'hybrid';
  const hasStudio = plan === 'studio' || plan === 'hybrid';

  return {
    // Everyone can browse and buy
    canBuy: true,
    canUseCart: true,

    // Messaging: shoout can initiate, studio can reply, hybrid can do both
    canUseMarketplaceMessaging: plan === 'shoout' || plan === 'hybrid',

    // Vault capabilities
    canAccessVaultWorkspace: hasVault,
    canUploadToVault: hasVault,
    canShareVaultLinks: hasVault,
    canEditVaultTracks: hasVault,
    canUseVaultStorage: hasVault,

    // Studio capabilities
    canSell: hasStudio,
    canReplyAsSeller: hasStudio,
    canUseAnalytics: hasStudio,
    canUseAds: hasStudio,

    // Hybrid-only
    canUseTeamAccess: plan === 'hybrid',

    // Quotas
    maxVaultUploads: q.vaultMaxUploads,
    vaultStorageLimitBytes: q.vaultStorageBytes,
    studioStorageLimitBytes: q.studioStorageBytes,
  };
}
