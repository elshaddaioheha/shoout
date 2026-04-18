import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/hooks/use-app-theme';
import { spacing, typography } from '@/constants';

export interface PrimaryButtonProps {
  onPress: () => void;
  title: string;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accentColor?: string;
  gradient?: readonly [string, string, ...string[]];
  variant?: 'default' | 'gradient' | 'outline';
}

export const PrimaryButton = ({
  onPress,
  title,
  loading = false,
  disabled = false,
  style,
  accentColor,
  gradient,
  variant = 'default',
}: PrimaryButtonProps) => {
  const appTheme = useAppTheme();
  const color = accentColor || appTheme.colors.primary;
  
  const buttonStyle = [
    styles.button,
    {
      backgroundColor: variant === 'outline' ? 'transparent' : color,
      borderColor: variant === 'outline' ? color : 'transparent',
      borderWidth: variant === 'outline' ? 2 : 0,
      opacity: disabled ? 0.5 : 1,
    },
    style,
  ];

  const textStyle = [
    styles.text,
    {
      color: variant === 'outline' ? color : appTheme.colors.textPrimary,
    },
  ];

  if (variant === 'gradient' && gradient) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={buttonStyle}
      >
        <LinearGradient
          colors={gradient}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={appTheme.colors.textPrimary} size="small" />
          ) : (
            <Text style={textStyle}>{title}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={buttonStyle}
    >
      {loading ? (
        <ActivityIndicator color={appTheme.colors.textPrimary} size="small" />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: spacing.touchTarget,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.button,
  },
});
