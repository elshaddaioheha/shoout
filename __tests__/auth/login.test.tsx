import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { getDoc, setDoc } from 'firebase/firestore';
import React from 'react';
import LoginScreen from '../../app/(auth)/login';
import { useUserStore } from '../../store/useUserStore';

// Setup Mocks
jest.mock('expo-router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
    useLocalSearchParams: () => ({})
}));

jest.mock('../../store/useUserStore', () => ({
    useUserStore: jest.fn()
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

describe('LoginScreen Authorization flows', () => {
    const mockSetRole = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id';
        (useUserStore as unknown as jest.Mock).mockReturnValue({
            setRole: mockSetRole,
        });
        global.alert = jest.fn();
    });

    it('handles standard Email/Password authentication correctly', async () => {
        const { getByPlaceholderText, getByText } = render(<LoginScreen />);

        // Mock dependencies
        (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
            user: { uid: 'user-123' }
        });
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => ({ role: 'studio_pro' })
        });

        // Act
        fireEvent.changeText(getByPlaceholderText('Email Address'), 'test@shoouts.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
        fireEvent.press(getByText('Login'));

        // Assert
        await waitFor(() => {
            expect(signInWithEmailAndPassword).toHaveBeenCalled();
            expect(getDoc).toHaveBeenCalled();
            expect(mockSetRole).toHaveBeenCalledWith('studio_pro');
        });
    });

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
            // Should create the physical Firestore User Doc
            expect(setDoc).toHaveBeenCalledWith({ _path: 'users/google-uid' }, {
                fullName: 'G User',
                email: 'g@gmail.com',
                role: 'vault_free',
                createdAt: expect.any(String)
            });
            expect(mockSetRole).toHaveBeenCalledWith('vault_free');
        });
    });
});
