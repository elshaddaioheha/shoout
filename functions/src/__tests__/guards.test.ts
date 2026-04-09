/**
 * Guard tests — verify each plan is denied/allowed for each capability.
 * Mocks userRepo.getSubscription to simulate different subscription states.
 */

jest.mock('../repositories', () => {
  const actual = jest.requireActual('../repositories/base');
  return {
    ...actual,
    userRepo: {
      getSubscription: jest.fn(),
      getAllUploads: jest.fn(),
      subscriptionRef: jest.fn(),
      ref: jest.fn(),
      uploadRef: jest.fn(),
      purchasesQuery: jest.fn(),
    },
    paymentRepo: { ref: jest.fn() },
    serverTimestamp: () => 'MOCK_TS',
    newBatch: jest.fn(() => ({ set: jest.fn(), commit: jest.fn() })),
    timestampFromDate: jest.fn(),
    timestampNow: jest.fn(),
    systemRepo: { subscriptionCollectionGroup: jest.fn() },
    storageRepo: {},
  };
});

import {
  getEntitlements,
  assertCanUploadToVault,
  assertCanSell,
  assertCanShareVaultLinks,
  assertCanUseAds,
  assertCanReplyAsSeller,
  assertCanAccessVault,
  assertVaultUploadAllowed,
  assertStudioUploadAllowed,
} from '../subscriptions/guards';
import { userRepo } from '../repositories';

const mockGetSubscription = userRepo.getSubscription as jest.Mock;
const mockGetAllUploads = userRepo.getAllUploads as jest.Mock;

function setTier(tier: string) {
  mockGetSubscription.mockResolvedValue({ tier });
}

function setNoSubscription() {
  mockGetSubscription.mockResolvedValue(undefined);
}

function mockEmptyUploads() {
  mockGetAllUploads.mockResolvedValue({ docs: [] });
}

