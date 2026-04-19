import { create } from 'zustand';

type UIStore = {
    playerMode: 'hidden' | 'mini' | 'full';
    isFullPlayerVisible: boolean;
    setPlayerMode: (mode: 'hidden' | 'mini' | 'full') => void;
    showMiniPlayer: () => void;
    showFullPlayer: () => void;
    hidePlayer: () => void;
    setFullPlayerVisible: (visible: boolean) => void;
};

export const useUIStore = create<UIStore>((set) => ({
    playerMode: 'hidden',
    isFullPlayerVisible: false,
    setPlayerMode: (mode) => set({ playerMode: mode, isFullPlayerVisible: mode === 'full' }),
    showMiniPlayer: () => set({ playerMode: 'mini', isFullPlayerVisible: false }),
    showFullPlayer: () => set({ playerMode: 'full', isFullPlayerVisible: true }),
    hidePlayer: () => set({ playerMode: 'hidden', isFullPlayerVisible: false }),
    setFullPlayerVisible: (visible) => set({ isFullPlayerVisible: visible, playerMode: visible ? 'full' : 'mini' }),
}));