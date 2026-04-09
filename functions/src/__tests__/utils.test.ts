import {
  convertUsdToNgn,
  convertNgnToUsd,
  roundUsd,
  calculateVat,
  calculateInvoiceTotal,
  calculatePlatformFee,
  calculateCreatorPayout,
  formatNairaAmount,
  formatPlanName,
  formatBillingCycle,
  generateInvoiceNumber,
} from '../utils/formatting';

import {
  normalizeEmail,
  isValidEmail,
  isValidOtpCode,
  isValidPlanId,
  isValidLicenseSku,
  isValidFileSize,
  isValidCheckoutItem,
  isValidCheckoutItems,
  isValidCartTotal,
  isValidPassword,
} from '../utils/validation';

import {
  generateOtpCode,
  hashOtp,
  challengeDocId,
  generateVerificationToken,
  verifyWebhookSignature,
} from '../utils/crypto';

import * as crypto from 'crypto';

// ============================================================================
// Formatting utils
// ============================================================================

describe('formatting utils', () => {
  describe('convertUsdToNgn', () => {
    it('converts and rounds', () => {
      expect(convertUsdToNgn(10)).toBe(16000);
      expect(convertUsdToNgn(0)).toBe(0);
    });

    it('handles fractional USD', () => {
      const result = convertUsdToNgn(4.95);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBe(7920);
    });
  });

  describe('convertNgnToUsd', () => {
    it('converts and rounds to 2 decimal places', () => {
      expect(convertNgnToUsd(16000)).toBe(10);
      expect(convertNgnToUsd(0)).toBe(0);
    });
  });

  describe('roundUsd', () => {
    it('rounds to 2 decimal places', () => {
      expect(roundUsd(1.006)).toBe(1.01);
      expect(roundUsd(1.004)).toBe(1);
      expect(roundUsd(0)).toBe(0);
    });
  });

  describe('calculateVat', () => {
    it('calculates 7.5% VAT and rounds', () => {
      expect(calculateVat(10000)).toBe(750);
      expect(calculateVat(0)).toBe(0);
      expect(calculateVat(1)).toBe(0);
    });
  });

  describe('calculateInvoiceTotal', () => {
    it('returns subtotal + VAT', () => {
      expect(calculateInvoiceTotal(10000)).toBe(10750);
    });
  });

  describe('calculatePlatformFee', () => {
    it('calculates 10% fee and rounds', () => {
      expect(calculatePlatformFee(10000)).toBe(1000);
      expect(calculatePlatformFee(0)).toBe(0);
      expect(calculatePlatformFee(15)).toBe(2);
    });
  });

  describe('calculateCreatorPayout', () => {
    it('returns amount minus platform fee', () => {
      expect(calculateCreatorPayout(10000)).toBe(9000);
    });
  });

  describe('formatNairaAmount', () => {
    it('formats with locale separators', () => {
      const result = formatNairaAmount(100000);
      expect(result).toContain('100');
    });

    it('handles zero', () => {
      expect(formatNairaAmount(0)).toBe('0');
    });
  });

  describe('formatPlanName', () => {
    it('maps known plans', () => {
      expect(formatPlanName('shoout')).toBe('Shoout');
      expect(formatPlanName('vault')).toBe('Vault');
      expect(formatPlanName('vault_pro')).toBe('Vault Pro');
      expect(formatPlanName('studio')).toBe('Studio');
      expect(formatPlanName('hybrid')).toBe('Hybrid');
    });

    it('returns raw string for unknown plans', () => {
      expect(formatPlanName('enterprise')).toBe('enterprise');
    });
  });

  describe('formatBillingCycle', () => {
    it('formats cycles', () => {
      expect(formatBillingCycle('annual')).toBe('Annual');
      expect(formatBillingCycle('monthly')).toBe('Monthly');
    });
  });

  describe('generateInvoiceNumber', () => {
    it('starts with prefix', () => {
      expect(generateInvoiceNumber('SUB').startsWith('SUB-')).toBe(true);
    });

    it('generates unique numbers', () => {
      const a = generateInvoiceNumber('INV');
      const b = generateInvoiceNumber('INV');
      expect(a).not.toBe(b);
    });
  });
});

// ============================================================================
// Validation utils
// ============================================================================

