import FallbackErrorScreen from '@/components/FallbackErrorScreen';
import GlobalToast from '@/components/GlobalToast';
import PlayerContainer from '@/components/player/PlayerContainer';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUIStore } from '@/store/useUIStore';
import { useUserStore } from '@/store/useUserStore';
import { initNotifications } from '@/utils/notifications';
import { notifyError, notifyWarning } from '@/utils/notify';
import { getDefaultAppModeForPlan } from '@/utils/subscriptions';
import { hydrateSubscriptionTier } from '@/utils/subscriptionVerification';
import { Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState, type ErrorInfo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Animated, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { auth } from '../firebaseConfig';
import { captureError, initMonitoring } from '../utils/monitoring';

if (Platform.OS !== 'web') {
  SplashScreen.setOptions({
    duration: 450,
    fade: true,
  });

  SplashScreen.preventAutoHideAsync().catch(() => {
    // Ignore splash state errors; they should never block app render.
  });
}

function NullStartupFallback() {
  return null;
}

function toStartupError(issue: unknown, scope: string) {
  return issue instanceof Error ? issue : new Error(`[${scope}] ${String(issue ?? 'Unknown startup issue')}`);
}

function StartupProcessBoundary({
  scope,
  onError,
  children,
}: {
  scope: string;
  onError: (scope: string, issue: unknown) => void;
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      FallbackComponent={NullStartupFallback}
      onError={(boundaryError, info) => {
        captureError(boundaryError, {
          scope,
          phase: 'startup-process-boundary',
          componentStack: info.componentStack || '',
        });
        onError(scope, boundaryError);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

function MonitoringStartup({ reportStartupIssue }: { reportStartupIssue: (scope: string, issue: unknown) => void }) {
  useEffect(() => {
    try {
      initMonitoring();
    } catch (issue) {
      const startupError = toStartupError(issue, 'monitoring-init');
      reportStartupIssue('monitoring-init', startupError);
    }
  }, [reportStartupIssue]);

  return null;
}

function NotificationsStartup({ reportStartupIssue }: { reportStartupIssue: (scope: string, issue: unknown) => void }) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    void initNotifications().catch((issue) => {
      const startupError = toStartupError(issue, 'notifications-init');
      reportStartupIssue('notifications-init', startupError);
    });
  }, [reportStartupIssue]);

  return null;
}

function AccessibilityStartup({ reportStartupIssue }: { reportStartupIssue: (scope: string, issue: unknown) => void }) {
  useEffect(() => {
    void useAccessibilityStore
      .getState()
      .initScreenReaderState()
      .catch((issue) => {
        const startupError = toStartupError(issue, 'accessibility-init');
        reportStartupIssue('accessibility-init', startupError);
      });
  }, [reportStartupIssue]);

  return null;
}

function GoogleSigninStartup({ reportStartupIssue }: { reportStartupIssue: (scope: string, issue: unknown) => void }) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
    if (!googleWebClientId) {
      notifyWarning('Google Sign-In not configured: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing.');
      return;
    }

    try {
      GoogleSignin.configure({
        webClientId: googleWebClientId,
      });
    } catch (issue) {
      const startupError = toStartupError(issue, 'google-signin-config');
      reportStartupIssue('google-signin-config', startupError);
    }
  }, [reportStartupIssue]);

  return null;
}

function PlayerBootstrapStartup({ reportStartupIssue }: { reportStartupIssue: (scope: string, issue: unknown) => void }) {
  const [playerBootstrapped, setPlayerBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrapPlayerState = async () => {
      try {
        // Always boot with a clean player UI/audio state to avoid carry-over.
        useUIStore.getState().hidePlayer();
        useUIStore.getState().setModeTransitioning(false);
        await usePlaybackStore.getState().clearTrack();
      } catch (issue) {
        const startupError = toStartupError(issue, 'player-bootstrap');
        reportStartupIssue('player-bootstrap', startupError);
      } finally {
        if (!cancelled) {
          setPlayerBootstrapped(true);
        }
      }
    };

    void bootstrapPlayerState();

    return () => {
      cancelled = true;
    };
  }, [reportStartupIssue]);

  if (!playerBootstrapped) {
    return null;
  }

  return <PlayerContainer />;
}

