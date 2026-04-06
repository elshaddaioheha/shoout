import { getTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useAppTheme() {
  const colorScheme = useColorScheme() ?? 'light';
  return getTheme(colorScheme === 'dark' ? 'dark' : 'light');
}
