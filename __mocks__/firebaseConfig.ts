/**
 * Mock for firebaseConfig module.
 * Returns fake db and auth objects so no real Firebase connection is made during tests.
 */
export const db = {};
export const app = {};
export const storage = {};
export const auth = {
    currentUser: {
        uid: 'test-user-uid',
        displayName: 'Test User',
        email: 'test@shoouts.com',
        getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
    },
};
