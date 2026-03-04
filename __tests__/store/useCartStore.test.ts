/**
 * Cart Store Tests
 *
 * Covers: addItem, removeItem, clearCart, duplicate prevention, total computation.
 */
import { act } from 'react';

// Mock AsyncStorage so the persist middleware doesn't crash in tests
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import type { CartItem } from '../../store/useCartStore';
import { useCartStore } from '../../store/useCartStore';

const TRACK_A: CartItem = {
    id: 'track-001',
    title: 'Midnight Afro',
    artist: 'Jungle G',
    price: 25.00,
    audioUrl: 'https://example.com/mid.mp3',
    uploaderId: 'creator-111',
    category: 'Beat',
};

const TRACK_B: CartItem = {
    id: 'track-002',
    title: 'Lagos Vibe',
    artist: 'Sound of Salem',
    price: 15.50,
    uploaderId: 'creator-222',
    category: 'Sample',
};

// Reset store state between tests
beforeEach(() => {
    useCartStore.setState({ items: [], total: 0 });
});

// ─────────────────────────────────────────────────────────────────────────────
// addItem
// ─────────────────────────────────────────────────────────────────────────────
describe('useCartStore › addItem', () => {
    it('adds a single item to an empty cart', () => {
        act(() => { useCartStore.getState().addItem(TRACK_A); });
        const { items, total } = useCartStore.getState();
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe('track-001');
        expect(total).toBe(25.00);
    });

    it('adds multiple different items', () => {
        act(() => {
            useCartStore.getState().addItem(TRACK_A);
            useCartStore.getState().addItem(TRACK_B);
        });
        const { items, total } = useCartStore.getState();
        expect(items).toHaveLength(2);
        expect(total).toBeCloseTo(40.50);
    });

    it('does NOT add the same item twice (duplicate prevention)', () => {
        act(() => {
            useCartStore.getState().addItem(TRACK_A);
            useCartStore.getState().addItem(TRACK_A); // duplicate
        });
        const { items } = useCartStore.getState();
        expect(items).toHaveLength(1);
    });

    it('preserves all CartItem fields including optional ones', () => {
        act(() => { useCartStore.getState().addItem(TRACK_A); });
        const item = useCartStore.getState().items[0];
        expect(item.audioUrl).toBe('https://example.com/mid.mp3');
        expect(item.category).toBe('Beat');
        expect(item.uploaderId).toBe('creator-111');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// removeItem
// ─────────────────────────────────────────────────────────────────────────────
describe('useCartStore › removeItem', () => {
    it('removes an existing item', () => {
        act(() => {
            useCartStore.getState().addItem(TRACK_A);
            useCartStore.getState().addItem(TRACK_B);
            useCartStore.getState().removeItem('track-001');
        });
        const { items, total } = useCartStore.getState();
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe('track-002');
        expect(total).toBeCloseTo(15.50);
    });

    it('is a no-op when item id does not exist', () => {
        act(() => {
            useCartStore.getState().addItem(TRACK_A);
            useCartStore.getState().removeItem('nonexistent-id');
        });
        expect(useCartStore.getState().items).toHaveLength(1);
    });

    it('recalculates total correctly after removal', () => {
        act(() => {
            useCartStore.getState().addItem(TRACK_A);
            useCartStore.getState().addItem(TRACK_B);
            useCartStore.getState().removeItem('track-002');
        });
        expect(useCartStore.getState().total).toBeCloseTo(25.00);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// clearCart
// ─────────────────────────────────────────────────────────────────────────────
describe('useCartStore › clearCart', () => {
    it('empties the cart', () => {
        act(() => {
            useCartStore.getState().addItem(TRACK_A);
            useCartStore.getState().addItem(TRACK_B);
            useCartStore.getState().clearCart();
        });
        const { items, total } = useCartStore.getState();
        expect(items).toHaveLength(0);
        expect(total).toBe(0);
    });

    it('is safe to call on an already-empty cart', () => {
        act(() => { useCartStore.getState().clearCart(); });
        expect(useCartStore.getState().items).toHaveLength(0);
        expect(useCartStore.getState().total).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// total edge cases
// ─────────────────────────────────────────────────────────────────────────────
describe('useCartStore › total computation', () => {
    it('correctly totals items with decimal prices', () => {
        const itemC: CartItem = { id: 'c', title: 'C', artist: 'A', price: 9.99, uploaderId: 'u' };
        const itemD: CartItem = { id: 'd', title: 'D', artist: 'A', price: 0.01, uploaderId: 'u' };
        act(() => {
            useCartStore.getState().addItem(itemC);
            useCartStore.getState().addItem(itemD);
        });
        expect(useCartStore.getState().total).toBeCloseTo(10.00);
    });

    it('handles zero-price free items', () => {
        const freeItem: CartItem = { id: 'free', title: 'Free', artist: 'A', price: 0, uploaderId: 'u' };
        act(() => { useCartStore.getState().addItem(freeItem); });
        expect(useCartStore.getState().total).toBe(0);
    });
});
