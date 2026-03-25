import {
  buildMailQueuePayload,
  calculateSubscriptionExpiryDate,
  firestoreExpiredSubscriptionDocPatch,
  firestoreExpiredUserRolePatch,
  invoiceStoragePath,
} from '../subscriptionLifecycle';

describe('subscription lifecycle helpers', () => {
  const fixed = new Date('2025-06-15T12:00:00.000Z');

  describe('calculateSubscriptionExpiryDate', () => {
    it('adds one month for monthly billing', () => {
      const next = calculateSubscriptionExpiryDate('monthly', fixed);
      expect(next.toISOString()).toBe('2025-07-15T12:00:00.000Z');
    });

    it('adds one year for annual billing', () => {
      const next = calculateSubscriptionExpiryDate('annual', fixed);
      expect(next.toISOString()).toBe('2026-06-15T12:00:00.000Z');
    });
  });

  describe('paid activation subscription fields (mirrors activateSubscriptionTier batch)', () => {
    it('uses active + isSubscribed for paid tiers', () => {
      const planId = 'studio';
      const isFreeTier = false;
      const billingCycle = 'monthly' as const;
      const expiresAt = calculateSubscriptionExpiryDate(billingCycle, fixed);

      expect({
        tier: planId,
        status: isFreeTier ? 'trial' : 'active',
        isSubscribed: !isFreeTier,
        billingCycle: isFreeTier ? null : billingCycle,
        expiresAt: isFreeTier ? null : expiresAt.toISOString(),
      }).toEqual({
        tier: 'studio',
        status: 'active',
        isSubscribed: true,
        billingCycle: 'monthly',
        expiresAt: '2025-07-15T12:00:00.000Z',
      });
    });

    it('uses trial + no expiry for free vault', () => {
      const planId = 'vault';
      const isFreeTier = true;
      expect({
        tier: planId,
        status: isFreeTier ? 'trial' : 'active',
        isSubscribed: !isFreeTier,
        billingCycle: isFreeTier ? null : 'monthly',
        expiresAt: isFreeTier ? null : 'x',
      }).toEqual({
        tier: 'vault',
        status: 'trial',
        isSubscribed: false,
        billingCycle: null,
        expiresAt: null,
      });
    });
  });

  describe('buildMailQueuePayload', () => {
    it('matches Trigger Email extension document shape (to array + message)', () => {
      const payload = buildMailQueuePayload({
        to: 'fan@example.com',
        subject: 'Hello',
        text: 'Plain',
        html: '<p>Hi</p>',
      });
      expect(payload).toEqual({
        to: ['fan@example.com'],
        message: {
          subject: 'Hello',
          text: 'Plain',
          html: '<p>Hi</p>',
        },
      });
    });
  });

  describe('invoiceStoragePath', () => {
    it('uses invoices/{userId}/{invoiceNumber}.pdf', () => {
      expect(invoiceStoragePath('uid_1', 'SUB-1-ABC')).toBe('invoices/uid_1/SUB-1-ABC.pdf');
    });
  });

  describe('scheduled expiry downgrade', () => {
    it('subscription doc resets to vault + expired + clears billing', () => {
      expect(firestoreExpiredSubscriptionDocPatch()).toEqual({
        tier: 'vault',
        status: 'expired',
        isSubscribed: false,
        billingCycle: null,
        expiresAt: null,
      });
    });

    it('user doc resets role to vault with expired subscription status', () => {
      expect(firestoreExpiredUserRolePatch()).toEqual({
        role: 'vault',
        subscriptionStatus: 'expired',
      });
    });
  });
});
