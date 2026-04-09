/**
 * Subscription guards — enforce capabilities based on the user's current plan.
 * Every handler that needs permission checks calls these instead of rolling their own.
 */

import * as functions from 'firebase-functions';
import { userRepo } from '../repositories';
import { SubscriptionPlan, DEFAULT_PLAN, StorageLedger } from './catalog';
import { resolveEntitlements, ServiceEntitlements } from './entitlements';
import { computeVaultUsage, computeStudioUsage } from './storagePolicy';

/**
 * Reads the user's current plan from Firestore and resolves entitlements.
 */
export async function getEntitlements(userId: string): Promise<{
  plan: SubscriptionPlan;
  entitlements: ServiceEntitlements;
}> {
  const sub = await userRepo.getSubscription(userId);
  const plan = (sub?.tier as SubscriptionPlan) || DEFAULT_PLAN;
  return { plan, entitlements: resolveEntitlements(plan) };
}

function deny(message: string): never {
  throw new functions.https.HttpsError('permission-denied', message);
}

// ── Capability Assertions ──────────────────────────────────────────────────

export async function assertCanUploadToVault(userId: string): Promise<ServiceEntitlements> {
  const { entitlements } = await getEntitlements(userId);
  if (!entitlements.canUploadToVault) {
    deny('Your plan does not include Vault uploads. Upgrade to Vault, Vault Pro, or Hybrid.');
  }
  return entitlements;
}

export async function assertCanSell(userId: string): Promise<ServiceEntitlements> {
  const { entitlements } = await getEntitlements(userId);
  if (!entitlements.canSell) {
    deny('Your plan does not include selling. Upgrade to Studio or Hybrid.');
  }
  return entitlements;
}

export async function assertCanShareVaultLinks(userId: string): Promise<ServiceEntitlements> {
  const { entitlements } = await getEntitlements(userId);
  if (!entitlements.canShareVaultLinks) {
    deny('Your plan does not include private link sharing. Upgrade to Vault or Hybrid.');
  }
  return entitlements;
}

export async function assertCanUseAds(userId: string): Promise<ServiceEntitlements> {
  const { entitlements } = await getEntitlements(userId);
  if (!entitlements.canUseAds) {
    deny('Your plan does not include ad campaigns. Upgrade to Studio or Hybrid.');
  }
  return entitlements;
}

export async function assertCanReplyAsSeller(userId: string): Promise<ServiceEntitlements> {
  const { entitlements } = await getEntitlements(userId);
  if (!entitlements.canReplyAsSeller) {
    deny('Your plan does not include seller messaging. Upgrade to Studio or Hybrid.');
  }
  return entitlements;
}

export async function assertCanAccessVault(userId: string): Promise<ServiceEntitlements> {
  const { entitlements } = await getEntitlements(userId);
  if (!entitlements.canAccessVaultWorkspace) {
    deny('Your plan does not include the Vault workspace. Upgrade to Vault or Hybrid.');
  }
  return entitlements;
}

// ── Storage Assertions (ledger-aware) ──────────────────────────────────────

export async function assertVaultUploadAllowed(
  userId: string,
  fileSizeBytes: number
): Promise<{ entitlements: ServiceEntitlements; usage: { usedBytes: number; usedCount: number } }> {
  const entitlements = await assertCanUploadToVault(userId);

  const usage = await computeVaultUsage(userId);

  if (entitlements.maxVaultUploads !== Infinity && usage.usedCount >= entitlements.maxVaultUploads) {
    deny(`Vault upload limit reached (${entitlements.maxVaultUploads}). Upgrade for more uploads.`);
  }

  if (entitlements.vaultStorageLimitBytes !== Infinity && usage.usedBytes + fileSizeBytes > entitlements.vaultStorageLimitBytes) {
    const availableMB = Math.max(0, (entitlements.vaultStorageLimitBytes - usage.usedBytes) / (1024 * 1024));
    deny(`Vault storage limit exceeded. Available: ${availableMB.toFixed(1)}MB. Upgrade for more storage.`);
  }

  return { entitlements, usage };
}

export async function assertStudioUploadAllowed(
  userId: string,
  fileSizeBytes: number
): Promise<{ entitlements: ServiceEntitlements; usage: { usedBytes: number } }> {
  const entitlements = await assertCanSell(userId);

  const usage = await computeStudioUsage(userId);

  if (usage.usedBytes + fileSizeBytes > entitlements.studioStorageLimitBytes) {
    const availableMB = Math.max(0, (entitlements.studioStorageLimitBytes - usage.usedBytes) / (1024 * 1024));
    deny(`Studio storage limit exceeded. Available: ${availableMB.toFixed(1)}MB. Upgrade for more storage.`);
  }

  return { entitlements, usage };
}