describe('subscription guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmptyUploads();
  });

  describe('getEntitlements', () => {
    it('returns shoout as default when no subscription exists', async () => {
      setNoSubscription();
      const { plan, entitlements } = await getEntitlements('user1');
      expect(plan).toBe('shoout');
      expect(entitlements.canBuy).toBe(true);
      expect(entitlements.canUploadToVault).toBe(false);
    });

    it('returns correct plan from subscription', async () => {
      setTier('studio');
      const { plan, entitlements } = await getEntitlements('user1');
      expect(plan).toBe('studio');
      expect(entitlements.canSell).toBe(true);
    });
  });

  describe('assertCanUploadToVault', () => {
    it.each(['vault', 'vault_pro', 'hybrid'])('%s → allowed', async (tier) => {
      setTier(tier);
      await expect(assertCanUploadToVault('user1')).resolves.toBeDefined();
    });

    it.each(['shoout', 'studio'])('%s → denied', async (tier) => {
      setTier(tier);
      await expect(assertCanUploadToVault('user1')).rejects.toThrow('Vault uploads');
    });

    it('no subscription → denied (defaults to shoout)', async () => {
      setNoSubscription();
      await expect(assertCanUploadToVault('user1')).rejects.toThrow('Vault uploads');
    });
  });

  describe('assertCanSell', () => {
    it.each(['studio', 'hybrid'])('%s → allowed', async (tier) => {
      setTier(tier);
      await expect(assertCanSell('user1')).resolves.toBeDefined();
    });

    it.each(['shoout', 'vault', 'vault_pro'])('%s → denied', async (tier) => {
      setTier(tier);
      await expect(assertCanSell('user1')).rejects.toThrow('selling');
    });
  });

  describe('assertCanShareVaultLinks', () => {
    it.each(['vault', 'vault_pro', 'hybrid'])('%s → allowed', async (tier) => {
      setTier(tier);
      await expect(assertCanShareVaultLinks('user1')).resolves.toBeDefined();
    });

    it.each(['shoout', 'studio'])('%s → denied', async (tier) => {
      setTier(tier);
      await expect(assertCanShareVaultLinks('user1')).rejects.toThrow('private link sharing');
    });
  });

  describe('assertCanUseAds', () => {
    it.each(['studio', 'hybrid'])('%s → allowed', async (tier) => {
      setTier(tier);
      await expect(assertCanUseAds('user1')).resolves.toBeDefined();
    });

    it.each(['shoout', 'vault', 'vault_pro'])('%s → denied', async (tier) => {
      setTier(tier);
      await expect(assertCanUseAds('user1')).rejects.toThrow('ad campaigns');
    });
  });

  describe('assertCanReplyAsSeller', () => {
    it.each(['studio', 'hybrid'])('%s → allowed', async (tier) => {
      setTier(tier);
      await expect(assertCanReplyAsSeller('user1')).resolves.toBeDefined();
    });

    it.each(['shoout', 'vault', 'vault_pro'])('%s → denied', async (tier) => {
      setTier(tier);
      await expect(assertCanReplyAsSeller('user1')).rejects.toThrow('seller messaging');
    });
  });

  describe('assertCanAccessVault', () => {
    it.each(['vault', 'vault_pro', 'hybrid'])('%s → allowed', async (tier) => {
      setTier(tier);
      await expect(assertCanAccessVault('user1')).resolves.toBeDefined();
    });

    it.each(['shoout', 'studio'])('%s → denied', async (tier) => {
      setTier(tier);
      await expect(assertCanAccessVault('user1')).rejects.toThrow('Vault workspace');
    });
  });

  describe('assertVaultUploadAllowed', () => {
    it('allows vault user within quota', async () => {
      setTier('vault');
      mockGetAllUploads.mockResolvedValue({ docs: [] });
      await expect(assertVaultUploadAllowed('user1', 1024)).resolves.toBeDefined();
    });

    it('denies vault user exceeding upload count', async () => {
      setTier('vault');
      // 50 existing uploads = at limit
      const docs = Array.from({ length: 50 }, (_, i) => ({
        id: `u${i}`,
        data: () => ({ fileSizeBytes: 100, storageLedger: 'vault' }),
      }));
      mockGetAllUploads.mockResolvedValue({ docs });
      await expect(assertVaultUploadAllowed('user1', 1024)).rejects.toThrow('upload limit');
    });

    it('denies vault user exceeding storage', async () => {
      setTier('vault');
      // 99MB used, trying to upload 2MB = over 100MB limit
      mockGetAllUploads.mockResolvedValue({
        docs: [{ id: 'u1', data: () => ({ fileSizeBytes: 99 * 1024 * 1024, storageLedger: 'vault' }) }],
      });
      await expect(assertVaultUploadAllowed('user1', 2 * 1024 * 1024)).rejects.toThrow('storage limit');
    });

    it('denies shoout user', async () => {
      setTier('shoout');
      await expect(assertVaultUploadAllowed('user1', 1024)).rejects.toThrow('Vault uploads');
    });
  });

  describe('assertStudioUploadAllowed', () => {
    it('allows studio user within quota', async () => {
      setTier('studio');
      mockGetAllUploads.mockResolvedValue({ docs: [] });
      await expect(assertStudioUploadAllowed('user1', 1024)).resolves.toBeDefined();
    });

    it('denies studio user exceeding storage', async () => {
      setTier('studio');
      // 1.9GB used, trying to upload 200MB = over 2GB limit
      mockGetAllUploads.mockResolvedValue({
        docs: [{ id: 'u1', data: () => ({ fileSizeBytes: 1.9 * 1024 * 1024 * 1024, storageLedger: 'studio' }) }],
      });
      await expect(assertStudioUploadAllowed('user1', 200 * 1024 * 1024)).rejects.toThrow('Studio storage limit');
    });

    it('denies vault user (no studio access)', async () => {
      setTier('vault');
      await expect(assertStudioUploadAllowed('user1', 1024)).rejects.toThrow('selling');
    });

    it('hybrid user — studio upload uses studio ledger only', async () => {
      setTier('hybrid');
      // 10GB vault + 1GB studio = studio has room
      mockGetAllUploads.mockResolvedValue({
        docs: [
          { id: 'v1', data: () => ({ fileSizeBytes: 10 * 1024 * 1024 * 1024, storageLedger: 'vault' }) },
          { id: 's1', data: () => ({ fileSizeBytes: 1 * 1024 * 1024 * 1024, storageLedger: 'studio' }) },
        ],
      });
      await expect(assertStudioUploadAllowed('user1', 500 * 1024 * 1024)).resolves.toBeDefined();
    });
  });
});
