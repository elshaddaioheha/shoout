/**
 * Unified Firebase mock for all test files.
 * Covers: firestore (doc, collection, addDoc, getDocs, onSnapshot, etc.)
 * and auth (currentUser).
 */

export const mockAddDoc = jest.fn(() => Promise.resolve({ id: 'new-doc-id' }));
export const mockGetDocs = jest.fn(() =>
    Promise.resolve({
        empty: false,
        docs: [
            {
                id: 'mock-track-id',
                data: () => ({
                    title: 'Test Beat',
                    uploaderName: 'Test Creator',
                    price: 25,
                    genre: 'Afro',
                    bpm: 120,
                    audioUrl: 'https://example.com/audio.mp3',
                    userId: 'creator-uid-123',
                }),
            },
        ],
    })
);
export const mockUpdateDoc = jest.fn(() => Promise.resolve());
export const mockSetDoc = jest.fn(() => Promise.resolve());
// app
export const initializeApp = jest.fn(() => ({}));
export const getApps = jest.fn(() => []);
export const mockDeleteDoc = jest.fn(() => Promise.resolve());

/** Modular entrypoints (`firebase/auth`, `firebase/firestore`) resolve here via Jest moduleNameMapper. */
export const getAuth = jest.fn(() => ({ currentUser: null }));
export const getFirestore = jest.fn(() => ({}));
export const Timestamp = {
  fromMillis: (ms: number) => ({ toMillis: () => ms }),
};
export const mockOnSnapshot = jest.fn((query, callback) => {
    callback({ docs: [] });
    return jest.fn(); // unsubscribe fn
});
export const mockIncrement = jest.fn((n: number) => n);

// Firestore helpers
export const collection = jest.fn((db: any, ...segments: string[]) => ({ _path: segments.join('/') }));
export const doc = jest.fn((db: any, ...segments: string[]) => ({ _path: segments.join('/') }));
export const collectionGroup = jest.fn((db: any, collectionId: string) => ({ _collectionId: collectionId }));
export const query = jest.fn((...args: any[]) => args[0]);
export const where = jest.fn(() => ({}));
export const orderBy = jest.fn(() => ({}));
export const limit = jest.fn(() => ({}));
export const addDoc = mockAddDoc;
export const getDocs = mockGetDocs;
export const updateDoc = mockUpdateDoc;
export const setDoc = mockSetDoc;
export const deleteDoc = mockDeleteDoc;
export const onSnapshot = mockOnSnapshot;
export const serverTimestamp = jest.fn(() => new Date().toISOString());
export const increment = mockIncrement;
export const arrayUnion = jest.fn((...args: any[]) => args);
export const arrayRemove = jest.fn((...args: any[]) => args);
export const signInWithEmailAndPassword = jest.fn(() => Promise.resolve({ user: { uid: 'mock-uid' } }));
export const createUserWithEmailAndPassword = jest.fn(() => Promise.resolve({ user: { uid: 'mock-user' } }));
export const updateProfile = jest.fn(() => Promise.resolve());
export const signInWithCredential = jest.fn(() => Promise.resolve({ user: { uid: 'google-uid' } }));
export const GoogleAuthProvider = { credential: jest.fn(() => 'mock-cred') };
export const getDoc = jest.fn(() =>
    Promise.resolve({
        exists: () => true,
        id: 'mock-artist-id',
        data: () => ({
            name: 'Mock Artist',
            role: 'studio',
            followers: [],
            following: [],
        }),
    })
);
