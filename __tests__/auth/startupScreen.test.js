import { cleanup, render } from '@testing-library/react-native/pure';
import React from 'react';
import { Animated } from 'react-native';
import AuthEntryScreen, {
  resolveStartupDestinationWithDeadline,
  STARTUP_DESTINATION_TIMEOUT_MS,
  STARTUP_FALLBACK_DESTINATION,
} from '@/app/index';
import { resolveAuthenticatedDestination } from '@/utils/authFlow';

const mockReplace = jest.fn();

let mockRootNavigationKey = 'root-nav-key';
let mockAuthState = {
  hasAuthenticatedUser: true,
  isAuthResolved: true,
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useRootNavigationState: () => (mockRootNavigationKey ? { key: mockRootNavigationKey } : undefined),
}));

jest.mock('@/store/useAuthStore', () => ({
  useAuthStore: () => mockAuthState,
}));

jest.mock('@/hooks/use-app-theme', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      background: '#ffffff',
    },
  }),
}));

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => false,
}));

jest.mock('@/utils/authMotion', () => ({
  authMotionEasing: { standard: undefined },
  getAuthMotionDurations: () => ({
    splashHold: 0,
    splashExit: 0,
  }),
}));

jest.mock('@/utils/authFlow', () => ({
  resolveAuthenticatedDestination: jest.fn(),
  resolveUnauthenticatedDestination: jest.fn(),
}));

const mockedResolveAuthenticatedDestination = resolveAuthenticatedDestination;

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

async function finishStartupNavigation() {
  await flushMicrotasks();
  jest.runOnlyPendingTimers();
  await flushMicrotasks();
  jest.runOnlyPendingTimers();
  await flushMicrotasks();
}

describe('startup destination deadline', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('returns /(tabs) fallback when destination resolution exceeds 3000ms', async () => {
    const destinationPromise = resolveStartupDestinationWithDeadline(
      () => new Promise(() => undefined),
      STARTUP_DESTINATION_TIMEOUT_MS
    );

    jest.advanceTimersByTime(STARTUP_DESTINATION_TIMEOUT_MS);

    await expect(destinationPromise).resolves.toEqual(STARTUP_FALLBACK_DESTINATION);
  });

  it('returns resolver result when it completes before timeout', async () => {
    await expect(
      resolveStartupDestinationWithDeadline(async () => ({ pathname: '/(auth)/role-selection' }))
    ).resolves.toEqual({ pathname: '/(auth)/role-selection' });
  });
});

describe('AuthEntryScreen startup orchestration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockRootNavigationKey = 'root-nav-key';
    mockAuthState = { hasAuthenticatedUser: true, isAuthResolved: true };

    jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: (callback) => callback?.({ finished: true }),
      stop: jest.fn(),
      reset: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    cleanup();
  });

  it('does not navigate before root navigation state is ready', () => {
    mockRootNavigationKey = undefined;

    render(<AuthEntryScreen />);

    expect(mockedResolveAuthenticatedDestination).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('navigates to /(tabs) fallback when resolver misses startup deadline', async () => {
    mockedResolveAuthenticatedDestination.mockImplementation(() => new Promise(() => undefined));

    render(<AuthEntryScreen />);

    jest.advanceTimersByTime(STARTUP_DESTINATION_TIMEOUT_MS + 10);
    await finishStartupNavigation();

    expect(mockReplace).toHaveBeenCalledWith(STARTUP_FALLBACK_DESTINATION);
  });

  it('navigates to resolved authenticated destination on success', async () => {
    mockedResolveAuthenticatedDestination.mockResolvedValue({ pathname: '/(auth)/studio-creation' });

    render(<AuthEntryScreen />);

    await finishStartupNavigation();

    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/(auth)/studio-creation' });
  });

  it('clears animation timeout timer when animation resolves first', async () => {
    mockedResolveAuthenticatedDestination.mockResolvedValue({ pathname: '/(tabs)/index' });

    const animationTimerIds = [];
    const realSetTimeout = global.setTimeout;
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((handler, timeout, ...args) => {
      const id = realSetTimeout(handler, timeout, ...args);
      if (timeout === 500) {
        animationTimerIds.push(id);
      }
      return id;
    });
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    render(<AuthEntryScreen />);

    await finishStartupNavigation();

    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/(tabs)/index' });

    expect(animationTimerIds.length).toBeGreaterThan(0);
    animationTimerIds.forEach((timerId) => {
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timerId);
    });

    setTimeoutSpy.mockRestore();
  });
});
