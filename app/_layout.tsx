import GlobalToast from '@/components/GlobalToast';
import PlayerContainer from '@/components/player/PlayerContainer';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { getLastNotification, initNotifications, subscribeToNotifications } from '@/utils/notifications';
import { notifyError, notifyWarning } from '@/utils/notify';
import { getDefaultAppModeForPlan } from '@/utils/subscriptions';
import { hydrateSubscriptionTier } from '@/utils/subscriptionVerification';
import { Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { auth } from '../firebaseConfig';
import { initMonitoring } from '../utils/monitoring';

if (Platform.OS !== 'web') {
  SplashScreen.setOptions({
    duration: 450,
    fade: true,
  });

  SplashScreen.preventAutoHideAsync().catch(() => {
    // Ignore splash state errors; they should never block app render.
  });
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { setVerifying, setAuthResolved, setHasAuthenticatedUser, reset: resetAuthState } = useAuthStore();
  const splashHidden = useRef(false);
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Light': Poppins_300Light,
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  const [loaded, error] = [fontsLoaded, fontError];

  useEffect(() => {
    initMonitoring();
    if (Platform.OS !== 'web') {
      initNotifications();
    }
    useAccessibilityStore.getState().initScreenReaderState();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const unsubscribe = subscribeToNotifications((notification) => {
      const data = notification.request.content.data as any;
      if (data?.route) {
        router.push(data.route);
      }
    });

    getLastNotification().then((response) => {
      if (response) {
        const data = response.notification.request.content.data as any;
        if (data?.route) {
          router.push(data.route);
        }
      }
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (!loaded && !error) return;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setHasAuthenticatedUser(true);
        try {
          setVerifying(true);
          await hydrateSubscriptionTier();
        } catch (verifyError) {
          notifyError('Failed to verify subscription tier', verifyError, 'We could not verify your subscription. Using Shoout mode for now.');
          useAuthStore.getState().setActualRole('shoout');
          useAuthStore.getState().setSubscriptionData({
            tier: 'shoout',
            isSubscribed: false,
            expiresAt: null,
          });
          useUserStore.getState().setActualRole('shoout');
          useUserStore.getState().setRole('shoout');
          useUserStore.getState().setActiveAppMode('shoout');
        } finally {
          setVerifying(false);
        }

        const verifiedPlan = useAuthStore.getState().actualRole || 'shoout';
        const currentMode = useUserStore.getState().activeAppMode;
        const preferredMode = currentMode === 'shoout' ? currentMode : getDefaultAppModeForPlan(verifiedPlan);
        useUserStore.getState().setActiveAppMode(preferredMode);

        const displayName = user.displayName?.trim() || 'User';
        useUserStore.getState().setName(displayName);
      } else {
        resetAuthState();
        setHasAuthenticatedUser(false);
        useUserStore.getState().reset();
      }

      setAuthResolved(true);
    });

    const authTimeout = setTimeout(() => {
      notifyWarning('[layout] Auth timeout - proceeding after 5s.', null, 'Network is slow. Some subscription details may take a moment to update.');
      setHasAuthenticatedUser(Boolean(auth.currentUser));
      setAuthResolved(true);
      setVerifying(false);
    }, 5000);

    return () => {
      unsub();
      clearTimeout(authTimeout);
    };
  }, [loaded, error, resetAuthState, setAuthResolved, setHasAuthenticatedUser, setVerifying]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
      if (!googleWebClientId) {
        notifyWarning('Google Sign-In not configured: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing.');
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

    if (Platform.OS !== 'web') {
      try {
        await SplashScreen.hideAsync();
      } catch (splashError) {
        notifyWarning('[layout] Failed to hide splash screen', splashError);
      }
    }

    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [loaded, error, contentOpacity]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View style={{ flex: 1, opacity: contentOpacity }} onLayout={onRootLayout}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack
          initialRouteName="index"
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="(auth)/onboarding" options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="(auth)/role-selection" options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="(auth)/login" options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="(auth)/signup" options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="(auth)/studio-creation" options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="(auth)/forgot-password" />
          <Stack.Screen name="(auth)/forgot-password-code" />
          <Stack.Screen name="(auth)/reset-password" />
          <Stack.Screen name="(auth)/signup-otp" options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="settings/payment-methods" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/subscriptions" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/downloads" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/localization" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/help-center" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/appearance" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/notifications" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/privacy" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="studio/analytics" />
          <Stack.Screen name="studio/ads-intro" />
          <Stack.Screen name="studio/ads-creation" />
          <Stack.Screen name="studio/ads-success" />
          <Stack.Screen name="studio/ads-example" />
          <Stack.Screen name="studio/earnings" />
          <Stack.Screen name="studio/upload" />
          <Stack.Screen name="studio/withdraw" />
          <Stack.Screen name="studio/messages" />
          <Stack.Screen name="studio/message-thread" />
          <Stack.Screen name="studio/settings" />
          <Stack.Screen name="vault/upload" />
          <Stack.Screen name="vault/convert" />
          <Stack.Screen name="vault/record" />
          <Stack.Screen name="vault/links" />
          <Stack.Screen name="vault/updates" />
          <Stack.Screen name="vault/folder/[id]" />
          <Stack.Screen name="vault/track/[id]" />
          <Stack.Screen name="chat/index" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="merch/index" />
          <Stack.Screen name="profile/[id]" />
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
          <PlayerContainer />
          <StatusBar style="auto" />
        </ThemeProvider>
      </Animated.View>
    </GestureHandlerRootView>
  );
}
