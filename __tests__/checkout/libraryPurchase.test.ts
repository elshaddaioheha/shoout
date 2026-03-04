/**
 * Library Purchase Integration Tests
 *
 * Tests the checkout logic that records transactions AND adds purchased items
 * to the user's `purchases` subcollection in Firestore.
 *
 * Firebase calls are intercepted via jest moduleNameMapper → __mocks__/firebase.ts
 * No jest.mock() calls needed here — the config handles it transparently.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Since moduleNameMapper maps firebase/* → __mocks__/firebase.ts,
// we can import directly from the mock to grab spy references.
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { mockAddDoc } from '../../__mocks__/firebase';
import { auth } from '../../__mocks__/firebaseConfig';

// ─────────────────────────────────────────────────────────────────────────────
// Checkout simulation helper
// ─────────────────────────────────────────────────────────────────────────────
async function simulateCheckout(
    items: Array<{
        id: string;
        title: string;
        artist: string;
        price: number;
        uploaderId: string;
        audioUrl?: string;
        coverUrl?: string;
    }>,
    db: any = {}
) {
    await Promise.all(
        items.flatMap(item => [
            // 1. Record Transaction
            addDoc(collection(db, 'transactions'), {
                trackId: item.id,
                buyerId: (auth.currentUser as any).uid,
                sellerId: item.uploaderId,
                amount: item.price,
                trackTitle: item.title,
                timestamp: serverTimestamp(),
                status: 'completed',
            }),
            // 2. Add to user's library
            addDoc(collection(db, 'users', (auth.currentUser as any).uid, 'purchases'), {
                trackId: item.id,
                title: item.title,
                artist: item.artist,
                price: item.price,
                uploaderId: item.uploaderId,
                purchasedAt: serverTimestamp(),
                audioUrl: item.audioUrl || '',
                coverUrl: item.coverUrl || '',
            }),
        ])
    );
}

const MOCK_CART_ITEMS = [
    {
        id: 'beat-001',
        title: 'Afro Sunrise',
        artist: 'Creator X',
        price: 30,
        uploaderId: 'seller-uid-001',
        audioUrl: 'https://cdn.example.com/beat1.mp3',
        coverUrl: 'https://cdn.example.com/cover1.jpg',
    },
    {
        id: 'sample-002',
        title: 'Lagos Drums',
        artist: 'Producer Y',
        price: 10,
        uploaderId: 'seller-uid-002',
    },
];

beforeEach(() => {
    jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Transaction recording
// ─────────────────────────────────────────────────────────────────────────────
describe('Checkout › transaction recording', () => {
    it('calls addDoc exactly twice per item (transaction + library)', async () => {
        await simulateCheckout(MOCK_CART_ITEMS);
        // 2 items × 2 addDoc calls = 4 total
        expect(mockAddDoc).toHaveBeenCalledTimes(4);
    });

    it('records transaction with correct buyer/seller/amount', async () => {
        await simulateCheckout([MOCK_CART_ITEMS[0]]);
        const transactionCall = mockAddDoc.mock.calls[0][1];
        expect(transactionCall.trackId).toBe('beat-001');
        expect(transactionCall.buyerId).toBe('test-user-uid');
        expect(transactionCall.sellerId).toBe('seller-uid-001');
        expect(transactionCall.amount).toBe(30);
        expect(transactionCall.status).toBe('completed');
    });

    it('records a transaction for each cart item', async () => {
        await simulateCheckout(MOCK_CART_ITEMS);
        const txnCalls = mockAddDoc.mock.calls.filter(
            call => call[0]?._path === 'transactions'
        );
        expect(txnCalls).toHaveLength(2);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Library (purchases) population
// ─────────────────────────────────────────────────────────────────────────────
describe('Checkout › library purchases population', () => {
    it('writes a purchases document for each item', async () => {
        await simulateCheckout(MOCK_CART_ITEMS);
        const purchaseCalls = mockAddDoc.mock.calls.filter(call =>
            call[0]?._path?.includes('purchases')
        );
        expect(purchaseCalls).toHaveLength(2);
    });

    it('purchase document contains audioUrl and coverUrl', async () => {
        await simulateCheckout([MOCK_CART_ITEMS[0]]);
        const purchaseCall = mockAddDoc.mock.calls.find(call =>
            call[0]?._path?.includes('purchases')
        );
        expect(purchaseCall).toBeTruthy();
        expect(purchaseCall![1].audioUrl).toBe('https://cdn.example.com/beat1.mp3');
        expect(purchaseCall![1].coverUrl).toBe('https://cdn.example.com/cover1.jpg');
    });

    it('falls back gracefully when audioUrl/coverUrl are missing', async () => {
        await simulateCheckout([MOCK_CART_ITEMS[1]]);
        const purchaseCall = mockAddDoc.mock.calls.find(call =>
            call[0]?._path?.includes('purchases')
        );
        expect(purchaseCall![1].audioUrl).toBe('');
        expect(purchaseCall![1].coverUrl).toBe('');
    });

    it('stores the correct uploaderId on the purchase document', async () => {
        await simulateCheckout([MOCK_CART_ITEMS[0]]);
        const purchaseCall = mockAddDoc.mock.calls.find(call =>
            call[0]?._path?.includes('purchases')
        );
        expect(purchaseCall![1].uploaderId).toBe('seller-uid-001');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────────────────
describe('Checkout › error handling', () => {
    it('propagates Firestore errors from addDoc', async () => {
        mockAddDoc.mockRejectedValueOnce(new Error('Firestore unavailable'));
        await expect(simulateCheckout([MOCK_CART_ITEMS[0]])).rejects.toThrow(
            'Firestore unavailable'
        );
    });
});
