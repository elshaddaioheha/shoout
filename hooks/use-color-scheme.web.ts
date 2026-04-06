import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { resolveColorScheme } from '@/hooks/color-scheme-utils';
import { useAppearanceStore } from '@/store/useAppearanceStore';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const preference = useAppearanceStore((state) => state.preference);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return resolveColorScheme(colorScheme, preference);
  }

  return 'light';
}
