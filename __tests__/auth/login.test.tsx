import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import React from 'react';
import LoginScreen from '../../app/(auth)/login';
import { useToastStore } from '../../store/useToastStore';
import { ensureDefaultSubscriptionDoc, hydrateSubscriptionTier } from '../../utils/subscriptionVerification';
import { markUserNeedsRoleSelection, resolveAuthenticatedDestination } from '@/utils/authFlow';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockShowToast = jest.fn();

jest.mock('expo-router', () => ({
    useRouter: () => ({ replace: mockReplace, push: mockPush }),
    useLocalSearchParams: () => ({})
}));

jest.mock('../../utils/subscriptionVerification', () => ({
    hydrateSubscriptionTier: jest.fn().mockResolvedValue('shoout'),
    ensureDefaultSubscriptionDoc: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/utils/authFlow', () => ({
    markUserNeedsRoleSelection: jest.fn().mockResolvedValue(undefined),
    resolveAuthenticatedDestination: jest.fn(),
}));

jest.mock('../../store/useToastStore', () => ({
    useToastStore: jest.fn()
}));

jest.mock('lucide-react-native', () => ({
    Eye: 'Eye',
    EyeOff: 'EyeOff'
}));

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

jest.mock('@react-native-google-signin/google-signin', () => ({
    GoogleSignin: {
        hasPlayServices: jest.fn(),
        signIn: jest.fn()
    },
    statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' }
}));

jest.mock('expo-apple-authentication', () => ({
    AppleAuthenticationButton: 'AppleAuthenticationButton',
    AppleAuthenticationButtonType: { SIGN_IN: 'SIGN_IN' },
    AppleAuthenticationButtonStyle: { WHITE: 'WHITE' },
    signInAsync: jest.fn(),
    isAvailableAsync: jest.fn().mockResolvedValue(false),
    AppleAuthenticationScope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
}));

describe('LoginScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id';
        (useToastStore as unknown as jest.Mock).mockReturnValue({
            showToast: mockShowToast,
        });
        (resolveAuthenticatedDestination as jest.Mock).mockResolvedValue('/(tabs)');
    });

    it('routes email login through the shared destination resolver', async () => {
        const { getByPlaceholderText, getByText } = render(<LoginScreen />);

        (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
            user: { uid: 'user-123' }
        });

        fireEvent.changeText(getByPlaceholderText('Email Address'), 'test@shoouts.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

        await act(async () => {
            fireEvent.press(getByText('Login'));
        });

        await waitFor(() => {
            expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@shoouts.com', 'password123');
            expect(resolveAuthenticatedDestination).toHaveBeenCalledWith('/(tabs)');
            expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
        });
    });

    it('routes first-time Google sign-in into role selection', async () => {
        const { getByText } = render(<LoginScreen />);

        (resolveAuthenticatedDestination as jest.Mock).mockResolvedValue('/(auth)/role-selection');
        (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
        (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
            data: { idToken: 'google-test-token' }
        });
        (signInWithCredential as jest.Mock).mockResolvedValue({
            user: { uid: 'google-uid', email: 'g@gmail.com', displayName: 'G User' }
        });
        (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });

        await act(async () => {
            fireEvent.press(getByText('Login with Google'));
        });

        await waitFor(() => {
            expect(markUserNeedsRoleSelection).toHaveBeenCalledWith(
                'google-uid',
                expect.objectContaining({
                    fullName: 'G User',
                    email: 'g@gmail.com',
                })
            );
            expect(ensureDefaultSubscriptionDoc).toHaveBeenCalledWith('google-uid');
            expect(hydrateSubscriptionTier).toHaveBeenCalled();
            expect(mockReplace).toHaveBeenCalledWith('/(auth)/role-selection');
        });
    });
});
