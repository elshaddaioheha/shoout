import { useAppTheme } from '@/hooks/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useAuthStore } from '@/store/useAuthStore';
import {
    resolveAuthenticatedDestination,
    resolveUnauthenticatedDestination,
    type AuthDestination,
} from '@/utils/authFlow';
import { authMotionEasing, getAuthMotionDurations } from '@/utils/authMotion';
import { useRootNavigationState, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, StatusBar, StyleSheet, View } from 'react-native';

const lightSplash = require('@/assets/images/ShooutS-2-splash-light (1).jpg.jpeg');
const darkSplash = require('@/assets/images/ShooutS-1-splash-black.jpg.jpeg');

export const STARTUP_DESTINATION_TIMEOUT_MS = 8000;
export const STARTUP_FALLBACK_DESTINATION: AuthDestination = { pathname: '/(auth)/login' };

export function getStartupFallbackDestination(hasAuthenticatedUser: boolean): AuthDestination {
  return hasAuthenticatedUser ? { pathname: '/(tabs)' } : STARTUP_FALLBACK_DESTINATION;
}

function wait(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

export async function resolveStartupDestinationWithDeadline(
  resolveDestination: () => Promise<AuthDestination>,
  timeoutMs: number = STARTUP_DESTINATION_TIMEOUT_MS,
  fallbackDestination: AuthDestination = STARTUP_FALLBACK_DESTINATION
): Promise<AuthDestination> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      resolveDestination(),
      new Promise<AuthDestination>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallbackDestination), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

export default function AuthEntryScreen() {
  const appTheme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const isNavigationReady = Boolean(rootNavigationState?.key);
  const { hasAuthenticatedUser, isAuthResolved } = useAuthStore();
  const durations = getAuthMotionDurations(reduceMotion);
  const hasNavigatedRef = useRef(false);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isAuthResolved || !isNavigationReady || hasNavigatedRef.current) {
      return;
    }

    let cancelled = false;

    const resolveAndNavigate = async () => {
      hasNavigatedRef.current = true;
      const fallbackDestination = getStartupFallbackDestination(hasAuthenticatedUser);

      let destination: AuthDestination;
      try {
        destination = await resolveStartupDestinationWithDeadline(() =>
          hasAuthenticatedUser ? resolveAuthenticatedDestination() : resolveUnauthenticatedDestination(),
          STARTUP_DESTINATION_TIMEOUT_MS,
          fallbackDestination
        );
      } catch (err) {
        console.error('[Startup] Failed to resolve auth destination:', err);
        destination = fallbackDestination;
      }

      if (cancelled) {
        hasNavigatedRef.current = false;
        return;
      }

      await wait(durations.splashHold);

      if (cancelled) {
        hasNavigatedRef.current = false;
        return;
      }

      try {
        let animationTimeoutId: ReturnType<typeof setTimeout> | null = null;
        const animationTimeoutPromise = new Promise<void>((_, reject) => {
          animationTimeoutId = setTimeout(
            () => reject(new Error('Animation timeout')),
            durations.splashExit + 500
          );
        });

        await Promise.race([
          new Promise<void>((resolve) => {
            Animated.timing(opacity, {
              toValue: 0,
              duration: durations.splashExit,
              easing: authMotionEasing.standard,
              useNativeDriver: true,
            }).start(() => {
              if (animationTimeoutId !== null) {
                clearTimeout(animationTimeoutId);
                animationTimeoutId = null;
              }
              resolve();
            });
          }),
          animationTimeoutPromise,
        ]);
      } catch (animErr) {
        console.warn('[Startup] Animation skipped or timed out:', animErr);
      }

      if (cancelled) {
        hasNavigatedRef.current = false;
        return;
      }

      router.replace(destination as any);
    };

    resolveAndNavigate().catch((globalErr) => {
      console.error('[Startup] Critical error resolving splash navigation:', globalErr);
      hasNavigatedRef.current = false;
      if (!cancelled) {
        router.replace('/(auth)/login');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    durations.splashExit,
    durations.splashHold,
    hasAuthenticatedUser,
    isNavigationReady,
    isAuthResolved,
    opacity,
    router,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <StatusBar barStyle={appTheme.isDark ? 'light-content' : 'dark-content'} />
      <Animated.Image
        source={appTheme.isDark ? darkSplash : lightSplash}
        style={[StyleSheet.absoluteFill, { opacity }]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
