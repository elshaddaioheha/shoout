import MiniPlayer from '@/components/MiniPlayer';
import ModeSelectorSheet from '@/components/ModeSelectorSheet';
import ModeTransitionOverlay from '@/components/ModeTransitionOverlay';
import ResponsiveBottomTabBar from '@/components/ResponsiveBottomTabBar';
import { useAppSwitcher } from '@/hooks/useAppSwitcher';
import { useUserStore } from '@/store/useUserStore';
import { Tabs } from 'expo-router';
import React from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// Export the switcher context so child screens can open the sheet
import { createContext, useContext } from 'react';

interface AppSwitcherContextValue {
  openSheet: () => void;
  isModeSheetOpen: boolean;
  viewMode: 'vault' | 'studio';
  overlayAnim: any;
  welcomeSlideAnim: any;
  welcomeOpacityAnim: any;
  contentFadeAnim: any;
}

export const AppSwitcherContext = createContext<AppSwitcherContextValue>({
  openSheet: () => { },
  isModeSheetOpen: false,
  viewMode: 'vault',
  overlayAnim: null,
  welcomeSlideAnim: null,
  welcomeOpacityAnim: null,
  contentFadeAnim: null,
});

export function useAppSwitcherContext() {
  return useContext(AppSwitcherContext);
}

export default function TabLayout() {
  const { role } = useUserStore();

  const {
    sheetVisible,
    transitioning,
    viewMode,
    isModeAccessible,
    openSheet,
    closeSheet,
    switchMode,
    overlayAnim,
    welcomeSlideAnim,
    welcomeOpacityAnim,
    contentFadeAnim,
  } = useAppSwitcher();

  const contextValue: AppSwitcherContextValue = {
    openSheet,
    isModeSheetOpen: sheetVisible,
    viewMode,
    overlayAnim,
    welcomeSlideAnim,
    welcomeOpacityAnim,
    contentFadeAnim,
  };

  return (
    <AppSwitcherContext.Provider value={contextValue}>
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
            title: 'Creator',
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
          }}
        />
        {/* Hidden screens */}
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
      </Tabs>

      {/* Mini player floats above tab bar */}
      <MiniPlayer />

      {/* Mode selection bottom sheet */}
      <ModeSelectorSheet
        visible={sheetVisible}
        currentMode={role}
        isModeAccessible={isModeAccessible}
        onSelect={switchMode}
        onClose={closeSheet}
      />

      {/* Full-screen transition overlay */}
      <ModeTransitionOverlay
        transitioning={transitioning}
        newMode={viewMode}
        overlayAnim={overlayAnim}
        welcomeSlideAnim={welcomeSlideAnim}
        welcomeOpacityAnim={welcomeOpacityAnim}
      />
    </AppSwitcherContext.Provider>
  );
}
