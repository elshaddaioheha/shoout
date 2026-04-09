import { useAuthStore } from '@/store/useAuthStore';
import { authMotionEasing, getAuthMotionDurations } from '@/utils/authMotion';
import { resolveAuthenticatedDestination, resolveUnauthenticatedDestination } from '@/utils/authFlow';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StatusBar, StyleSheet, View } from 'react-native';

const logoSource = require('@/assets/images/logo-rings.png');

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
  const logoTranslateY = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const backdropOpacity = useRef(new Animated.Value(1)).current;

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
        Animated.parallel([
          Animated.timing(logoTranslateY, {
            toValue: reduceMotion ? -10 : -52,
            duration: durations.splashExit,
            easing: authMotionEasing.emphasized,
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: reduceMotion ? 0.98 : 0.92,
            duration: durations.splashExit,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: reduceMotion ? 0 : 0.08,
            duration: durations.splashExit,
            easing: authMotionEasing.standard,
            useNativeDriver: true,
          }),
          Animated.timing(backdropOpacity, {
            toValue: reduceMotion ? 0 : 0.98,
            duration: durations.splashExit,
            easing: authMotionEasing.standard,
            useNativeDriver: true,
          }),
        ]).start(() => resolve());
      });

      router.replace(destination as any);
    };

    resolveAndNavigate().catch(() => {
      hasNavigatedRef.current = false;
      router.replace('/(auth)/login');
    });
  }, [
    backdropOpacity,
    durations.splashExit,
    durations.splashHold,
    hasAuthenticatedUser,
    isAuthResolved,
    logoOpacity,
    logoScale,
    logoTranslateY,
    reduceMotion,
    router,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <StatusBar barStyle={appTheme.isDark ? 'light-content' : 'dark-content'} />
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: Animated.multiply(logoOpacity, backdropOpacity),
            transform: [{ translateY: logoTranslateY }, { scale: logoScale }],
          },
        ]}
      >
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 104,
    height: 104,
  },
});
