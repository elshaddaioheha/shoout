import MiniPlayer from '@/components/MiniPlayer';
import ModeSelectorSheet from '@/components/ModeSelectorSheet';
import ModeTransitionOverlay from '@/components/ModeTransitionOverlay';
import { useAppSwitcher } from '@/hooks/useAppSwitcher';
import { useUserStore } from '@/store/useUserStore';
import { Tabs } from 'expo-router';
import { Home, Library, MoreHorizontal, Search, ShoppingCart } from 'lucide-react-native';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();

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

  const tabHeight = Platform.OS === 'ios' ? 90 : (60 + insets.bottom);
  const tabPadding = Platform.OS === 'ios' ? insets.bottom : (insets.bottom > 0 ? insets.bottom : 10);

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
        screenOptions={{
          tabBarActiveTintColor: '#EC5C39',
          tabBarInactiveTintColor: '#FFFFFF',
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#140F10',
            borderTopColor: 'rgba(255,255,255,0.05)',
            height: tabHeight,
            paddingBottom: tabPadding,
            elevation: 0,
            shadowOpacity: 0,
            borderTopWidth: 1,
          },
          tabBarLabelStyle: {
            fontFamily: 'Poppins-Regular',
            fontSize: 10,
            display: 'none',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Home size={24} color={color} fill={color === '#EC5C39' ? '#EC5C39' : 'none'} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color }) => <Search size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="marketplace"
          options={{
            title: 'Shop',
            tabBarIcon: ({ color }) => <ShoppingCart size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarIcon: ({ color }) => <Library size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ color }) => <MoreHorizontal size={24} color={color} />,
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
