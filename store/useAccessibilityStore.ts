import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type TextSize = 'small' | 'normal' | 'large' | 'extraLarge';
export type HighContrastMode = 'off' | 'on';

interface AccessibilityState {
  // Font scaling
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;

  // Motion preferences
  reduceMotion: boolean;
  setReduceMotion: (reduce: boolean) => void;

  // High contrast mode
  highContrast: HighContrastMode;
  setHighContrast: (mode: HighContrastMode) => void;

  // Screen reader
  screenReaderEnabled: boolean;
  initScreenReaderState: () => Promise<void>;
}

export const A11Y_TEXT_SCALE: Record<TextSize, number> = {
  small: 0.9,
  normal: 1.0,
  large: 1.2,
  extraLarge: 1.4,
};

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      textSize: 'normal',
      reduceMotion: false,
      highContrast: 'off',
      screenReaderEnabled: false,

      setTextSize: (size: TextSize) => {
        set({ textSize: size });
      },

      setReduceMotion: (reduce: boolean) => {
        set({ reduceMotion: reduce });
      },

      setHighContrast: (mode: HighContrastMode) => {
        set({ highContrast: mode });
      },

      initScreenReaderState: async () => {
        try {
          const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
          set({ screenReaderEnabled: isEnabled });
        } catch (error) {
          console.log('Failed to detect screen reader:', error);
        }
      },
    }),
    {
      name: 'shoouts-a11y-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        textSize: state.textSize,
        reduceMotion: state.reduceMotion,
        highContrast: state.highContrast,
      }),
    }
  )
);

/**
 * Hook to get text scale multiplier.
 * Usage: const scale = useTextScale(); then apply to fontSize
 */
export function useTextScale(): number {
  const textSize = useAccessibilityStore((state) => state.textSize);
  return A11Y_TEXT_SCALE[textSize];
}

/**
 * Hook to check if motion should be reduced.
 */
export function useReducedMotion(): boolean {
  return useAccessibilityStore((state) => state.reduceMotion);
}

/**
 * Hook to check screen reader state.
 */
export function useScreenReaderEnabled(): boolean {
  return useAccessibilityStore((state) => state.screenReaderEnabled);
}