describe('validation utils', () => {
  describe('normalizeEmail', () => {
    it('lowercases and trims', () => {
      expect(normalizeEmail('  Foo@Bar.COM  ')).toBe('foo@bar.com');
    });

    it('handles empty input', () => {
      expect(normalizeEmail('')).toBe('');
    });
  });

  describe('isValidEmail', () => {
    it('accepts valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('no-at-sign')).toBe(false);
      expect(isValidEmail('@missing-local.com')).toBe(false);
    });
  });

  describe('isValidOtpCode', () => {
    it('accepts 6-digit codes', () => {
      expect(isValidOtpCode('123456')).toBe(true);
      expect(isValidOtpCode('000000')).toBe(true);
    });

    it('rejects non-6-digit', () => {
      expect(isValidOtpCode('12345')).toBe(false);
      expect(isValidOtpCode('1234567')).toBe(false);
      expect(isValidOtpCode('abcdef')).toBe(false);
    });
  });

  describe('isValidPlanId', () => {
    it('accepts valid plans', () => {
      expect(isValidPlanId('vault')).toBe(true);
      expect(isValidPlanId('vault_pro')).toBe(true);
      expect(isValidPlanId('studio')).toBe(true);
      expect(isValidPlanId('hybrid')).toBe(true);
    });

    it('rejects unknown plans', () => {
      expect(isValidPlanId('enterprise')).toBe(false);
      expect(isValidPlanId('')).toBe(false);
    });
  });

  describe('isValidLicenseSku', () => {
    it('accepts known SKUs', () => {
      expect(isValidLicenseSku('mp3_tagged')).toBe(true);
    });

    it('rejects unknown SKUs', () => {
      expect(isValidLicenseSku('fake_sku')).toBe(false);
    });
  });

  describe('isValidFileSize', () => {
    it('accepts valid sizes', () => {
      expect(isValidFileSize(1)).toBe(true);
      expect(isValidFileSize(50 * 1024 * 1024)).toBe(true);
    });

    it('rejects invalid sizes', () => {
      expect(isValidFileSize(0)).toBe(false);
      expect(isValidFileSize(-1)).toBe(false);
      expect(isValidFileSize(51 * 1024 * 1024)).toBe(false);
      expect(isValidFileSize(NaN)).toBe(false);
    });
  });

  describe('isValidCheckoutItem', () => {
    const valid = { id: '1', title: 'Track', artist: 'Artist', price: 9.99, uploaderId: 'uid1' };

    it('accepts valid item', () => {
      expect(isValidCheckoutItem(valid)).toBe(true);
    });

    it('rejects missing fields', () => {
      expect(isValidCheckoutItem({})).toBe(false);
      expect(isValidCheckoutItem({ ...valid, id: '' })).toBe(false);
    });

    it('rejects negative price', () => {
      expect(isValidCheckoutItem({ ...valid, price: -1 })).toBe(false);
    });
  });

  describe('isValidCheckoutItems', () => {
    it('rejects empty array', () => {
      expect(isValidCheckoutItems([])).toBe(false);
    });
  });

  describe('isValidCartTotal', () => {
    it('accepts positive finite numbers', () => {
      expect(isValidCartTotal(1)).toBe(true);
    });

    it('rejects zero, negative, NaN', () => {
      expect(isValidCartTotal(0)).toBe(false);
      expect(isValidCartTotal(-5)).toBe(false);
      expect(isValidCartTotal(NaN)).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('requires 6+ characters', () => {
      expect(isValidPassword('123456')).toBe(true);
      expect(isValidPassword('12345')).toBe(false);
    });
  });
});

// ============================================================================
// Crypto utils
// ============================================================================

describe('crypto utils', () => {
  describe('generateOtpCode', () => {
    it('returns 6-digit string', () => {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    });

    it('always 6 characters', () => {
      for (let i = 0; i < 20; i++) {
        expect(generateOtpCode().length).toBe(6);
      }
    });
  });

  describe('hashOtp', () => {
    it('returns hex string', () => {
      expect(hashOtp('123456')).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is deterministic', () => {
      expect(hashOtp('123456')).toBe(hashOtp('123456'));
    });

    it('different codes produce different hashes', () => {
      expect(hashOtp('123456')).not.toBe(hashOtp('654321'));
    });
  });

  describe('challengeDocId', () => {
    it('returns 40-char hex string', () => {
      expect(challengeDocId('signup', 'test@example.com')).toMatch(/^[a-f0-9]{40}$/);
    });

    it('is deterministic', () => {
      expect(challengeDocId('signup', 'a@b.com')).toBe(challengeDocId('signup', 'a@b.com'));
    });

    it('differs by purpose', () => {
      expect(challengeDocId('signup', 'a@b.com')).not.toBe(challengeDocId('password_reset', 'a@b.com'));
    });
  });

  describe('generateVerificationToken', () => {
    it('returns 64-char hex string', () => {
      expect(generateVerificationToken()).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates unique tokens', () => {
      expect(generateVerificationToken()).not.toBe(generateVerificationToken());
    });
  });

  describe('verifyWebhookSignature', () => {
    it('throws when secret is empty', () => {
      expect(() => verifyWebhookSignature('body', 'sig', '')).toThrow(
        'FLUTTERWAVE_SECRET_HASH is not configured'
      );
    });

    it('returns false when signature is missing', () => {
      expect(verifyWebhookSignature('body', undefined, 'secret')).toBe(false);
      expect(verifyWebhookSignature('body', '', 'secret')).toBe(false);
    });

    it('returns true for valid signature', () => {
      const secret = 'test-secret';
      const body = '{"event":"charge.completed"}';
      const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');
      expect(verifyWebhookSignature(body, hash, secret)).toBe(true);
    });

    it('returns false for invalid signature', () => {
      // Must be same length as a sha256 hex digest (64 chars) to not fail on length check
      const fakeHash = 'a'.repeat(64);
      expect(verifyWebhookSignature('body', fakeHash, 'secret')).toBe(false);
    });
  });
});
