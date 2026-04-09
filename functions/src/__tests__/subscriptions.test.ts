/**
 * Tests for the subscriptions domain module.
 * Covers: catalog, entitlements, storagePolicy (pure functions only — no Firestore mocks needed).
 */

import {
  ALL_PLANS,
  FREE_PLANS,
  PAID_PLANS,
  DEFAULT_PLAN,
  PLAN_PRICING_USD,
  PLAN_QUOTAS,
  isValidPlan,
  isFreePlan,
  isPaidPlan,
  getPricing,
  SubscriptionPlan,
} from '../subscriptions/catalog';

import { resolveEntitlements, ServiceEntitlements } from '../subscriptions/entitlements';

// ============================================================================
// Catalog
// ============================================================================

describe('subscriptions/catalog', () => {
  describe('plan sets', () => {
    it('ALL_PLANS contains exactly 5 plans', () => {
      expect(ALL_PLANS).toEqual(['shoout', 'vault', 'vault_pro', 'studio', 'hybrid']);
    });

    it('FREE_PLANS contains shoout and vault', () => {
      expect(FREE_PLANS.has('shoout')).toBe(true);
      expect(FREE_PLANS.has('vault')).toBe(true);
      expect(FREE_PLANS.has('vault_pro')).toBe(false);
    });

    it('PAID_PLANS contains vault_pro, studio, hybrid', () => {
      expect(PAID_PLANS.has('vault_pro')).toBe(true);
      expect(PAID_PLANS.has('studio')).toBe(true);
      expect(PAID_PLANS.has('hybrid')).toBe(true);
      expect(PAID_PLANS.has('shoout')).toBe(false);
    });

    it('DEFAULT_PLAN is shoout', () => {
      expect(DEFAULT_PLAN).toBe('shoout');
    });
  });

  describe('isValidPlan', () => {
    it('accepts all valid plans', () => {
      for (const plan of ALL_PLANS) {
        expect(isValidPlan(plan)).toBe(true);
      }
    });

    it('rejects invalid plans', () => {
      expect(isValidPlan('enterprise')).toBe(false);
      expect(isValidPlan('')).toBe(false);
      expect(isValidPlan('studio_free')).toBe(false);
    });
  });

  describe('isFreePlan / isPaidPlan', () => {
    it('shoout is free', () => {
      expect(isFreePlan('shoout')).toBe(true);
      expect(isPaidPlan('shoout')).toBe(false);
    });

    it('vault is free', () => {
      expect(isFreePlan('vault')).toBe(true);
      expect(isPaidPlan('vault')).toBe(false);
    });

    it('vault_pro is paid', () => {
      expect(isFreePlan('vault_pro')).toBe(false);
      expect(isPaidPlan('vault_pro')).toBe(true);
    });

    it('studio is paid', () => {
      expect(isPaidPlan('studio')).toBe(true);
    });

    it('hybrid is paid', () => {
      expect(isPaidPlan('hybrid')).toBe(true);
    });
  });

  describe('PLAN_PRICING_USD', () => {
    it('free plans cost $0', () => {
      expect(PLAN_PRICING_USD.shoout.monthly).toBe(0);
      expect(PLAN_PRICING_USD.vault.monthly).toBe(0);
    });

    it('vault_pro is $5.99/mo', () => {
      expect(PLAN_PRICING_USD.vault_pro.monthly).toBe(5.99);
    });

    it('studio is $18.99/mo', () => {
      expect(PLAN_PRICING_USD.studio.monthly).toBe(18.99);
    });

    it('hybrid is $24.99/mo', () => {
      expect(PLAN_PRICING_USD.hybrid.monthly).toBe(24.99);
    });

    it('annual = monthly * 10 for paid plans', () => {
      expect(PLAN_PRICING_USD.vault_pro.annualTotal).toBeCloseTo(5.99 * 10);
      expect(PLAN_PRICING_USD.studio.annualTotal).toBeCloseTo(18.99 * 10);
      expect(PLAN_PRICING_USD.hybrid.annualTotal).toBeCloseTo(24.99 * 10);
    });
  });

  describe('getPricing', () => {
    it('returns monthly price', () => {
      expect(getPricing('studio', 'monthly')).toBe(18.99);
    });

    it('returns annual total', () => {
      expect(getPricing('studio', 'annual')).toBeCloseTo(189.9);
    });

    it('returns 0 for free plans', () => {
      expect(getPricing('shoout', 'monthly')).toBe(0);
      expect(getPricing('vault', 'annual')).toBe(0);
    });
  });

  describe('PLAN_QUOTAS', () => {
    it('shoout has no storage or uploads', () => {
      const q = PLAN_QUOTAS.shoout;
      expect(q.vaultStorageBytes).toBe(0);
      expect(q.vaultMaxUploads).toBe(0);
      expect(q.studioStorageBytes).toBe(0);
    });

    it('vault has 100MB / 50 uploads / no studio', () => {
      const q = PLAN_QUOTAS.vault;
      expect(q.vaultStorageBytes).toBe(100 * 1024 * 1024);
      expect(q.vaultMaxUploads).toBe(50);
      expect(q.studioStorageBytes).toBe(0);
    });

    it('vault_pro has 5GB / 500 uploads / no studio', () => {
      const q = PLAN_QUOTAS.vault_pro;
      expect(q.vaultStorageBytes).toBe(5 * 1024 * 1024 * 1024);
      expect(q.vaultMaxUploads).toBe(500);
      expect(q.studioStorageBytes).toBe(0);
    });

    it('studio has no vault / 2GB studio', () => {
      const q = PLAN_QUOTAS.studio;
      expect(q.vaultStorageBytes).toBe(0);
      expect(q.vaultMaxUploads).toBe(0);
      expect(q.studioStorageBytes).toBe(2 * 1024 * 1024 * 1024);
    });

    it('hybrid has 10GB vault / 500 uploads / 2GB studio', () => {
      const q = PLAN_QUOTAS.hybrid;
      expect(q.vaultStorageBytes).toBe(10 * 1024 * 1024 * 1024);
      expect(q.vaultMaxUploads).toBe(500);
      expect(q.studioStorageBytes).toBe(2 * 1024 * 1024 * 1024);
    });
  });
});

