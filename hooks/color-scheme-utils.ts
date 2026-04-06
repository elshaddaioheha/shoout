import type { ColorSchemeName } from 'react-native';
import type { ThemePreference } from '@/store/useAppearanceStore';

export function resolveColorScheme(
  systemColorScheme: ColorSchemeName,
  preference: ThemePreference
): 'light' | 'dark' {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }

  return systemColorScheme === 'dark' ? 'dark' : 'light';
}
