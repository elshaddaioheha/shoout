import { getStorageLimitForTier } from '../services/uploadGuard';

describe('uploadGuard service', () => {
  describe('getStorageLimitForTier (vault storage limit)', () => {
    it('returns 0 for shoout (no vault access)', () => {
      expect(getStorageLimitForTier('shoout')).toBe(0);
    });

    it('returns 100MB for vault', () => {
      expect(getStorageLimitForTier('vault')).toBe(100 * 1024 * 1024);
    });

    it('returns 5GB for vault_pro', () => {
      expect(getStorageLimitForTier('vault_pro')).toBe(5 * 1024 * 1024 * 1024);
    });

    it('returns 0 for studio (no vault storage — uses studio ledger)', () => {
      expect(getStorageLimitForTier('studio')).toBe(0);
    });

    it('returns 10GB for hybrid', () => {
      expect(getStorageLimitForTier('hybrid')).toBe(10 * 1024 * 1024 * 1024);
    });
  });
});
