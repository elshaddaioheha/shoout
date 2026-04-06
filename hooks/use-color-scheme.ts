import { useColorScheme as useRNColorScheme } from 'react-native';
import { resolveColorScheme } from '@/hooks/color-scheme-utils';
import { useAppearanceStore } from '@/store/useAppearanceStore';

export function useColorScheme(): 'light' | 'dark' {
	const systemColorScheme = useRNColorScheme();
	const preference = useAppearanceStore((state) => state.preference);
	return resolveColorScheme(systemColorScheme, preference);
}
