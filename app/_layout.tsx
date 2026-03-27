import GlobalToast from '@/components/GlobalToast';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';
import 'react-native-reanimated';
import { auth } from '../firebaseConfig';
import { hydrateSubscriptionTier } from '@/utils/subscriptionVerification';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';

/**
 * Shared flag — set to true by login/signup/social screens immediately before
 * calling router.replace() so that the onAuthStateChanged listener below
 * knows navigation has already been handled and won't fire a second redirect.
 * Reset to false once the listener has read it.
 */
export const authNavigationHandled = { current: false };

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [authResolved, setAuthResolved] = useState(false);
  const { setVerifying } = useAuthStore();
  // Tracks whether this is the very first auth event (cold start vs re-auth)
  const isFirstAuthEvent = useRef(true);
  const splashHidden = useRef(false);
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const [loaded, error] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  useEffect(() => {
    // Do not start auth-driven navigation until fonts are ready and
    // the root navigator can mount safely.
    if (!loaded && !error) return;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is authenticated — fetch and verify their subscription tier from server
        try {
          setVerifying(true);
          await hydrateSubscriptionTier();
        } catch (error) {
          console.error('Failed to verify subscription tier:', error);
          // Even if verification fails, allow user to proceed with free tier
          useAuthStore.getState().setActualRole('vault');
          useAuthStore.getState().setSubscriptionData({
            tier: 'vault',
            isSubscribed: false,
            expiresAt: null,
          });
          useUserStore.getState().setActualRole('vault');
          useUserStore.getState().setRole('vault');
        } finally {
          setVerifying(false);
        }

        // Populate name from Firebase Auth so every screen shows the real name,
        // not the default 'User' hardcoded in the store.
        const displayName = user.displayName?.trim() || 'User';
        useUserStore.getState().setName(displayName);

        // Only navigate if the auth screen hasn't already redirected.
        if (!authNavigationHandled.current) {
          router.replace('/(tabs)');
        }
        authNavigationHandled.current = false;
      } else {
        // No authenticated user — redirect to login on initial load only.
        if (isFirstAuthEvent.current) {
          router.replace('/(auth)/onboarding');
        }
      }

      isFirstAuthEvent.current = false;
      setAuthResolved(true);
    });

    // Safety timeout: if Firebase auth doesn't respond within 5 seconds
    // (common on web due to network/CORS issues), force the app to render
    // so the user isn't stuck on a blank screen.
    const authTimeout = setTimeout(() => {
      setAuthResolved((prev) => {
        if (!prev) {
          console.warn('[layout] Auth timeout — forcing render. User may not be logged in.');
          router.replace('/(auth)/onboarding');
        }
        return true;
      });
    }, 3000);

    return () => {
      unsub();
      clearTimeout(authTimeout);
    };
  }, [loaded, error, router, setVerifying]);

  useEffect(() => {
    // Configure Google Sign-In (native only — web support requires a paid sponsor tier)
    if (Platform.OS !== 'web') {
      const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
      if (!googleWebClientId) {
        console.warn('Google Sign-In not configured: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing.');
      }
      GoogleSignin.configure({
        webClientId: googleWebClientId || '',
      });
    }
  }, [loaded, error]);

  const onRootLayout = useCallback(async () => {
    if (!loaded && !error) return;
    if (splashHidden.current) return;
    splashHidden.current = true;
    await SplashScreen.hideAsync();
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [loaded, error, contentOpacity]);

  // Block render until fonts are ready — but do NOT block on authResolved.
  // The navigator must be mounted first so that router.replace() calls from
  // the auth listener (or the timeout) have a Stack to navigate into.
  if (!loaded && !error) {
    return null;
  }

  return (
    <Animated.View style={{ flex: 1, opacity: contentOpacity }} onLayout={onRootLayout}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack initialRouteName="index">
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/role-selection" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/studio-creation" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/forgot-password-code" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/reset-password" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/signup-otp" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
          <Stack.Screen name="settings/payment-methods" options={{ headerShown: false }} />
          <Stack.Screen name="settings/subscriptions" options={{ headerShown: false }} />
          <Stack.Screen name="settings/notifications" options={{ headerShown: false }} />
          <Stack.Screen name="settings/privacy" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="studio/analytics" options={{ headerShown: false }} />
          <Stack.Screen name="studio/ads-intro" options={{ headerShown: false }} />
          <Stack.Screen name="studio/ads-creation" options={{ headerShown: false }} />
          <Stack.Screen name="studio/ads-success" options={{ headerShown: false }} />
          <Stack.Screen name="studio/ads-example" options={{ headerShown: false }} />
          <Stack.Screen name="studio/earnings" options={{ headerShown: false }} />
          <Stack.Screen name="studio/upload" options={{ headerShown: false }} />
          <Stack.Screen name="studio/withdraw" options={{ headerShown: false }} />
          <Stack.Screen name="studio/messages" options={{ headerShown: false }} />
          <Stack.Screen name="studio/message-thread" options={{ headerShown: false }} />
          <Stack.Screen name="cart" options={{ headerShown: false }} />
          <Stack.Screen name="chat/index" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="merch/index" options={{ headerShown: false }} />
          <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="listing/[id]"
            options={{
              headerShown: false,
              presentation: 'transparentModal',
              animation: 'slide_from_bottom',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <GlobalToast />
        <StatusBar style="auto" />
      </ThemeProvider>
    </Animated.View>
  );
}

