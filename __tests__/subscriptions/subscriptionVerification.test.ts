jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/store/useAuthStore', () => {
  const setActualRole = jest.fn();
  const setSubscriptionData = jest.fn();
  const setVerifying = jest.fn();
  const setVerificationError = jest.fn();
  return {
    useAuthStore: {
      getState: () => ({
        setActualRole,
        setSubscriptionData,
        setVerifying,
        setVerificationError,
      }),
    },
  };
});

import { getAuth, getDoc } from 'firebase/auth';

import { fetchVerifiedSubscriptionTier } from '@/utils/subscriptionVerification';

describe('fetchVerifiedSubscriptionTier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({ currentUser: { uid: 'u1' } });
    (getDoc as jest.Mock).mockReset();
  });

  it('returns tier and does not downgrade when subscription is active and not past expiresAt', async () => {
    const future = Date.now() + 60_000;
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        tier: 'studio',
        isSubscribed: true,
        expiresAt: { toMillis: () => future },
      }),
    });

    const { useAuthStore } = require('@/store/useAuthStore');
    const setActualRole = useAuthStore.getState().setActualRole;

    await expect(fetchVerifiedSubscriptionTier()).resolves.toBe('studio');
    expect(setActualRole).toHaveBeenCalledWith('studio');
  });

  it('downgrades client view to vault when subscribed but expiresAt is in the past', async () => {
    const past = Date.now() - 60_000;
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        tier: 'studio',
        isSubscribed: true,
        expiresAt: { toMillis: () => past },
      }),
    });

    const { useAuthStore } = require('@/store/useAuthStore');
    const setActualRole = useAuthStore.getState().setActualRole;

    await expect(fetchVerifiedSubscriptionTier()).resolves.toBe('vault');
    expect(setActualRole).toHaveBeenCalledWith('vault');
  });
});
