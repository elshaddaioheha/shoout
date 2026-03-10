import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
    visible: boolean;
    message: string;
    type: ToastType;
    showToast: (message: string, type?: ToastType) => void;
    hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
    visible: false,
    message: '',
    type: 'info',
    showToast: (message, type = 'info') => {
        set({ visible: true, message, type });
        // Automatically hide after 3 seconds
        setTimeout(() => {
            set((state) => {
                // Only hide if the message hasn't changed (prevents hiding newer toasts)
                if (state.message === message) {
                    return { visible: false };
                }
                return state;
            });
        }, 4000);
    },
    hideToast: () => set({ visible: false }),
}));
