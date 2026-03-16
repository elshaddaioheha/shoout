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
    it('starts with vault_free role', () => {
        const { result } = renderHook(() => useUserStore());
        expect(result.current.role).toBe('vault_free');
    });

    it('defaults to vault view mode', () => {
        const { result } = renderHook(() => useUserStore());
        expect(result.current.viewMode).toBe('vault');
    });

    it('cannot sell on free vault plan', () => {
        const { result } = renderHook(() => useUserStore());
        expect(result.current.canSell).toBe(false);
    });

    it('has 50MB storage on free vault plan', () => {
        const { result } = renderHook(() => useUserStore());
        expect(result.current.storageLimitGB).toBe(0.05);
    });

    it('is not premium on free tier', () => {
        const { result } = renderHook(() => useUserStore());
        expect(result.current.isPremium).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Vault plans
// ─────────────────────────────────────────────────────────────────────────────
describe('useUserStore › vault plans', () => {
    it('vault_creator: isPremium, 500MB storage', () => {
        const { result } = renderHook(() => useUserStore());
        act(() => result.current.setRole('vault_creator'));
        expect(result.current.isPremium).toBe(true);
        expect(result.current.storageLimitGB).toBe(0.5);
        expect(result.current.canSell).toBe(false);
    });

    it('vault_pro: 1GB storage, advanced analytics', () => {
        const { result } = renderHook(() => useUserStore());
        act(() => result.current.setRole('vault_pro'));
        expect(result.current.storageLimitGB).toBe(1);
        expect(result.current.hasAdvancedAnalytics).toBe(true);
        expect(result.current.canSell).toBe(false);
    });

    it('vault_executive: 5GB, team access', () => {
        const { result } = renderHook(() => useUserStore());
        act(() => result.current.setRole('vault_executive'));
        expect(result.current.storageLimitGB).toBe(5);
        expect(result.current.hasTeamAccess).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Studio plans
// ─────────────────────────────────────────────────────────────────────────────
describe('useUserStore › studio plans', () => {
    it('studio_free: can sell', () => {
        const { result } = renderHook(() => useUserStore());
        act(() => result.current.setRole('studio_free'));
        expect(result.current.canSell).toBe(true);
        expect(result.current.viewMode).toBe('studio');
    });

    it('studio_pro: can sell, isPremium', () => {
        const { result } = renderHook(() => useUserStore());
        act(() => result.current.setRole('studio_pro'));
        expect(result.current.canSell).toBe(true);
        expect(result.current.isPremium).toBe(true);
    });

    it('studio_plus: can sell, advanced analytics, isPremium', () => {
        const { result } = renderHook(() => useUserStore());
        act(() => result.current.setRole('studio_plus'));
        expect(result.current.canSell).toBe(true);
        expect(result.current.hasAdvancedAnalytics).toBe(true);
        expect(result.current.isPremium).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hybrid plans
// ─────────────────────────────────────────────────────────────────────────────
describe('useUserStore › hybrid plans', () => {
    it('hybrid_creator: can sell, 5GB, analytics', () => {
        const { result } = renderHook(() => useUserStore());
        act(() => result.current.setRole('hybrid_creator'));
        expect(result.current.canSell).toBe(true);
        expect(result.current.storageLimitGB).toBe(5);
        expect(result.current.hasAdvancedAnalytics).toBe(true);
        expect(result.current.isPremium).toBe(true);
    });

    it('hybrid_executive: can sell, 10GB, team access', () => {
        const { result } = renderHook(() => useUserStore());
        act(() => result.current.setRole('hybrid_executive'));
        expect(result.current.canSell).toBe(true);
        expect(result.current.storageLimitGB).toBe(10);
        expect(result.current.hasTeamAccess).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar role badge logic
// ─────────────────────────────────────────────────────────────────────────────
describe('useUserStore › Sidebar hybrid detection', () => {
    const hybridRoles: UserRole[] = ['hybrid_creator', 'hybrid_executive'];
    const nonHybridRoles: UserRole[] = ['vault_free', 'vault_pro', 'studio_pro'];

    hybridRoles.forEach(role => {
        it(`role "${role}" is correctly detected as hybrid via startsWith`, () => {
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

    it('reset returns to default vault_free state', () => {
        act(() => {
            useUserStore.getState().setRole('hybrid_executive');
            useUserStore.getState().setName('Big Boss');
            useUserStore.getState().reset();
        });
        expect(useUserStore.getState().role).toBe('vault_free');
        expect(useUserStore.getState().name).toBe('User');
        expect(useUserStore.getState().isPremium).toBe(false);
    });
});
