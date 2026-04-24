import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockBack = jest.fn();
const mockShowToast = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-audio');

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock('@/components/SafeScreenWrapper', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/settings/SettingsHeader', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => {
    const ReactLocal = require('react');
    const ReactNative = require('react-native');
    return ReactLocal.createElement(ReactNative.Text, null, title);
  },
}));

jest.mock('@/components/ui/Icon', () => ({
  Icon: () => null,
}));

jest.mock('@/hooks/use-app-theme', () => ({
  useAppTheme: () => ({}),
}));

jest.mock('@/store/useToastStore', () => ({
  useToastStore: () => ({
    showToast: mockShowToast,
  }),
}));

jest.mock('@/store/useUserStore', () => ({
  useUserStore: (selector: (state: { canUploadToVault: boolean }) => unknown) =>
    selector({ canUploadToVault: true }),
}));

jest.mock('@/utils/legacyThemeAdapter', () => ({
  adaptLegacyStyles: (styles: unknown) => styles,
}));

import { __audioMock } from 'expo-audio';
import VaultRecordScreen from '@/app/vault/record';

describe('VaultRecordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __audioMock.reset();
    global.fetch = jest.fn(async () => ({
      blob: async () => ({
        type: 'audio/mp4',
      }),
    })) as jest.Mock;
  });

  it('starts and stops recording with expo-audio', async () => {
    const screen = render(<VaultRecordScreen />);

    fireEvent.press(screen.getByText('Start Recording'));

    await waitFor(() => {
      expect(__audioMock.mockRecorder.prepareToRecordAsync).toHaveBeenCalled();
      expect(__audioMock.mockRecorder.record).toHaveBeenCalled();
    });

    __audioMock.setRecorderState({ isRecording: true });
    screen.rerender(<VaultRecordScreen />);

    fireEvent.press(screen.getByText('Stop Recording'));

    await waitFor(() => {
      expect(__audioMock.mockRecorder.stop).toHaveBeenCalled();
    });
  });
});
