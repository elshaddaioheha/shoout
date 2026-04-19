import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
    visible: boolean;
    message: string;
    type: ToastType;
    showToast: (message: string, type?: ToastType) => void;
    hideToast: () => void;
}

function normalizeToastMessage(message: string, type: ToastType): string {
    const raw = (message || '').trim();
    if (!raw) {
        if (type === 'success') return 'Done.';
        if (type === 'error') return 'Something went wrong. Please try again.';
        return 'Update available.';
    }

    const lowered = raw.toLowerCase();

    // Hide technical/internal errors from UI toasts.
    if (
        lowered.includes('firebase')
        || lowered.includes('firestore')
        || lowered.includes('network request failed')
        || lowered.includes('exception')
        || lowered.includes('stack')
        || lowered.includes('undefined')
        || lowered.includes('null')
    ) {
        return type === 'error'
            ? 'Something went wrong. Please try again.'
            : 'Could not complete that action right now.';
    }

    if (lowered.startsWith('failed to') || lowered.includes('error')) {
        return type === 'error'
            ? 'Something went wrong. Please try again.'
            : 'Could not complete that action right now.';
    }

    return raw.replace(/\s+/g, ' ');
}

export const useToastStore = create<ToastState>((set) => ({
    visible: false,
    message: '',
    type: 'info',
    showToast: (message, type = 'info') => {
        const normalized = normalizeToastMessage(message, type);
        set({ visible: true, message: normalized, type });
        // Automatically hide after 3 seconds
        setTimeout(() => {
            set((state) => {
                // Only hide if the message hasn't changed (prevents hiding newer toasts)
                if (state.message === normalized) {
                    return { visible: false };
                }
                return state;
            });
        }, 4000);
    },
    hideToast: () => set({ visible: false }),
}));
