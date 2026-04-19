import ModeSelectorSheet from '@/components/ModeSelectorSheet';
import ModeTransitionOverlay from '@/components/ModeTransitionOverlay';
import ResponsiveBottomTabBar from '@/components/ResponsiveBottomTabBar';
import { useAppSwitcher } from '@/hooks/useAppSwitcher';
import { useExplorePlayerStore } from '@/store/useExplorePlayerStore';
import { useUIStore } from '@/store/useUIStore';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, usePathname } from 'expo-router';
import React, { createContext, useContext, useEffect } from 'react';
import { Animated, StyleSheet } from 'react-native';

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
  const setPlayerMode = useUIStore((state) => state.setPlayerMode);
  const pathname = usePathname();

  const shouldHidePlayer = pathname === '/modal'
    || pathname === '/checkout-review'
    || pathname?.startsWith('/listing/');
  const shouldShowPlayer = !isExploreImmersiveMode && !shouldHidePlayer;

  useEffect(() => {
    if (!shouldShowPlayer) {
      setPlayerMode('hidden');
    }
  }, [setPlayerMode, shouldShowPlayer]);

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
});
