import FullPlayer from '@/components/FullPlayer';
import MiniPlayer from '@/components/MiniPlayer';
import ModeSelectorSheet from '@/components/ModeSelectorSheet';
import ModeTransitionOverlay from '@/components/ModeTransitionOverlay';
import ResponsiveBottomTabBar from '@/components/ResponsiveBottomTabBar';
import VaultMiniPlayer from '@/components/VaultMiniPlayer';
import { useIsLargeScreen } from '@/hooks/use-is-large-screen';
import { useAppSwitcher } from '@/hooks/useAppSwitcher';
import { useExplorePlayerStore } from '@/store/useExplorePlayerStore';
import { useUIStore } from '@/store/useUIStore';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, usePathname } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions } from 'react-native';

type SwitcherMode = 'shoout' | 'vault' | 'vault_pro' | 'studio' | 'hybrid';

interface AppSwitcherContextValue {
  openSheet: () => void;
  isModeSheetOpen: boolean;
  viewMode: SwitcherMode;
  currentPlan: SwitcherMode;
  studioAccessLevel: 'free' | 'pro';
  isStudioPaid: boolean;
  overlayAnim: any;
  welcomeSlideAnim: any;
  welcomeOpacityAnim: any;
  contentFadeAnim: any;
}

export const AppSwitcherContext = createContext<AppSwitcherContextValue>({
  openSheet: () => { },
  isModeSheetOpen: false,
  viewMode: 'shoout',
  currentPlan: 'shoout',
  studioAccessLevel: 'free',
  isStudioPaid: false,
  overlayAnim: null,
  welcomeSlideAnim: null,
  welcomeOpacityAnim: null,
  contentFadeAnim: null,
});

export function useAppSwitcherContext() {
  return useContext(AppSwitcherContext);
}

export default function TabLayout() {
  const {
    sheetVisible,
    transitioning,
    viewMode,
    currentPlan,
    isModeAccessible,
    transitionTargetMode,
    openSheet,
    closeSheet,
    switchMode,
    overlayAnim,
    welcomeSlideAnim,
    welcomeOpacityAnim,
    contentFadeAnim,
    isStudioPaid,
    studioAccessLevel,
  } = useAppSwitcher();
  const isExploreImmersiveMode = useExplorePlayerStore((state) => state.isImmersiveMode);
  const isFullPlayerVisible = useUIStore((state) => state.isFullPlayerVisible);
  const setFullPlayerVisible = useUIStore((state) => state.setFullPlayerVisible);
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const fullPlayerSlideAnim = useRef(new Animated.Value(0)).current;
  const [isFullPlayerMounted, setIsFullPlayerMounted] = useState(false);
  const isLargeScreen = useIsLargeScreen();
  const isNativeLargeScreen = Platform.OS !== 'web' && isLargeScreen;
  const persistentPlayerWidth = Math.max(360, Math.min(520, Math.round(width * 0.36)));

  const shouldHidePlayer = pathname === '/modal'
    || pathname === '/checkout-review'
    || pathname?.startsWith('/listing/');
  const shouldShowPlayer = !isExploreImmersiveMode && !shouldHidePlayer;
  const shouldShowMiniPlayer = shouldShowPlayer && !isFullPlayerVisible;

  useEffect(() => {
    if (shouldHidePlayer && isFullPlayerVisible) {
      setFullPlayerVisible(false);
      setIsFullPlayerMounted(false);
      return;
    }

    if (isNativeLargeScreen) {
      setIsFullPlayerMounted(isFullPlayerVisible);
      fullPlayerSlideAnim.setValue(isFullPlayerVisible ? 1 : 0);
      return;
    }

    if (isFullPlayerVisible) {
      setIsFullPlayerMounted(true);
    }

    Animated.timing(fullPlayerSlideAnim, {
      toValue: isFullPlayerVisible ? 1 : 0,
      duration: isFullPlayerVisible ? 240 : 160,
      easing: isFullPlayerVisible
        ? Easing.out(Easing.cubic)
        : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !isFullPlayerVisible) {
        setIsFullPlayerMounted(false);
      }
    });
  }, [fullPlayerSlideAnim, isFullPlayerVisible, isNativeLargeScreen, setFullPlayerVisible, shouldHidePlayer]);

  const handleCloseFullPlayer = useCallback(() => {
    setFullPlayerVisible(false);
  }, [setFullPlayerVisible]);

  const contextValue: AppSwitcherContextValue = {
    openSheet,
    isModeSheetOpen: sheetVisible,
    viewMode,
    currentPlan,
    studioAccessLevel,
    isStudioPaid,
    overlayAnim,
    welcomeSlideAnim,
    welcomeOpacityAnim,
    contentFadeAnim,
  };

  // Hide Explore tab when not in Shoout mode
  const isExploreShouldBeHidden = viewMode !== 'shoout' && viewMode !== 'studio' && viewMode !== 'hybrid';

  return (
    <AppSwitcherContext.Provider value={contextValue}>
      <Animated.View
        style={[
          styles.contentShell,
          shouldShowPlayer && isNativeLargeScreen && isFullPlayerVisible ? { paddingRight: persistentPlayerWidth } : null,
          {
            opacity: contentFadeAnim,
            transform: [
              {
                scale: contentFadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.985, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Tabs
          tabBar={(props: BottomTabBarProps) => <ResponsiveBottomTabBar {...props} />}
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

        {shouldShowMiniPlayer
          ? ((viewMode === 'vault' || viewMode === 'vault_pro')
            ? <VaultMiniPlayer onPress={() => setFullPlayerVisible(true)} />
            : <MiniPlayer onPress={() => setFullPlayerVisible(true)} />)
          : null}

        {shouldShowPlayer && isFullPlayerMounted ? (
          <Animated.View
            pointerEvents={isFullPlayerVisible ? 'auto' : 'none'}
            style={[
              styles.fullPlayerOverlay,
              isNativeLargeScreen
                ? [
                  styles.fullPlayerPersistentOverlay,
                  {
                    width: persistentPlayerWidth,
                    transform: [
                      {
                        translateX: fullPlayerSlideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [persistentPlayerWidth + 24, 0],
                        }),
                      },
                    ],
                  },
                ]
                : {
                  height,
                  transform: [
                    {
                      translateY: fullPlayerSlideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [height, 0],
                      }),
                    },
                  ],
                },
            ]}
          >
            <FullPlayer
              key={isNativeLargeScreen ? 'full-player-large' : 'full-player-mobile'}
              visible={isFullPlayerMounted}
              persistentMode={isNativeLargeScreen}
              onClose={handleCloseFullPlayer}
            />
          </Animated.View>
        ) : null}
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
        newMode={transitionTargetMode}
        overlayAnim={overlayAnim}
        welcomeSlideAnim={welcomeSlideAnim}
        welcomeOpacityAnim={welcomeOpacityAnim}
      />
    </AppSwitcherContext.Provider>
  );
}

const styles = StyleSheet.create({
  contentShell: {
    flex: 1,
  },
  fullPlayerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 40,
    backgroundColor: '#140F10',
  },
  fullPlayerPersistentOverlay: {
    left: undefined,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.12)',
  },
});
