import { colorPalettes, colors } from './colors';
import { spacing } from './spacing';
import { FontFamily, LegacyFonts, typography } from './typography';

export function getTheme(colorScheme: 'light' | 'dark' = 'dark') {
  const palette = colorScheme === 'dark' ? colorPalettes.dark : colorPalettes.light;

  return {
  spacing,
  colors: palette,
  isDark: colorScheme === 'dark',
  typography,
  radius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  shadow: {
    sm: {
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06, shadowRadius: 2, elevation: 2,
    },
    md: {
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
    },
    lg: {
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14, shadowRadius: 16, elevation: 10,
    },
  },
  iconSize: { sm: 16, md: 20, lg: 24, xl: 32 },
  };
}

// Legacy default theme remains dark for backward compatibility.
export const theme = getTheme('dark');

// ──────────────────────────────────────────────
// Legacy Exports (kept to prevent immediate breakages, will be phased out)
// ──────────────────────────────────────────────
export const Brand = {
  shooutPrimary: colors.shooutPrimary,
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  primaryLight: colors.primaryLight,
  background: colors.background,
  surface: colors.surface,
  border: colors.border,
  borderLight: colors.borderLight,
  textPrimary: colors.textPrimary,
  textSecondary: colors.textSecondary,
  textMuted: colors.textDisabled,
  textPlaceholder: colors.textPlaceholder,
  error: colors.error,
  success: colors.success,
  placeholder: colors.placeholder,
};

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
  screenPadding: 28,
};

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

export { FontFamily };

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

export const Fonts = LegacyFonts;
