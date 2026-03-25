jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// ── useAuthStore mock ────────────────────────────────────────────────────────
// Store spy refs outside getState() so clearAllMocks() doesn't wipe the reference
const mockSetActualRole = jest.fn();
const mockSetSubscriptionData = jest.fn();
const mockSetVerifying = jest.fn();
const mockSetVerificationError = jest.fn();

jest.mock('@/store/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({
      setActualRole: mockSetActualRole,
      setSubscriptionData: mockSetSubscriptionData,
      setVerifying: mockSetVerifying,
      setVerificationError: mockSetVerificationError,
    }),
  },
}));

// ── useUserStore mock ────────────────────────────────────────────────────────
// hydrateSubscriptionTier calls useUserStore.getState().setActualRole + setRole
const mockUserSetActualRole = jest.fn();
const mockUserSetRole = jest.fn();

jest.mock('@/store/useUserStore', () => ({
  useUserStore: {
    getState: () => ({
      setActualRole: mockUserSetActualRole,
      setRole: mockUserSetRole,
    }),
  },
}));

// ── Firebase mocks ───────────────────────────────────────────────────────────
// NOTE: getDoc comes from firebase/firestore, NOT firebase/auth.
// Both modules are remapped to __mocks__/firebase.ts via moduleNameMapper.
import { getAuth } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';

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

    await expect(fetchVerifiedSubscriptionTier()).resolves.toBe('studio');
    expect(mockSetActualRole).toHaveBeenCalledWith('studio');
  });

  it('downgrades to vault when subscribed but expiresAt is in the past', async () => {
    const past = Date.now() - 60_000;
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        tier: 'studio',
        isSubscribed: true,
        expiresAt: { toMillis: () => past },
      }),
    });

    await expect(fetchVerifiedSubscriptionTier()).resolves.toBe('vault');
    expect(mockSetActualRole).toHaveBeenCalledWith('vault');
  });

  it('defaults to vault when no subscription document exists', async () => {
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });

    await expect(fetchVerifiedSubscriptionTier()).resolves.toBe('vault');
    expect(mockSetActualRole).toHaveBeenCalledWith('vault');
  });
});
