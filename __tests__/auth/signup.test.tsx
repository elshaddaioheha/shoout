import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { setDoc } from 'firebase/firestore';
import React from 'react';
import SignupScreen from '../../app/(auth)/signup';
import { useToastStore } from '../../store/useToastStore';
import { hydrateSubscriptionTier } from '../../utils/subscriptionVerification';

// Setup Mocks
jest.mock('expo-router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
    useLocalSearchParams: () => ({})
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

// Mock out Sub-components dependencies
jest.mock('react-native-svg', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        __esModule: true,
        default: (props: any) => <View {...props} />,
        Path: (props: any) => <View {...props} />,
        Svg: (props: any) => <View {...props} />
    };
});

// Note: firebase/auth and firebase/firestore are globally mapped to __mocks__/firebase.ts
// via package.json moduleNameMapper. No explicit local require mocks needed here to avoid stack overflow.

// Mock Google Signin
jest.mock('@react-native-google-signin/google-signin', () => ({
    GoogleSignin: {
        hasPlayServices: jest.fn(),
        signIn: jest.fn()
    },
    statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' }
}));

describe('SignupScreen Authorization flows', () => {
    const mockShowToast = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useToastStore as unknown as jest.Mock).mockReturnValue({
            showToast: mockShowToast,
        });
        global.alert = jest.fn();
    });

    it('handles standard Email/Password authentication correctly', async () => {
        const { getByPlaceholderText, getByText } = render(<SignupScreen />);

        // Mock dependencies
        (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
            user: { uid: 'user-123' }
        });

        // Act — wrap all events + async side-effects in act
        fireEvent.changeText(getByPlaceholderText('Full Name'), 'Test Creator');
        fireEvent.changeText(getByPlaceholderText('Email'), 'test@shoouts.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
        fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password123');
        await act(async () => {
            fireEvent.press(getByText('Sign Up'));
        });

        // Assert
        await waitFor(() => {
            expect(createUserWithEmailAndPassword).toHaveBeenCalled();
            expect(updateProfile).toHaveBeenCalledWith({ uid: 'user-123' }, { displayName: 'Test Creator' });
            expect(setDoc).toHaveBeenCalledWith({ _path: 'users/user-123' }, {
                fullName: 'Test Creator',
                email: 'test@shoouts.com',
                createdAt: expect.any(String)
            });
            expect(hydrateSubscriptionTier).toHaveBeenCalled();
        }, { timeout: 12000 });
    }, 15000);

    it('rejects signup if passwords do not match', async () => {
        const { getByPlaceholderText, getByText } = render(<SignupScreen />);

        fireEvent.changeText(getByPlaceholderText('Full Name'), 'Test Mismatch');
        fireEvent.changeText(getByPlaceholderText('Email'), 'mismatch@shoouts.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
        fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'wrong123');
        fireEvent.press(getByText('Sign Up'));

        expect(mockShowToast).toHaveBeenCalledWith("Passwords don't match", 'error');
        expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });
});
