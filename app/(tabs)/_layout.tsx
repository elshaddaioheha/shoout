import ModeSelectorSheet from '@/components/ModeSelectorSheet';
import ModeTransitionOverlay from '@/components/ModeTransitionOverlay';
import ResponsiveBottomTabBar from '@/components/ResponsiveBottomTabBar';
import { useAppSwitcher } from '@/hooks/useAppSwitcher';
import { useExplorePlayerStore } from '@/store/useExplorePlayerStore';
import { useUIStore } from '@/store/useUIStore';
import { captureError } from '@/utils/monitoring';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, usePathname } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { InteractionManager, StyleSheet } from 'react-native';
import { ErrorBoundary } from 'react-error-boundary';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import FallbackErrorScreen from '@/components/FallbackErrorScreen';

const TRANSITION_READY_SETTLE_MS = 450;

type SwitcherMode = 'shoout' | 'vault' | 'vault_pro' | 'studio' | 'hybrid';

interface AppSwitcherContextValue {
  openSheet: () => void;
  isModeSheetOpen: boolean;
  viewMode: SwitcherMode;
  currentPlan: SwitcherMode;
  studioAccessLevel: 'free' | 'pro';
  isStudioPaid: boolean;
  overlayProgress: SharedValue<number>;
  welcomeProgress: SharedValue<number>;
  contentProgress: SharedValue<number>;
}

export const AppSwitcherContext = createContext<AppSwitcherContextValue>({
  openSheet: () => { },
  isModeSheetOpen: false,
  viewMode: 'shoout',
  currentPlan: 'shoout',
  studioAccessLevel: 'free',
  isStudioPaid: false,
  overlayProgress: { value: 0 } as SharedValue<number>,
  welcomeProgress: { value: 0 } as SharedValue<number>,
  contentProgress: { value: 1 } as SharedValue<number>,
});

export function useAppSwitcherContext() {
  return useContext(AppSwitcherContext);
}

