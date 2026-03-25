import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { getDoc, setDoc } from 'firebase/firestore';
import React from 'react';
import LoginScreen from '../../app/(auth)/login';
import { useToastStore } from '../../store/useToastStore';
import { ensureDefaultSubscriptionDoc, hydrateSubscriptionTier } from '../../utils/subscriptionVerification';

// Setup Mocks
jest.mock('expo-router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
    useLocalSearchParams: () => ({})
}));

// Mock _layout so login.tsx can import authNavigationHandled without
// pulling in the entire Expo Router layout and its native dependencies.
jest.mock('../../app/_layout', () => ({
    authNavigationHandled: { current: false },
}));

jest.mock('../../utils/subscriptionVerification', () => ({
    hydrateSubscriptionTier: jest.fn().mockResolvedValue('vault'),
    ensureDefaultSubscriptionDoc: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../store/useToastStore', () => ({
    useToastStore: jest.fn()
}));

jest.mock('../../firebaseConfig', () => ({
    auth: {},
    db: {}
}));

// Mock Lucide icons
jest.mock('lucide-react-native', () => ({
    Eye: 'Eye',
    EyeOff: 'EyeOff'
}));

// Note: firebase/auth and firebase/firestore are globally mapped to __mocks__/firebase.ts
// in package.json moduleNameMapper, so no explicit jest.mock call is needed here.

// Mock Google Signin
jest.mock('@react-native-google-signin/google-signin', () => ({
    GoogleSignin: {
        hasPlayServices: jest.fn(),
        signIn: jest.fn()
    },
    statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' }
}));

// Mock Apple Authentication (iOS-only, not available in test env)
jest.mock('expo-apple-authentication', () => ({
    AppleAuthenticationButton: 'AppleAuthenticationButton',
    AppleAuthenticationButtonType: { SIGN_IN: 'SIGN_IN' },
    AppleAuthenticationButtonStyle: { WHITE: 'WHITE' },
    signInAsync: jest.fn(),
    isAvailableAsync: jest.fn().mockResolvedValue(false),
}));

describe('LoginScreen Authorization flows', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id';
        (hydrateSubscriptionTier as jest.Mock).mockResolvedValue('studio');
        (useToastStore as unknown as jest.Mock).mockReturnValue({
            showToast: jest.fn(),
        });
        global.alert = jest.fn();
    });

    it('handles standard Email/Password authentication correctly', async () => {
        const { getByPlaceholderText, getByText } = render(<LoginScreen />);

        (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
            user: { uid: 'user-123' }
        });

        // Fill in the form — wrap in act so controlled state flushes
        await act(async () => {
            fireEvent.changeText(getByPlaceholderText('Email Address'), 'test@shoouts.com');
            fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
        });

        // Press the Login button
        await act(async () => {
            fireEvent.press(getByText('Login'));
        });

        // signInWithEmailAndPassword should have been called.
        // Note: hydrateSubscriptionTier is NOT called by handleLogin directly —
        // it is delegated to onAuthStateChanged in _layout.tsx which is mocked.
        await waitFor(
            () => {
                expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
                    expect.anything(),
                    'test@shoouts.com',
                    'password123'
                );
            },
            { timeout: 15000 }
        );
    }, 20000);

    it('handles successful Google Oauth SignIn for a new user', async () => {
        const { getByText } = render(<LoginScreen />);

        // Setup new Google User Scenario
        (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
        (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
            data: { idToken: 'google-test-token' }
        });
        (signInWithCredential as jest.Mock).mockResolvedValue({
            user: { uid: 'google-uid', email: 'g@gmail.com', displayName: 'G User' }
        });
        (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });

        // Act
        fireEvent.press(getByText('Login with Google'));

        // Assert
        await waitFor(() => {
            expect(GoogleSignin.signIn).toHaveBeenCalled();
            expect(signInWithCredential).toHaveBeenCalled();
            // Should create the physical Firestore User Doc (tier lives on subscription/current)
            expect(setDoc).toHaveBeenCalledWith({ _path: 'users/google-uid' }, {
                fullName: 'G User',
                email: 'g@gmail.com',
                createdAt: expect.any(String)
            });
            expect(ensureDefaultSubscriptionDoc).toHaveBeenCalledWith('google-uid');
            expect(hydrateSubscriptionTier).toHaveBeenCalled();
        });
    });
});