function AuthBootstrapStartup({ reportStartupIssue }: { reportStartupIssue: (scope: string, issue: unknown) => void }) {
  const setVerifying = useAuthStore((state) => state.setVerifying);
  const setAuthResolved = useAuthStore((state) => state.setAuthResolved);
  const setHasAuthenticatedUser = useAuthStore((state) => state.setHasAuthenticatedUser);
  const resetAuthState = useAuthStore((state) => state.reset);
  const isUserStoreHydrated = useUserStore((state) => state.isHydrated);
  const pendingUserPersistWritesRef = useRef<(() => void)[]>([]);

  const applyPersistedUserWrite = useCallback((write: () => void) => {
    if (useUserStore.getState().isHydrated) {
      write();
      return;
    }

    pendingUserPersistWritesRef.current.push(write);
  }, []);

  useEffect(() => {
    if (!isUserStoreHydrated || pendingUserPersistWritesRef.current.length === 0) {
      return;
    }

    const pendingWrites = pendingUserPersistWritesRef.current.splice(0, pendingUserPersistWritesRef.current.length);
    pendingWrites.forEach((write) => {
      try {
        write();
      } catch (issue) {
        const startupError = toStartupError(issue, 'user-store-persist-queue');
        reportStartupIssue('user-store-persist-queue', startupError);
        notifyWarning('[layout] user-store-persist-queue', startupError);
      }
    });
  }, [isUserStoreHydrated, reportStartupIssue]);

  useEffect(() => {
    let settled = false;
    const settleAuthBootstrap = (hasUser: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      setHasAuthenticatedUser(hasUser);
      setAuthResolved(true);
      setVerifying(false);
    };

    const authTimeout = setTimeout(() => {
      notifyWarning('[layout] Auth timeout - proceeding after 5s.', null);
      settleAuthBootstrap(Boolean(auth.currentUser));
    }, 5000);

    let unsub: (() => void) | null = null;

    try {
      unsub = onAuthStateChanged(auth, async (user) => {
        try {
          if (user) {
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
              applyPersistedUserWrite(() => {
                useUserStore.getState().setActiveAppMode('shoout');
              });
            }

            const verifiedPlan = useAuthStore.getState().actualRole || 'shoout';
            const currentMode = useUserStore.getState().activeAppMode;
            const preferredMode = currentMode === 'shoout' ? currentMode : getDefaultAppModeForPlan(verifiedPlan);
            applyPersistedUserWrite(() => {
              useUserStore.getState().setActiveAppMode(preferredMode);
            });

            const displayName = user.displayName?.trim() || 'User';
            applyPersistedUserWrite(() => {
              useUserStore.getState().setName(displayName);
            });
          } else {
            resetAuthState();
            useUserStore.getState().reset();
          }
        } catch (issue) {
          const startupError = toStartupError(issue, 'auth-bootstrap');
          reportStartupIssue('auth-bootstrap', startupError);
          notifyWarning('[layout] auth-bootstrap', startupError);
        } finally {
          settleAuthBootstrap(Boolean(user));
        }
      });
    } catch (issue) {
      const startupError = toStartupError(issue, 'auth-listener');
      reportStartupIssue('auth-listener', startupError);
      notifyWarning('[layout] auth-listener', startupError);
      settleAuthBootstrap(Boolean(auth.currentUser));
    }

    return () => {
      settled = true;
      unsub?.();
      clearTimeout(authTimeout);
      pendingUserPersistWritesRef.current = [];
    };
  }, [
    applyPersistedUserWrite,
    reportStartupIssue,
    resetAuthState,
    setAuthResolved,
    setHasAuthenticatedUser,
    setVerifying,
  ]);

  return null;
}
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const splashHidden = useRef(false);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const [startupFallbackReady, setStartupFallbackReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Light': Poppins_300Light,
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  const [loaded, error] = [fontsLoaded, fontError];
  const startupReady = loaded || error || startupFallbackReady;
  const reportStartupIssue = useCallback((scope: string, issue: unknown) => {
    const startupError = issue instanceof Error ? issue : new Error(String(issue ?? 'Unknown startup issue'));
    captureError(startupError, {
      scope,
      phase: 'startup',
    });
    notifyWarning(`[layout] ${scope}`, startupError);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setStartupFallbackReady(true);
    }, 4000);

    return () => clearTimeout(timeout);
  }, []);


  useEffect(() => {
    if (!startupReady || splashHidden.current) {
      return;
    }

    splashHidden.current = true;

    const hideSplashAndReveal = async () => {
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
    };

    void hideSplashAndReveal();
  }, [contentOpacity, startupReady]);

  if (!startupReady) {
    return null;
  }

  const handleRootBoundaryError = (boundaryError: unknown, info: ErrorInfo) => {
    captureError(boundaryError instanceof Error ? boundaryError : new Error('Unknown root boundary error'), {
      scope: 'root-layout-boundary',
      message: boundaryError instanceof Error ? boundaryError.message : String(boundaryError),
      componentStack: info.componentStack || '',
    });
  };

  return (
    <ErrorBoundary FallbackComponent={FallbackErrorScreen} onError={handleRootBoundaryError}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <StartupProcessBoundary scope="monitoring-init" onError={reportStartupIssue}>
                <MonitoringStartup reportStartupIssue={reportStartupIssue} />
              </StartupProcessBoundary>
              <StartupProcessBoundary scope="notifications-init" onError={reportStartupIssue}>
                <NotificationsStartup reportStartupIssue={reportStartupIssue} />
              </StartupProcessBoundary>
              <StartupProcessBoundary scope="accessibility-init" onError={reportStartupIssue}>
                <AccessibilityStartup reportStartupIssue={reportStartupIssue} />
              </StartupProcessBoundary>
              <StartupProcessBoundary scope="google-signin-config" onError={reportStartupIssue}>
                <GoogleSigninStartup reportStartupIssue={reportStartupIssue} />
              </StartupProcessBoundary>
              <StartupProcessBoundary scope="auth-bootstrap" onError={reportStartupIssue}>
                <AuthBootstrapStartup reportStartupIssue={reportStartupIssue} />
              </StartupProcessBoundary>
              <StartupProcessBoundary scope="player-bootstrap" onError={reportStartupIssue}>
                <PlayerBootstrapStartup reportStartupIssue={reportStartupIssue} />
              </StartupProcessBoundary>
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
              <StatusBar style="auto" />
            </ThemeProvider>
          </Animated.View>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
