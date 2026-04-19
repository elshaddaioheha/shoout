import { create } from 'zustand';

type UIStore = {
    playerMode: 'hidden' | 'mini' | 'full';
    isFullPlayerVisible: boolean;
    isModeTransitioning: boolean;
    setPlayerMode: (mode: 'hidden' | 'mini' | 'full') => void;
    setModeTransitioning: (isTransitioning: boolean) => void;
    showMiniPlayer: () => void;
    showFullPlayer: () => void;
    hidePlayer: () => void;
    setFullPlayerVisible: (visible: boolean) => void;
};

export const useUIStore = create<UIStore>((set) => ({
    playerMode: 'hidden',
    isFullPlayerVisible: false,
    isModeTransitioning: false,
    setPlayerMode: (mode) => set({ playerMode: mode, isFullPlayerVisible: mode === 'full' }),
    setModeTransitioning: (isModeTransitioning) => set({ isModeTransitioning }),
    showMiniPlayer: () => set({ playerMode: 'mini', isFullPlayerVisible: false }),
    showFullPlayer: () => set({ playerMode: 'full', isFullPlayerVisible: true }),
    hidePlayer: () => set({ playerMode: 'hidden', isFullPlayerVisible: false }),
    setFullPlayerVisible: (visible) => set({ isFullPlayerVisible: visible, playerMode: visible ? 'full' : 'mini' }),
}));