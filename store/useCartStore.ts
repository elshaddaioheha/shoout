import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            total: 0,
            addItem: (item) => {
                const currentItems = get().items;
                if (currentItems.find(i => i.id === item.id)) return;

                const newItems = [...currentItems, item];
                set({
                    items: newItems,
                    total: newItems.reduce((acc, i) => acc + i.price, 0)
                });
            },
            removeItem: (id) => {
                const newItems = get().items.filter(i => i.id !== id);
                set({
                    items: newItems,
                    total: newItems.reduce((acc, i) => acc + i.price, 0)
                });
            },
            clearCart: () => set({ items: [], total: 0 }),
        }),
        {
            name: 'shoouts-cart-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
