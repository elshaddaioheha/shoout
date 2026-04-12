import { create } from 'zustand';

interface LayoutMetricsState {
  bottomTabBarHeight: number;
  setBottomTabBarHeight: (height: number) => void;
}

export const useLayoutMetricsStore = create<LayoutMetricsState>((set) => ({
  bottomTabBarHeight: 0,
  setBottomTabBarHeight: (height: number) => {
    const safeHeight = Number.isFinite(height) ? Math.max(0, height) : 0;
    set({ bottomTabBarHeight: safeHeight });
  },
}));
