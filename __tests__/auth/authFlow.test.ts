import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDoc } from 'firebase/firestore';
import { auth } from '@/firebaseConfig';
import { resolveAuthenticatedDestination, resolveUnauthenticatedDestination } from '@/utils/authFlow';

describe('authFlow resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as any).currentUser = null;
  });

  it('routes signed-out first launch to onboarding', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await expect(resolveUnauthenticatedDestination()).resolves.toEqual({
      pathname: '/(auth)/onboarding',
    });
  });

  it('routes signed-out returning users to login', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

    await expect(resolveUnauthenticatedDestination()).resolves.toEqual({
      pathname: '/(auth)/login',
    });
  });

  it('routes authenticated users with pending role selection back to role-selection', async () => {
    (auth as any).currentUser = { uid: 'user-1' };
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        authFlow: {
          needsRoleSelection: true,
        },
      }),
    });

    await expect(resolveAuthenticatedDestination()).resolves.toEqual({
      pathname: '/(auth)/role-selection',
    });
  });

  it('routes studio users with incomplete setup to studio-creation', async () => {
    (auth as any).currentUser = { uid: 'user-2' };
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        authFlow: {
          needsRoleSelection: false,
          selectedExperience: 'studio',
        },
      }),
    });

    await expect(resolveAuthenticatedDestination()).resolves.toEqual({
      pathname: '/(auth)/studio-creation',
      params: { role: 'studio' },
    });
  });

  it('routes fully onboarded users to the redirect destination when provided', async () => {
    (auth as any).currentUser = { uid: 'user-3' };
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        authFlow: {
          needsRoleSelection: false,
          selectedExperience: 'shoout',
          studioSetupCompletedAt: '2026-04-08T00:00:00.000Z',
        },
      }),
    });

    await expect(resolveAuthenticatedDestination('/cart')).resolves.toEqual({
      pathname: '/cart',
    });
  });
});
