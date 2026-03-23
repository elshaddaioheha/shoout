import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import SubscriptionsScreen from '../../app/settings/subscriptions';
import { useUserStore } from '../../store/useUserStore';

// Mocking Next/Expo router
jest.mock('expo-router', () => ({
    useRouter: () => ({ back: jest.fn() })
}));

// Mock firebase/app
jest.mock('firebase/app', () => ({
    getApps: () => [],
    initializeApp: () => ({})
}));

// Mock icons
jest.mock('lucide-react-native', () => ({
    Check: 'Check',
    ChevronLeft: 'ChevronLeft',
    Sparkles: 'Sparkles',
    Star: 'Star',
    Zap: 'Zap',
    CreditCard: 'CreditCard',
    ShieldCheck: 'ShieldCheck'
}));

// Mock UserStore
jest.mock('../../store/useUserStore', () => ({
    useUserStore: jest.fn()
}));

// Mock Firebase config
jest.mock('@/firebaseConfig', () => ({
    auth: { currentUser: { uid: 'test-user', email: 'test@shoouts.com' } },
    db: {}
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
    doc: jest.fn(),
    updateDoc: jest.fn().mockResolvedValue(true),
    setDoc: jest.fn()
}));

// Mock Flutterwave
jest.mock('flutterwave-react-native', () => {
    const React = require('react');
    const { View } = require('react-native');
    const PayWithFlutterwave = (props: any) => <View testID="flutterwave-mock" />;
    return { PayWithFlutterwave };
});

describe('SubscriptionsScreen UI & Flow Tests', () => {
    const mockSetRole = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert');
        (useUserStore as unknown as jest.Mock).mockReturnValue({
            role: 'vault',
            setRole: mockSetRole
        });
    });

    it('renders vault plans and marks current plan', () => {
        const { getByText } = render(<SubscriptionsScreen />);

        expect(getByText('Premium Plans')).toBeTruthy();
        expect(getByText('Vault Pro')).toBeTruthy();

        // Active plan should show "Current Plan"
        expect(getByText('Current Plan')).toBeTruthy();
    });

    it('shows the payment selection modal when a paid plan is selected', () => {
        const { getByText, getByTestId, getAllByText } = render(<SubscriptionsScreen />);

        // Choose Vault Pro plan
        const chooseButtons = getAllByText('Select Plan');
        fireEvent.press(chooseButtons[0]); // Vault Creator is the first non-current paid plan

        expect(getByText('Select Payment Method')).toBeTruthy();
        expect(getByTestId('flutterwave-mock')).toBeTruthy();
        expect(getByText('Pay with Stripe')).toBeTruthy();
    });

    it('shows Stripe unavailable alert when Stripe option is tapped', async () => {
        const { getByText, getAllByText } = render(<SubscriptionsScreen />);

        const chooseButtons = getAllByText('Select Plan');
        fireEvent.press(chooseButtons[0]);

        const stripeOption = getByText('Pay with Stripe');
        fireEvent.press(stripeOption);

        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith(
                'Stripe unavailable',
                'Stripe/Google Pay checkout is disabled until secure backend verification is deployed. Use Flutterwave for now.'
            );
        });

        expect(mockSetRole).not.toHaveBeenCalled();
    });
});
