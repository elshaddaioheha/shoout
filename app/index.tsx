import { useAuthStore } from '@/store/useAuthStore';
import { authMotionEasing, getAuthMotionDurations } from '@/utils/authMotion';
import { resolveAuthenticatedDestination, resolveUnauthenticatedDestination } from '@/utils/authFlow';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StatusBar, StyleSheet, View } from 'react-native';

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

      const destination = hasAuthenticatedUser
        ? await resolveAuthenticatedDestination()
        : await resolveUnauthenticatedDestination();

      await wait(durations.splashHold);

      await new Promise<void>((resolve) => {
        Animated.timing(opacity, {
          toValue: reduceMotion ? 0 : 0,
          duration: durations.splashExit,
          easing: authMotionEasing.standard,
          useNativeDriver: true,
        }).start(() => resolve());
      });

      router.replace(destination as any);
    };

    resolveAndNavigate().catch(() => {
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
