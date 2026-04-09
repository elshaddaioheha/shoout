import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { signInWithCredential } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import React from 'react';
import SignupScreen from '../../app/(auth)/signup';
import { useToastStore } from '../../store/useToastStore';
import { sendEmailOtp } from '../../utils/emailOtp';
import { hydrateSubscriptionTier } from '../../utils/subscriptionVerification';
import { markUserNeedsRoleSelection, resolveAuthenticatedDestination } from '@/utils/authFlow';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockShowToast = jest.fn();

jest.mock('expo-router', () => ({
    useRouter: () => ({ replace: mockReplace, push: mockPush }),
    useLocalSearchParams: () => ({})
}));

jest.mock('../../utils/emailOtp', () => ({
    sendEmailOtp: jest.fn().mockResolvedValue({ ok: true, expiresInSeconds: 300, resendInSeconds: 30 }),
}));

jest.mock('../../utils/subscriptionVerification', () => ({
    hydrateSubscriptionTier: jest.fn().mockResolvedValue('shoout'),
}));

jest.mock('@/utils/authFlow', () => ({
    PENDING_SIGNUP_KEY: 'pendingSignupPayload',
    markUserNeedsRoleSelection: jest.fn().mockResolvedValue(undefined),
    resolveAuthenticatedDestination: jest.fn(),
}));

jest.mock('../../store/useToastStore', () => ({
    useToastStore: jest.fn()
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

describe('SignupScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id';
        (useToastStore as unknown as jest.Mock).mockReturnValue({
            showToast: mockShowToast,
        });
        (resolveAuthenticatedDestination as jest.Mock).mockResolvedValue('/(auth)/role-selection');
    });

    it('sends OTP, persists pending signup payload, and routes to OTP verification', async () => {
        const { getByPlaceholderText, getByText } = render(<SignupScreen />);

        fireEvent.changeText(getByPlaceholderText('Full Name'), 'Test Creator');
        fireEvent.changeText(getByPlaceholderText('Email'), 'test@shoouts.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
        fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password123');

        await act(async () => {
            fireEvent.press(getByText('Sign Up'));
        });

        await waitFor(() => {
            expect(sendEmailOtp).toHaveBeenCalledWith('signup', 'test@shoouts.com');
            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
                'pendingSignupPayload',
                expect.stringContaining('"fullName":"Test Creator"')
            );
            expect(mockPush).toHaveBeenCalledWith('/(auth)/signup-otp');
        });
    });

    it('rejects signup if passwords do not match', () => {
        const { getByPlaceholderText, getByText } = render(<SignupScreen />);

        fireEvent.changeText(getByPlaceholderText('Full Name'), 'Test Mismatch');
        fireEvent.changeText(getByPlaceholderText('Email'), 'mismatch@shoouts.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
        fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'wrong123');
        fireEvent.press(getByText('Sign Up'));

        expect(mockShowToast).toHaveBeenCalledWith("Passwords don't match", 'error');
        expect(sendEmailOtp).not.toHaveBeenCalled();
    });

    it('routes first-time Google signup into role selection instead of tabs', async () => {
        const { getByText } = render(<SignupScreen />);

        (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
        (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
            data: { idToken: 'google-test-token' }
        });
        (signInWithCredential as jest.Mock).mockResolvedValue({
            user: { uid: 'google-uid', email: 'g@gmail.com', displayName: 'G User' }
        });
        (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });

        await act(async () => {
            fireEvent.press(getByText('Signup with Google'));
        });

        await waitFor(() => {
            expect(markUserNeedsRoleSelection).toHaveBeenCalledWith(
                'google-uid',
                expect.objectContaining({
                    fullName: 'G User',
                    email: 'g@gmail.com',
                })
            );
            expect(hydrateSubscriptionTier).toHaveBeenCalled();
            expect(mockReplace).toHaveBeenCalledWith('/(auth)/role-selection');
        });
    });
});