// ============================================================================
// Entitlements
// ============================================================================

describe('subscriptions/entitlements', () => {
  describe('resolveEntitlements', () => {
    const plans: SubscriptionPlan[] = ['shoout', 'vault', 'vault_pro', 'studio', 'hybrid'];

    it('every plan can buy and use cart', () => {
      for (const plan of plans) {
        const e = resolveEntitlements(plan);
        expect(e.canBuy).toBe(true);
        expect(e.canUseCart).toBe(true);
      }
    });

    describe('shoout (marketplace buyer)', () => {
      let e: ServiceEntitlements;
      beforeAll(() => { e = resolveEntitlements('shoout'); });

      it('can message in marketplace', () => expect(e.canUseMarketplaceMessaging).toBe(true));
      it('cannot access vault', () => expect(e.canAccessVaultWorkspace).toBe(false));
      it('cannot upload to vault', () => expect(e.canUploadToVault).toBe(false));
      it('cannot share vault links', () => expect(e.canShareVaultLinks).toBe(false));
      it('cannot sell', () => expect(e.canSell).toBe(false));
      it('cannot reply as seller', () => expect(e.canReplyAsSeller).toBe(false));
      it('cannot use analytics', () => expect(e.canUseAnalytics).toBe(false));
      it('cannot use ads', () => expect(e.canUseAds).toBe(false));
      it('has zero quotas', () => {
        expect(e.maxVaultUploads).toBe(0);
        expect(e.vaultStorageLimitBytes).toBe(0);
        expect(e.studioStorageLimitBytes).toBe(0);
      });
    });

    describe('vault (basic storage)', () => {
      let e: ServiceEntitlements;
      beforeAll(() => { e = resolveEntitlements('vault'); });

      it('cannot message in marketplace', () => expect(e.canUseMarketplaceMessaging).toBe(false));
      it('can access vault', () => expect(e.canAccessVaultWorkspace).toBe(true));
      it('can upload to vault', () => expect(e.canUploadToVault).toBe(true));
      it('can share vault links', () => expect(e.canShareVaultLinks).toBe(true));
      it('can edit vault tracks', () => expect(e.canEditVaultTracks).toBe(true));
      it('cannot sell', () => expect(e.canSell).toBe(false));
      it('cannot use ads', () => expect(e.canUseAds).toBe(false));
      it('has 50 uploads / 100MB vault', () => {
        expect(e.maxVaultUploads).toBe(50);
        expect(e.vaultStorageLimitBytes).toBe(100 * 1024 * 1024);
        expect(e.studioStorageLimitBytes).toBe(0);
      });
    });

    describe('vault_pro (expanded storage)', () => {
      let e: ServiceEntitlements;
      beforeAll(() => { e = resolveEntitlements('vault_pro'); });

      it('can access vault', () => expect(e.canAccessVaultWorkspace).toBe(true));
      it('can upload to vault', () => expect(e.canUploadToVault).toBe(true));
      it('cannot sell', () => expect(e.canSell).toBe(false));
      it('has 500 uploads / 5GB vault', () => {
        expect(e.maxVaultUploads).toBe(500);
        expect(e.vaultStorageLimitBytes).toBe(5 * 1024 * 1024 * 1024);
        expect(e.studioStorageLimitBytes).toBe(0);
      });
    });

    describe('studio (creator selling)', () => {
      let e: ServiceEntitlements;
      beforeAll(() => { e = resolveEntitlements('studio'); });

      it('cannot access vault', () => expect(e.canAccessVaultWorkspace).toBe(false));
      it('cannot upload to vault', () => expect(e.canUploadToVault).toBe(false));
      it('cannot share vault links', () => expect(e.canShareVaultLinks).toBe(false));
      it('can sell', () => expect(e.canSell).toBe(true));
      it('can reply as seller', () => expect(e.canReplyAsSeller).toBe(true));
      it('can use analytics', () => expect(e.canUseAnalytics).toBe(true));
      it('can use ads', () => expect(e.canUseAds).toBe(true));
      it('has 0 vault / 2GB studio', () => {
        expect(e.maxVaultUploads).toBe(0);
        expect(e.vaultStorageLimitBytes).toBe(0);
        expect(e.studioStorageLimitBytes).toBe(2 * 1024 * 1024 * 1024);
      });
    });

    describe('hybrid (vault + studio)', () => {
      let e: ServiceEntitlements;
      beforeAll(() => { e = resolveEntitlements('hybrid'); });

      it('can message in marketplace', () => expect(e.canUseMarketplaceMessaging).toBe(true));
      it('can access vault', () => expect(e.canAccessVaultWorkspace).toBe(true));
      it('can upload to vault', () => expect(e.canUploadToVault).toBe(true));
      it('can share vault links', () => expect(e.canShareVaultLinks).toBe(true));
      it('can sell', () => expect(e.canSell).toBe(true));
      it('can reply as seller', () => expect(e.canReplyAsSeller).toBe(true));
      it('can use analytics', () => expect(e.canUseAnalytics).toBe(true));
      it('can use ads', () => expect(e.canUseAds).toBe(true));
      it('has team access', () => expect(e.canUseTeamAccess).toBe(true));
      it('has 500 uploads / 10GB vault / 2GB studio', () => {
        expect(e.maxVaultUploads).toBe(500);
        expect(e.vaultStorageLimitBytes).toBe(10 * 1024 * 1024 * 1024);
        expect(e.studioStorageLimitBytes).toBe(2 * 1024 * 1024 * 1024);
      });
    });

    it('only hybrid has team access', () => {
      for (const plan of plans) {
        const e = resolveEntitlements(plan);
        if (plan === 'hybrid') {
          expect(e.canUseTeamAccess).toBe(true);
        } else {
          expect(e.canUseTeamAccess).toBe(false);
        }
      }
    });

    it('vault tiers grant vault workspace, studio tier does not', () => {
      expect(resolveEntitlements('vault').canAccessVaultWorkspace).toBe(true);
      expect(resolveEntitlements('vault_pro').canAccessVaultWorkspace).toBe(true);
      expect(resolveEntitlements('hybrid').canAccessVaultWorkspace).toBe(true);
      expect(resolveEntitlements('shoout').canAccessVaultWorkspace).toBe(false);
      expect(resolveEntitlements('studio').canAccessVaultWorkspace).toBe(false);
    });

    it('only studio and hybrid can sell', () => {
      expect(resolveEntitlements('shoout').canSell).toBe(false);
      expect(resolveEntitlements('vault').canSell).toBe(false);
      expect(resolveEntitlements('vault_pro').canSell).toBe(false);
      expect(resolveEntitlements('studio').canSell).toBe(true);
      expect(resolveEntitlements('hybrid').canSell).toBe(true);
    });
  });
});

