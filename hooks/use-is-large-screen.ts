import { useWindowDimensions } from 'react-native';

export const LARGE_SCREEN_BREAKPOINT = 1024;
export const TABLET_BREAKPOINT = 768;

export function useIsLargeScreen(minWidth = LARGE_SCREEN_BREAKPOINT) {
  const { width } = useWindowDimensions();
  return width >= minWidth;
}

export function useResponsiveBreakpoints() {
  const { width, height } = useWindowDimensions();

  return {
    width,
    height,
    isTablet: width >= TABLET_BREAKPOINT,
    isLargeScreen: width >= LARGE_SCREEN_BREAKPOINT,
  };
}
