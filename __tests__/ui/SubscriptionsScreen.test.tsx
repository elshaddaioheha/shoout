import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import SubscriptionsScreen from '../../app/settings/subscriptions';
import { useUserStore } from '../../store/useUserStore';

jest.mock('expo-router', () => ({
    useRouter: () => ({ back: jest.fn() })
}));

jest.mock('firebase/app', () => ({
    getApps: () => [],
    initializeApp: () => ({})
}));

jest.mock('lucide-react-native', () => ({
    Check: 'Check',
    ChevronLeft: 'ChevronLeft',
    Sparkles: 'Sparkles',
    Star: 'Star',
    CreditCard: 'CreditCard',
    ShieldCheck: 'ShieldCheck',
    PartyPopper: 'PartyPopper'
}));

jest.mock('../../store/useUserStore', () => ({
    useUserStore: jest.fn()
}));

jest.mock('../../store/useAuthStore', () => ({
    useAuthStore: () => ({ actualRole: 'vault' })
}));

jest.mock('@/utils/subscriptionVerification', () => ({
    hydrateSubscriptionTier: jest.fn().mockResolvedValue('vault'),
}));

jest.mock('@/firebaseConfig', () => ({
    auth: { currentUser: { uid: 'test-user', email: 'test@shoouts.com', getIdToken: jest.fn().mockResolvedValue('token') } },
    db: {}
}));

jest.mock('flutterwave-react-native', () => {
    const React = require('react');
    const { View } = require('react-native');
    const PayWithFlutterwave = () => <View testID="flutterwave-mock" />;
    return { PayWithFlutterwave };
});

global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true }),
}) as any;

describe('SubscriptionsScreen UI and flow tests', () => {
    const mockSetActiveAppMode = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY = 'test-flutterwave-public-key';
        jest.spyOn(Alert, 'alert');
        (useUserStore as unknown as jest.Mock).mockReturnValue({
            role: 'vault',
            activeAppMode: 'shoout',
            setActiveAppMode: mockSetActiveAppMode,
        });
    });

    it('renders the new switcher-ready plans', () => {
        const { getByText, getAllByText } = render(<SubscriptionsScreen />);

        expect(getByText('Premium Plans')).toBeTruthy();
        expect(getAllByText('Shoouts').length).toBeGreaterThan(0);
        expect(getByText('Vault')).toBeTruthy();
    });

    it('shows the payment selection modal when a paid plan is selected', () => {
        const { getByText, getByTestId, getAllByText } = render(<SubscriptionsScreen />);

        fireEvent.press(getByText('Vault'));
        const chooseButtons = getAllByText('Select Plan');
        fireEvent.press(chooseButtons[0]);

        expect(getByText('Select Payment Method')).toBeTruthy();
        expect(getByTestId('flutterwave-mock')).toBeTruthy();
        expect(getByText('Stripe is temporarily unavailable. Flutterwave is currently the active checkout option.')).toBeTruthy();
    });

    it('does not switch app mode just by opening the paid checkout modal', async () => {
        const { getByText, getAllByText } = render(<SubscriptionsScreen />);

        fireEvent.press(getByText('Vault'));
        const chooseButtons = getAllByText('Select Plan');
        fireEvent.press(chooseButtons[0]);

        await waitFor(() => {
            expect(getByText('Select Payment Method')).toBeTruthy();
        });

        expect(mockSetActiveAppMode).not.toHaveBeenCalled();
        expect(Alert.alert).not.toHaveBeenCalled();
    });
});
