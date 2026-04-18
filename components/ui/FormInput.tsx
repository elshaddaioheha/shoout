import React from 'react';
import { TextInput, View, StyleSheet, ViewStyle, TextInputProps } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withTiming, Animated } from 'react-native-reanimated';
import { useAppTheme } from '@/hooks/use-app-theme';
import { spacing, typography } from '@/constants';

export interface FormInputProps extends TextInputProps {
  containerStyle?: ViewStyle;
  label?: string;
  animated?: boolean;
  accentColor?: string;
  focusAnim?: Animated.SharedValue<number>;
}

const AnimatedView = Reanimated.createAnimatedComponent(View);

export const FormInput = React.forwardRef<TextInput, FormInputProps>(
  (
    {
      containerStyle,
      label,
      animated = false,
      accentColor,
      focusAnim: externalFocusAnim,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const appTheme = useAppTheme();
    const internalFocusAnim = useSharedValue(0);
    const focusAnim = externalFocusAnim || internalFocusAnim;
    const color = accentColor || appTheme.colors.primary;

    const handleFocus = (e: any) => {
      focusAnim.value = withTiming(1, { duration: 180 });
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      focusAnim.value = withTiming(0, { duration: 180 });
      onBlur?.(e);
    };

    const animatedStyle = useAnimatedStyle(() => ({
      borderColor: focusAnim.value ? color : appTheme.colors.border,
    }));

    const containerStyles = [
      styles.container,
      {
        backgroundColor: appTheme.colors.surface,
        borderColor: appTheme.colors.border,
      },
      animated ? animatedStyle : {},
      containerStyle,
    ];

    return (
      <AnimatedView style={containerStyles}>
        <TextInput
          ref={ref}
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            {
              color: appTheme.colors.textPrimary,
            },
          ]}
          placeholderTextColor={appTheme.colors.textPlaceholder}
        />
      </AnimatedView>
    );
  }
);

FormInput.displayName = 'FormInput';

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    height: 56,
    justifyContent: 'center',
  },
  input: {
    ...typography.body,
    paddingVertical: 0,
    height: '100%',
  },
});
