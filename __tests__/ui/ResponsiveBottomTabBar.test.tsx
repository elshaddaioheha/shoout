import { render } from '@testing-library/react-native';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import ResponsiveBottomTabBar from '../../components/ResponsiveBottomTabBar';

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('lucide-react-native', () => ({
  Home: 'Home',
  Library: 'Library',
  Megaphone: 'Megaphone',
  MoreHorizontal: 'MoreHorizontal',
  Search: 'Search',
  ShoppingCart: 'ShoppingCart',
  Upload: 'Upload',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/(tabs)/index',
}));

jest.mock('../../store/useUserStore', () => ({
  useUserStore: jest.fn(),
}));

const { useUserStore } = jest.requireMock('../../store/useUserStore') as {
  useUserStore: jest.Mock;
};

const baseProps: any = {
  state: {
    index: 0,
    routes: [
      { key: 'index-key', name: 'index' },
      { key: 'search-key', name: 'search' },
      { key: 'marketplace-key', name: 'marketplace' },
      { key: 'library-key', name: 'library' },
      { key: 'more-key', name: 'more' },
    ],
  },
  navigation: {
    navigate: jest.fn(),
    emit: jest.fn(() => ({ defaultPrevented: false })),
  },
  descriptors: {},
  insets: { bottom: 0, left: 0, right: 0, top: 0 },
};

describe('ResponsiveBottomTabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a buyer tab set for shoout mode', () => {
    useUserStore.mockImplementation((selector: any) =>
      selector({ activeAppMode: 'shoout', role: 'shoout' })
    );

    const shooutProps = {
      ...baseProps,
      state: { ...baseProps.state, index: 1 },
    };

    const { getByText, queryByText, UNSAFE_getAllByType } = render(<ResponsiveBottomTabBar {...shooutProps} />);

    expect(getByText('Search')).toBeTruthy();
    expect(queryByText('Explore')).toBeNull();
    expect(UNSAFE_getAllByType(TouchableOpacity)).toHaveLength(4);
  });

  it('renders only home and more for vault mode', () => {
    useUserStore.mockImplementation((selector: any) =>
      selector({ activeAppMode: 'vault', role: 'vault' })
    );

    const vaultProps = {
      ...baseProps,
      state: { ...baseProps.state, index: 4 },
    };

    const { getByText, queryByText, UNSAFE_getAllByType } = render(<ResponsiveBottomTabBar {...vaultProps} />);

    expect(getByText('More')).toBeTruthy();
    expect(queryByText('Search')).toBeNull();
    expect(queryByText('Cart')).toBeNull();
    expect(queryByText('Explore')).toBeNull();
    expect(UNSAFE_getAllByType(TouchableOpacity)).toHaveLength(2);
  });

  it('renders a creator tab set for studio mode', () => {
    useUserStore.mockImplementation((selector: any) =>
      selector({ activeAppMode: 'studio', role: 'studio' })
    );

    const studioProps = {
      ...baseProps,
      state: { ...baseProps.state, index: 2 },
    };

    const { getByText, queryByText, UNSAFE_getAllByType } = render(<ResponsiveBottomTabBar {...studioProps} />);

    expect(getByText('Promote')).toBeTruthy();
    expect(queryByText('Cart')).toBeNull();
    expect(queryByText('Explore')).toBeNull();
    expect(UNSAFE_getAllByType(TouchableOpacity)).toHaveLength(4);
  });

  it('renders the creator preview shell for hybrid mode', () => {
    useUserStore.mockImplementation((selector: any) =>
      selector({ activeAppMode: 'hybrid', role: 'shoout' })
    );

    const hybridProps = {
      ...baseProps,
      state: { ...baseProps.state, index: 3 },
    };

    const { getByText, queryByText, UNSAFE_getAllByType } = render(<ResponsiveBottomTabBar {...hybridProps} />);

    expect(getByText('Studio')).toBeTruthy();
    expect(queryByText('Cart')).toBeNull();
    expect(UNSAFE_getAllByType(TouchableOpacity)).toHaveLength(5);
  });
});
