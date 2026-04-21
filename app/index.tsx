import { useAppTheme } from '@/hooks/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { resolveAuthenticatedDestination, resolveUnauthenticatedDestination } from '@/utils/authFlow';
import { authMotionEasing, getAuthMotionDurations } from '@/utils/authMotion';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, StatusBar, StyleSheet, View } from 'react-native';

const lightSplash = require('@/assets/images/ShooutS-2-splash-light (1).jpg.jpeg');
const darkSplash = require('@/assets/images/ShooutS-1-splash-black.jpg.jpeg');

function wait(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

export default function AuthEntryScreen() {
  const appTheme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const { hasAuthenticatedUser, isAuthResolved } = useAuthStore();
  const durations = getAuthMotionDurations(reduceMotion);
  const hasNavigatedRef = useRef(false);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isAuthResolved || hasNavigatedRef.current) {
      return;
    }

    const resolveAndNavigate = async () => {
      hasNavigatedRef.current = true;

      let destination: any;
      try {
        destination = hasAuthenticatedUser
          ? await resolveAuthenticatedDestination()
          : await resolveUnauthenticatedDestination();
      } catch (err) {
        console.error('[Startup] Failed to resolve auth destination:', err);
        destination = { pathname: '/(tabs)/index' };
      }

      await wait(durations.splashHold);

      try {
        await Promise.race([
          new Promise<void>((resolve) => {
            Animated.timing(opacity, {
              toValue: 0,
              duration: durations.splashExit,
              easing: authMotionEasing.standard,
              useNativeDriver: true,
            }).start(() => resolve());
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Animation timeout')), durations.splashExit + 500))
        ]);
      } catch (animErr) {
        console.warn('[Startup] Animation skipped or timed out:', animErr);
      }

      router.replace(destination as any);
    };

    resolveAndNavigate().catch((globalErr) => {
      console.error('[Startup] Critical error resolving splash navigation:', globalErr);
      hasNavigatedRef.current = false;
      router.replace('/(auth)/login');
    });
  }, [
    durations.splashExit,
    durations.splashHold,
    hasAuthenticatedUser,
    isAuthResolved,
    opacity,
    reduceMotion,
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