export default function TabLayout() {
  const {
    sheetVisible,
    transitioning,
    waitingForRender,
    transitionToken,
    transitionSourceMode,
    viewMode,
    currentPlan,
    isModeAccessible,
    transitionTargetMode,
    openSheet,
    closeSheet,
    switchMode,
    notifyTransitionContentReady,
    overlayProgress,
    overlayTranslateX,
    welcomeProgress,
    contentProgress,
    isStudioPaid,
    studioAccessLevel,
  } = useAppSwitcher();
  const isExploreImmersiveMode = useExplorePlayerStore((state) => state.isImmersiveMode);
  const setPlayerMode = useUIStore((state) => state.setPlayerMode);
  const setModeTransitioning = useUIStore((state) => state.setModeTransitioning);
  const pathname = usePathname();
  const lastReadyReportRef = useRef<number | null>(null);
  const readyInteractionHandleRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shouldHidePlayer = pathname === '/modal'
    || pathname === '/checkout-review'
    || pathname?.startsWith('/listing/');
  const shouldShowPlayer = !isExploreImmersiveMode && !shouldHidePlayer;

  useEffect(() => {
    if (!shouldShowPlayer) {
      setPlayerMode('hidden');
    }
  }, [setPlayerMode, shouldShowPlayer]);

  useEffect(() => {
    setModeTransitioning(transitioning);
    return () => {
      setModeTransitioning(false);
    };
  }, [setModeTransitioning, transitioning]);

  const contentShellStyle = useAnimatedStyle(() => ({
    opacity: contentProgress.value,
    transform: [
      {
        scale: interpolate(contentProgress.value, [0, 1], [0.985, 1]),
      },
    ],
  }));

  const contextValue: AppSwitcherContextValue = {
    openSheet,
    isModeSheetOpen: sheetVisible,
    viewMode,
    currentPlan,
    studioAccessLevel,
    isStudioPaid,
    overlayProgress,
    welcomeProgress,
    contentProgress,
  };

  const clearReadySignal = useCallback(() => {
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
    readyInteractionHandleRef.current?.cancel();
    readyInteractionHandleRef.current = null;
  }, []);

  const reportTransitionReady = useCallback(() => {
    if (!transitioning || !waitingForRender) return;
    if (viewMode !== transitionTargetMode) return;
    if (lastReadyReportRef.current === transitionToken) return;

    lastReadyReportRef.current = transitionToken;
    clearReadySignal();
    readyInteractionHandleRef.current = InteractionManager.runAfterInteractions(() => {
      readyTimeoutRef.current = setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            notifyTransitionContentReady({
              mode: viewMode,
              token: transitionToken,
              pathname: pathname ?? '',
            });
          });
        });
      }, TRANSITION_READY_SETTLE_MS);
    });
  }, [clearReadySignal, notifyTransitionContentReady, pathname, transitionTargetMode, transitionToken, transitioning, viewMode, waitingForRender]);

  useEffect(() => {
    if (!transitioning) {
      lastReadyReportRef.current = null;
      clearReadySignal();
      return;
    }
    reportTransitionReady();
  }, [clearReadySignal, reportTransitionReady, transitioning, viewMode, pathname]);

  useEffect(() => {
    return () => {
      clearReadySignal();
    };
  }, [clearReadySignal]);

  const handleTransitionBoundaryError = useCallback((error: unknown, info: { componentStack: string }) => {
    captureError(error instanceof Error ? error : new Error('Unknown tabs boundary error'), {
      scope: 'tabs-mode-transition-boundary',
      message: error instanceof Error ? error.message : String(error),
      viewMode,
      transitionSourceMode,
      transitionTargetMode,
      transitionToken,
      transitioning,
      waitingForRender,
      pathname: pathname ?? '',
      componentStack: info.componentStack,
    });
  }, [pathname, transitionSourceMode, transitionTargetMode, transitionToken, transitioning, viewMode, waitingForRender]);

  // Hide Explore tab when not in Shoout mode
  const isExploreShouldBeHidden = viewMode !== 'shoout' && viewMode !== 'studio' && viewMode !== 'hybrid';

  return (
    <ErrorBoundary
      FallbackComponent={FallbackErrorScreen}
      onError={handleTransitionBoundaryError}
      resetKeys={[viewMode, transitionTargetMode, pathname ?? '', String(transitionToken)]}
    >
      <AppSwitcherContext.Provider value={contextValue}>
        <Animated.View
          onLayout={reportTransitionReady}
          style={[
            styles.contentShell,
            contentShellStyle,
          ]}
        >
          <Tabs
            key={viewMode}
            tabBar={(props: BottomTabBarProps) => <ResponsiveBottomTabBar key={viewMode} {...props} />}
            screenOptions={{
              headerShown: false,
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: 'Home',
              }}
            />
            <Tabs.Screen
              name="search"
              options={{
                title: 'Explore',
                href: isExploreShouldBeHidden ? null : undefined,
              }}
            />
            <Tabs.Screen
              name="cart"
              options={{
                title: 'Cart',
              }}
            />
            <Tabs.Screen
              name="marketplace"
              options={{
                title: 'Market Place',
              }}
            />
            <Tabs.Screen
              name="library"
              options={{
                title: 'Library',
              }}
            />
            <Tabs.Screen
              name="more"
              options={{
                title: 'More',
              }}
            />
            <Tabs.Screen name="profile" options={{ href: null }} />
            <Tabs.Screen name="explore" options={{ href: null }} />
          </Tabs>

        </Animated.View>

        <ModeSelectorSheet
          visible={sheetVisible}
          currentMode={viewMode}
          currentPlan={currentPlan}
          isModeAccessible={isModeAccessible}
          studioAccessLevel={studioAccessLevel}
          isStudioPaid={isStudioPaid}
          onSelect={switchMode}
          onClose={closeSheet}
        />

        <ModeTransitionOverlay
          transitioning={transitioning}
          previousMode={transitionSourceMode}
          newMode={transitionTargetMode}
          waitingForRender={waitingForRender}
          overlayProgress={overlayProgress}
          overlayTranslateX={overlayTranslateX}
          welcomeProgress={welcomeProgress}
        />
      </AppSwitcherContext.Provider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  contentShell: {
    flex: 1,
  },
});