// ============================================================================
// Lifecycle (pure functions only — no Firestore)
// ============================================================================

import { calculateExpiryDate, getExpectedAmountNgn, buildDefaultSubscriptionDoc } from '../subscriptions/lifecycle';

describe('subscriptions/lifecycle', () => {
  const fixed = new Date('2025-06-15T12:00:00.000Z');

  describe('calculateExpiryDate', () => {
    it('adds one month for monthly', () => {
      const d = calculateExpiryDate('monthly', fixed);
      expect(d.toISOString()).toBe('2025-07-15T12:00:00.000Z');
    });

    it('adds one year for annual', () => {
      const d = calculateExpiryDate('annual', fixed);
      expect(d.toISOString()).toBe('2026-06-15T12:00:00.000Z');
    });
  });

  describe('getExpectedAmountNgn', () => {
    it('returns 0 for free plans', () => {
      expect(getExpectedAmountNgn('shoout', 'monthly')).toBe(0);
      expect(getExpectedAmountNgn('vault', 'monthly')).toBe(0);
    });

    it('returns positive NGN for paid plans', () => {
      const amount = getExpectedAmountNgn('vault_pro', 'monthly');
      expect(amount).toBeGreaterThan(0);
      expect(Number.isInteger(amount)).toBe(true);
    });

    it('annual is 10x monthly for vault_pro', () => {
      const monthly = getExpectedAmountNgn('vault_pro', 'monthly');
      const annual = getExpectedAmountNgn('vault_pro', 'annual');
      expect(annual).toBeCloseTo(monthly * 10, -1); // within rounding
    });
  });

  describe('buildDefaultSubscriptionDoc', () => {
    // Mock serverTimestamp for this test since it needs firebase-admin
    jest.mock('../repositories', () => ({
      ...jest.requireActual('../repositories/base'),
      serverTimestamp: () => 'MOCK_TIMESTAMP',
      userRepo: {},
      paymentRepo: {},
      newBatch: jest.fn(),
      timestampFromDate: jest.fn(),
      timestampNow: jest.fn(),
      systemRepo: { subscriptionCollectionGroup: jest.fn() },
    }));

    it('creates a shoout default doc', () => {
      const doc = buildDefaultSubscriptionDoc();
      expect(doc.tier).toBe('shoout');
      expect(doc.status).toBe('free');
      expect(doc.isSubscribed).toBe(false);
      expect(doc.billingCycle).toBeNull();
      expect(doc.expiresAt).toBeNull();
      expect(doc.cancelAtPeriodEnd).toBe(false);
      expect(doc.version).toBe(1);
    });

    it('includes resolved shoout entitlements', () => {
      const doc = buildDefaultSubscriptionDoc();
      const ent = doc.serviceEntitlements;
      expect(ent.canBuy).toBe(true);
      expect(ent.canSell).toBe(false);
      expect(ent.canUploadToVault).toBe(false);
      expect(ent.maxVaultUploads).toBe(0);
    });
  });
});
