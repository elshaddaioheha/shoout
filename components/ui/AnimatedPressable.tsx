import React, { useCallback } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export type PressConfig = {
  scaleDown?: number;
  stiffness?: number;
  damping?: number;
};

export function useScalePress({
  scaleDown = 0.85,
  stiffness = 280,
  damping = 14,
}: PressConfig = {}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(scaleDown, { stiffness, damping });
  }, [scale, scaleDown, stiffness, damping]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, {
      stiffness: stiffness * 0.8,
      damping: damping * 1.2,
    });
  }, [scale, stiffness, damping]);

  return { style, onPressIn, onPressOut };
}

type AnimatedPressableProps = {
  onPress?: () => void;
  pressConfig?: PressConfig;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  hitSlop?: number | { top?: number; left?: number; bottom?: number; right?: number };
  disabled?: boolean;
};

export function AnimatedPressable({
  onPress,
  pressConfig,
  style,
  children,
  hitSlop = 10,
  disabled,
}: AnimatedPressableProps) {
  const { style: scaleStyle, onPressIn, onPressOut } = useScalePress(pressConfig ?? {});

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={hitSlop}
      disabled={disabled}
    >
      <Animated.View style={[style, scaleStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
