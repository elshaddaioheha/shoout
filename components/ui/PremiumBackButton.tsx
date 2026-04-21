import React from 'react';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { ROUTES } from '@/utils/routes';

export interface PremiumBackButtonProps {
  variant?: 'solid' | 'glass' | 'transparent';
  onPressOverride?: () => void;
  containerStyle?: ViewStyle;
}

export function PremiumBackButton({
  variant = 'transparent',
  onPressOverride,
  containerStyle,
}: PremiumBackButtonProps) {
  const router = useRouter();
  const appTheme = useAppTheme();

  const handlePress = React.useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);

    if (onPressOverride) {
      onPressOverride();
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(ROUTES.tabs.home as any);
  }, [onPressOverride, router]);

  const icon = (
    <View
      style={[
        styles.iconContainer,
        variant === 'solid' ? styles.solidIconContainer : null,
      ]}
    >
      <ChevronLeft size={28} color={appTheme.colors.textPrimary} strokeWidth={2.5} />
    </View>
  );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={handlePress}
      activeOpacity={0.72}
      style={[styles.touchable, containerStyle]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {variant === 'glass' ? (
        <BlurView intensity={40} tint={appTheme.isDark ? 'dark' : 'light'} style={styles.glassWrapper}>
          {icon}
        </BlurView>
      ) : (
        icon
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 50,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidIconContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  glassWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});
