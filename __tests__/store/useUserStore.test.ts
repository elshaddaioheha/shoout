/**
 * User Role Capabilities Tests
 *
 * useUserStore is a Zustand store hook.
 * Strategy: render/select store state, call actions, and assert capabilities.
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

// ─────────────────────────────────────────────────────────────────────────────
// Default state
// ─────────────────────────────────────────────────────────────────────────────
describe('useUserStore › default state', () => {
    it('starts with vault role', () => {
        const { result } = renderHook(() => useUserStore());
        expect(result.current.role).toBe('vault');
    });

    it('defaults to vault view mode', () => {
        const { result } = renderHook(() => useUserStore());
        expect(result.current.viewMode).toBe('vault');
    });

    it('cannot sell on vault plan', () => {
        const { result } = renderHook(() => useUserStore());
        expect(result.current.canSell).toBe(false);
    });

    it('has 500MB storage on vault plan', () => {
        const { result } = renderHook(() => useUserStore());
        expect(result.current.storageLimitGB).toBe(0.5);
    });

    it('is not premium on vault tier', () => {
        const { result } = renderHook(() => useUserStore());
        expect(result.current.isPremium).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Vault plans
// ─────────────────────────────────────────────────────────────────────────────
describe('useUserStore › vault_pro', () => {
    it('vault_pro: 1GB storage, advanced analytics, premium', () => {
        const { result } = renderHook(() => useUserStore());
        act(() => result.current.setRole('vault_pro'));
        expect(result.current.isPremium).toBe(true);
        expect(result.current.storageLimitGB).toBe(1);
        expect(result.current.hasAdvancedAnalytics).toBe(true);
        expect(result.current.canSell).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Studio
// ─────────────────────────────────────────────────────────────────────────────
describe('useUserStore › studio', () => {
    it('studio: can sell, premium, studio view mode, 2GB', () => {
        const { result } = renderHook(() => useUserStore());
        act(() => result.current.setRole('studio'));
        expect(result.current.canSell).toBe(true);
        expect(result.current.isPremium).toBe(true);
        expect(result.current.viewMode).toBe('studio');
        expect(result.current.storageLimitGB).toBe(2);
        expect(result.current.hasAdvancedAnalytics).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hybrid
// ─────────────────────────────────────────────────────────────────────────────
describe('useUserStore › hybrid', () => {
    it('hybrid: can sell, 10GB, team access, analytics', () => {
        const { result } = renderHook(() => useUserStore());
        act(() => result.current.setRole('hybrid'));
        expect(result.current.canSell).toBe(true);
        expect(result.current.storageLimitGB).toBe(10);
        expect(result.current.hasAdvancedAnalytics).toBe(true);
        expect(result.current.hasTeamAccess).toBe(true);
        expect(result.current.isPremium).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar / badge role hints (string prefix checks used in UI)
// ─────────────────────────────────────────────────────────────────────────────
describe('useUserStore › hybrid detection helpers', () => {
    const hybridRoles: UserRole[] = ['hybrid'];
    const nonHybridRoles: UserRole[] = ['vault', 'vault_pro', 'studio'];

    hybridRoles.forEach(role => {
        it(`role "${role}" is detected as hybrid via startsWith`, () => {
            expect(role.startsWith('hybrid')).toBe(true);
        });
    });

    nonHybridRoles.forEach(role => {
        it(`role "${role}" is NOT detected as hybrid`, () => {
            expect(role.startsWith('hybrid')).toBe(false);
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// setName / setViewMode / reset
// ─────────────────────────────────────────────────────────────────────────────
describe('useUserStore › actions', () => {
    it('setName updates the user name', () => {
        act(() => {
            useUserStore.getState().setName('Ade Osei');
        });
        expect(useUserStore.getState().name).toBe('Ade Osei');
    });

    it('setViewMode toggles between vault and studio', () => {
        act(() => {
            useUserStore.getState().setViewMode('studio');
        });
        expect(useUserStore.getState().viewMode).toBe('studio');
        act(() => {
            useUserStore.getState().setViewMode('vault');
        });
        expect(useUserStore.getState().viewMode).toBe('vault');
    });

    it('reset returns to default vault state', () => {
        act(() => {
            useUserStore.getState().setRole('hybrid');
            useUserStore.getState().setName('Big Boss');
            useUserStore.getState().reset();
        });
        expect(useUserStore.getState().role).toBe('vault');
        expect(useUserStore.getState().name).toBe('User');
        expect(useUserStore.getState().isPremium).toBe(false);
    });
});
