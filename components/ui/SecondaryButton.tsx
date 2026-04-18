import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';
import { spacing, typography } from '@/constants';

export interface SecondaryButtonProps {
  onPress: () => void;
  title: string;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accentColor?: string;
}

export const SecondaryButton = ({
  onPress,
  title,
  loading = false,
  disabled = false,
  style,
  accentColor,
}: SecondaryButtonProps) => {
  const appTheme = useAppTheme();
  const color = accentColor || appTheme.colors.textSecondary;
  
  const buttonStyle = [
    styles.button,
    {
      backgroundColor: appTheme.isDark 
        ? 'rgba(255, 255, 255, 0.08)' 
        : 'rgba(0, 0, 0, 0.06)',
      borderColor: color,
      opacity: disabled ? 0.5 : 1,
    },
    style,
  ];

  const textStyle = [
    styles.text,
    {
      color: color,
    },
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={buttonStyle}
    >
      {loading ? (
        <ActivityIndicator color={color} size="small" />
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
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.button,
  },
});
