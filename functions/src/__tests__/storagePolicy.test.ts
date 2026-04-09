/**
 * Storage policy tests — vault/studio ledger isolation.
 * Mocks userRepo.getAllUploads to simulate different upload states.
 */

jest.mock('../repositories', () => {
  const actual = jest.requireActual('../repositories/base');
  return {
    ...actual,
    userRepo: {
      getAllUploads: jest.fn(),
      getSubscription: jest.fn(),
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

import { computeVaultUsage, computeStudioUsage } from '../subscriptions/storagePolicy';
import { userRepo } from '../repositories';

const mockGetAllUploads = userRepo.getAllUploads as jest.Mock;

function mockUploads(docs: Array<{ fileSizeBytes: number; storageLedger?: string }>) {
  mockGetAllUploads.mockResolvedValue({
    docs: docs.map((d, i) => ({
      id: `upload_${i}`,
      data: () => d,
    })),
  });
}

describe('storagePolicy', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('computeVaultUsage', () => {
    it('counts only vault-ledger uploads', async () => {
      mockUploads([
        { fileSizeBytes: 1000, storageLedger: 'vault' },
        { fileSizeBytes: 2000, storageLedger: 'studio' },
        { fileSizeBytes: 3000, storageLedger: 'vault' },
      ]);

      const usage = await computeVaultUsage('user1');
      expect(usage.usedBytes).toBe(4000);
      expect(usage.usedCount).toBe(2);
    });

    it('treats uploads without storageLedger as vault (legacy compat)', async () => {
      mockUploads([
        { fileSizeBytes: 5000 },
        { fileSizeBytes: 3000 },
      ]);

      const usage = await computeVaultUsage('user1');
      expect(usage.usedBytes).toBe(8000);
      expect(usage.usedCount).toBe(2);
    });

    it('returns zero for empty uploads', async () => {
      mockUploads([]);
      const usage = await computeVaultUsage('user1');
      expect(usage.usedBytes).toBe(0);
      expect(usage.usedCount).toBe(0);
    });

    it('ignores studio uploads completely', async () => {
      mockUploads([
        { fileSizeBytes: 10000, storageLedger: 'studio' },
        { fileSizeBytes: 20000, storageLedger: 'studio' },
      ]);

      const usage = await computeVaultUsage('user1');
      expect(usage.usedBytes).toBe(0);
      expect(usage.usedCount).toBe(0);
    });
  });

  describe('computeStudioUsage', () => {
    it('counts only studio-ledger uploads', async () => {
      mockUploads([
        { fileSizeBytes: 1000, storageLedger: 'vault' },
        { fileSizeBytes: 5000, storageLedger: 'studio' },
        { fileSizeBytes: 7000, storageLedger: 'studio' },
      ]);

      const usage = await computeStudioUsage('user1');
      expect(usage.usedBytes).toBe(12000);
      expect(usage.usedCount).toBe(2);
    });

    it('legacy uploads without storageLedger are NOT counted as studio', async () => {
      mockUploads([
        { fileSizeBytes: 5000 },
        { fileSizeBytes: 3000 },
      ]);

      const usage = await computeStudioUsage('user1');
      expect(usage.usedBytes).toBe(0);
      expect(usage.usedCount).toBe(0);
    });

    it('returns zero for empty uploads', async () => {
      mockUploads([]);
      const usage = await computeStudioUsage('user1');
      expect(usage.usedBytes).toBe(0);
      expect(usage.usedCount).toBe(0);
    });
  });

  describe('ledger isolation', () => {
    it('vault upload does not affect studio quota', async () => {
      mockUploads([
        { fileSizeBytes: 50000, storageLedger: 'vault' },
      ]);

      const vault = await computeVaultUsage('user1');
      const studio = await computeStudioUsage('user1');
      expect(vault.usedBytes).toBe(50000);
      expect(studio.usedBytes).toBe(0);
    });

    it('studio upload does not affect vault quota', async () => {
      mockUploads([
        { fileSizeBytes: 80000, storageLedger: 'studio' },
      ]);

      const vault = await computeVaultUsage('user1');
      const studio = await computeStudioUsage('user1');
      expect(vault.usedBytes).toBe(0);
      expect(studio.usedBytes).toBe(80000);
    });

    it('hybrid user with both ledgers — independent accounting', async () => {
      mockUploads([
        { fileSizeBytes: 1000, storageLedger: 'vault' },
        { fileSizeBytes: 2000, storageLedger: 'vault' },
        { fileSizeBytes: 5000, storageLedger: 'studio' },
        { fileSizeBytes: 3000, storageLedger: 'studio' },
        { fileSizeBytes: 4000 }, // legacy → vault
      ]);

      const vault = await computeVaultUsage('user1');
      const studio = await computeStudioUsage('user1');
      expect(vault.usedBytes).toBe(7000); // 1000 + 2000 + 4000(legacy)
      expect(vault.usedCount).toBe(3);
      expect(studio.usedBytes).toBe(8000); // 5000 + 3000
      expect(studio.usedCount).toBe(2);
    });
  });
});
