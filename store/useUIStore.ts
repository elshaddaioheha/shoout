import { create } from 'zustand';

type UIStore = {
    isFullPlayerVisible: boolean;
    setFullPlayerVisible: (visible: boolean) => void;
};

export const useUIStore = create<UIStore>((set) => ({
    isFullPlayerVisible: false,
    setFullPlayerVisible: (visible) => set({ isFullPlayerVisible: visible }),
}));