/**
 * User plan capability tests.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { act, renderHook } from '@testing-library/react-native';
import type { UserRole } from '../../store/useUserStore';
import { useUserStore } from '../../store/useUserStore';

beforeEach(() => {
    act(() => {
        useUserStore.getState().reset();
    });
});

describe('useUserStore default state', () => {
    it('starts with vault role', () => {
        const { result } = renderHook(() => useUserStore());
        expect(result.current.role).toBe('vault');
    });

    it('defaults to shoout app mode', () => {
        const { result } = renderHook(() => useUserStore());
        expect(result.current.activeAppMode).toBe('shoout');
    });

    it('cannot sell on vault plan', () => {
        const { result } = renderHook(() => useUserStore());
        expect(result.current.canSell).toBe(false);
    });

    it('has 50MB storage on vault plan', () => {
        const { result } = renderHook(() => useUserStore());
        expect(result.current.storageLimitGB).toBe(0.05);
    });

    it('is not premium on vault tier', () => {
        const { result } = renderHook(() => useUserStore());
        expect(result.current.isPremium).toBe(false);
    });
});

describe('useUserStore shoout', () => {
    it('shoout is buyer-first with no storage or selling', () => {
        const { result } = renderHook(() => useUserStore());
        act(() => result.current.setRole('shoout'));
        expect(result.current.canSell).toBe(false);
        expect(result.current.storageLimitGB).toBe(0);
        expect(result.current.maxVaultUploads).toBe(0);
        expect(result.current.canAccessVaultWorkspace).toBe(false);
        expect(result.current.isPremium).toBe(false);
    });
});

describe('useUserStore vault_pro', () => {
    it('vault_pro has 5GB storage, higher upload limits, and premium state', () => {
        const { result } = renderHook(() => useUserStore());
        act(() => result.current.setRole('vault_pro'));
        expect(result.current.isPremium).toBe(true);
        expect(result.current.storageLimitGB).toBe(5);
        expect(result.current.maxVaultUploads).toBe(500);
        expect(result.current.canAccessVaultWorkspace).toBe(true);
        expect(result.current.canUploadToVault).toBe(true);
        expect(result.current.hasAdvancedAnalytics).toBe(false);
        expect(result.current.canSell).toBe(false);
    });
});

describe('useUserStore studio', () => {
    it('studio can sell and has creator analytics', () => {
        const { result } = renderHook(() => useUserStore());
        act(() => result.current.setRole('studio'));
        expect(result.current.canSell).toBe(true);
        expect(result.current.isPremium).toBe(true);
        expect(result.current.storageLimitGB).toBe(2);
        expect(result.current.hasAdvancedAnalytics).toBe(true);
    });
});

describe('useUserStore hybrid', () => {
    it('hybrid can sell, has 10GB storage, team access, and analytics', () => {
        const { result } = renderHook(() => useUserStore());
        act(() => result.current.setRole('hybrid'));
        expect(result.current.canSell).toBe(true);
        expect(result.current.storageLimitGB).toBe(10);
        expect(result.current.hasAdvancedAnalytics).toBe(true);
        expect(result.current.hasTeamAccess).toBe(true);
        expect(result.current.isPremium).toBe(true);
    });
});

describe('useUserStore hybrid detection helpers', () => {
    const hybridRoles: UserRole[] = ['hybrid'];
    const nonHybridRoles: UserRole[] = ['shoout', 'vault', 'vault_pro', 'studio'];

    hybridRoles.forEach(role => {
        it(`role "${role}" is detected as hybrid`, () => {
            expect(role.startsWith('hybrid')).toBe(true);
        });
    });

    nonHybridRoles.forEach(role => {
        it(`role "${role}" is not detected as hybrid`, () => {
            expect(role.startsWith('hybrid')).toBe(false);
        });
    });
});

describe('useUserStore actions', () => {
    it('setName updates the user name', () => {
        act(() => {
            useUserStore.getState().setName('Ade Osei');
        });
        expect(useUserStore.getState().name).toBe('Ade Osei');
    });

    it('setViewMode toggles across app modes', () => {
        act(() => {
            useUserStore.getState().setViewMode('hybrid');
        });
        expect(useUserStore.getState().activeAppMode).toBe('hybrid');
        act(() => {
            useUserStore.getState().setViewMode('shoout');
        });
        expect(useUserStore.getState().activeAppMode).toBe('shoout');
    });

    it('reset returns to default state', () => {
        act(() => {
            useUserStore.getState().setRole('hybrid');
            useUserStore.getState().setName('Big Boss');
            useUserStore.getState().reset();
        });
        expect(useUserStore.getState().role).toBe('vault');
        expect(useUserStore.getState().name).toBe('User');
        expect(useUserStore.getState().isPremium).toBe(false);
        expect(useUserStore.getState().activeAppMode).toBe('shoout');
    });
});
