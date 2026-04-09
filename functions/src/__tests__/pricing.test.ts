import { parseCartItemId, validateCartTotalMatch } from '../services/pricing';
import { getExpectedAmountNgn } from '../subscriptions/lifecycle';

describe('pricing service', () => {
  describe('parseCartItemId', () => {
    it('extracts uploadId when no license suffix', () => {
      expect(parseCartItemId('track123')).toEqual({ uploadId: 'track123', licenseSku: null });
    });

    it('extracts uploadId and licenseSku', () => {
      expect(parseCartItemId('track123_mp3_tagged')).toEqual({ uploadId: 'track123', licenseSku: 'mp3_tagged' });
    });

    it('extracts longest matching SKU', () => {
      expect(parseCartItemId('track123_unlimited_stems_9_free')).toEqual({ uploadId: 'track123', licenseSku: 'unlimited_stems_9_free' });
    });

    it('handles empty string', () => {
      expect(parseCartItemId('')).toEqual({ uploadId: '', licenseSku: null });
    });
  });

  describe('getExpectedAmountNgn (from lifecycle)', () => {
    it('returns 0 for free plans', () => {
      expect(getExpectedAmountNgn('shoout', 'monthly')).toBe(0);
      expect(getExpectedAmountNgn('vault', 'monthly')).toBe(0);
      expect(getExpectedAmountNgn('vault', 'annual')).toBe(0);
    });

    it('returns positive amount for paid tiers', () => {
      const monthly = getExpectedAmountNgn('vault_pro', 'monthly');
      expect(monthly).toBeGreaterThan(0);
      expect(Number.isInteger(monthly)).toBe(true);
    });

    it('annual is less than monthly * 12 for discounted plans', () => {
      const studioMonthly = getExpectedAmountNgn('studio', 'monthly');
      const studioAnnual = getExpectedAmountNgn('studio', 'annual');
      expect(studioAnnual).toBeLessThan(studioMonthly * 12);
    });
  });

  describe('validateCartTotalMatch', () => {
    it('passes when totals match exactly', () => {
      expect(() => validateCartTotalMatch(9.99, 9.99)).not.toThrow();
    });

    it('passes within epsilon tolerance', () => {
      expect(() => validateCartTotalMatch(9.99, 10.0)).not.toThrow();
    });

    it('throws when totals differ beyond epsilon', () => {
      expect(() => validateCartTotalMatch(9.99, 10.5)).toThrow();
    });
  });
});
