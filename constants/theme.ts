/**
 * Design tokens for the Shouuts app.
 * Centralized colors, fonts, spacing, and border radius values.
 * Use these tokens instead of hardcoding values in individual components.
 */

import { Platform } from 'react-native';

// ──────────────────────────────────────────────
// Brand Colors
// ──────────────────────────────────────────────
export const Brand = {
  primary: '#EC5C39',
  primaryDark: '#D32626',
  primaryLight: '#C96F6F',
  background: '#140F10',
  surface: '#1E1A1B',
  border: '#464646',
  borderLight: '#333',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textPlaceholder: 'rgba(255, 255, 255, 0.6)',
  error: '#FF4D4D',
  success: '#319F43',
  placeholder: '#D9D9D9',
};

// ──────────────────────────────────────────────
// Spacing Scale (4px base)
// ──────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
  screenPadding: 28, // Standard horizontal padding for all screens
};

// ──────────────────────────────────────────────
// Border Radius Scale
// ──────────────────────────────────────────────
export const Radius = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

// ──────────────────────────────────────────────
// Typography
// ──────────────────────────────────────────────
export const FontFamily = {
  regular: 'Poppins-Regular',
  semiBold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
};

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
};

// ──────────────────────────────────────────────
// Legacy Colors (kept for compatibility with themed components)
// ──────────────────────────────────────────────
const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
