import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useSyncStatus } from './robust-store-utils';

export interface CartItem {
    id: string;
    title: string;
    artist: string;
    price: number;
    audioUrl?: string;
    coverUrl?: string;
    uploaderId: string;
    category?: string;
}

interface CartState {
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (id: string) => void;
    clearCart: () => void;
    total: number;
    lastUpdated: number; // Track for conflict detection
}

/**
 * Cart Store with Offline Persistence & Sync Status
 * 
 * Key behaviors:
 * 1. Optimistic updates - add/remove items immediately
 * 2. Offline persistence - synced state via AsyncStorage
 * 3. Race condition prevention - lastUpdated timestamp
 * 4. Sync status tracking - components can monitor sync state
 */
export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            total: 0,
            lastUpdated: 0,

            addItem: (item) => {
                // 🔒 RACE CONDITION PREVENTION:
                // Check if item already exists before adding (idempotency)
                const currentItems = get().items;
                if (currentItems.find(i => i.id === item.id)) {
                    console.warn(`[Cart] Item ${item.id} already in cart, skipping duplicate`);
                    return;
                }

                // ✅ OPTIMISTIC UPDATE:
                // Update UI immediately, will sync in background
                const newItems = [...currentItems, item];
                const newTotal = newItems.reduce((acc, i) => acc + i.price, 0);

                set({
                    items: newItems,
                    total: newTotal,
                    lastUpdated: Date.now(), // For conflict resolution
                });

                // 📊 Track sync status for UI
                useSyncStatus.getState().setSyncStatus('cart', {
                    isSyncing: true,
                });
            },

            removeItem: (id) => {
                // ✅ OPTIMISTIC UPDATE
                const newItems = get().items.filter(i => i.id !== id);
                const newTotal = newItems.reduce((acc, i) => acc + i.price, 0);

                set({
                    items: newItems,
                    total: newTotal,
                    lastUpdated: Date.now(),
                });

                useSyncStatus.getState().setSyncStatus('cart', {
                    isSyncing: true,
                });
            },

            clearCart: () => {
                set({
                    items: [],
                    total: 0,
                    lastUpdated: Date.now(),
                });

                useSyncStatus.getState().setSyncStatus('cart', {
                    isSyncing: true,
                });
            },
        }),
        {
            name: 'shoouts-cart-storage',
            storage: createJSONStorage(() => AsyncStorage),
            // Only persist these fields (exclude methods)
            partialize: (state) => ({
                items: state.items,
                total: state.total,
                lastUpdated: state.lastUpdated,
            }),
        }
    )
);
