import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Canonical subscription tiers — same IDs as Cloud Functions + Firestore `subscription.tier`. */
export type UserRole = 'vault' | 'vault_pro' | 'studio' | 'hybrid';

export type ViewMode = 'vault' | 'studio';

interface UserState {
    role: UserRole;        // Active/simulated role
    actualRole: UserRole;  // Paid role
    name: string;
    isPremium: boolean;
    viewMode: ViewMode;

    // Extracted capabilities based on active Role
    storageLimitGB: number;
    canSell: boolean;
    hasTeamAccess: boolean;
    hasAdvancedAnalytics: boolean;
    transactionFeePercent: number;

    setRole: (role: UserRole) => void;
    setActualRole: (role: UserRole) => void;
    setName: (name: string) => void;
    setPremium: (isPremium: boolean) => void;
    setViewMode: (mode: ViewMode) => void;
    reset: () => void;
}

/**
 * PersistedUserState
 *
 * SECURITY NOTE: Only UI preferences are persisted to AsyncStorage.
 * actualRole and all permission-based data are NEVER persisted locally.
 * They are set only from server-verified sources in useAuthStore.
 */
interface PersistedUserState {
    viewMode: ViewMode;
}

const STORAGE_KEY = 'shoouts-user-preferences-v3';

const getRoleCapabilities = (role: UserRole) => {
    const base = {
        isPremium: false,
        storageLimitGB: 0.5,
        canSell: false,
        hasTeamAccess: false,
        hasAdvancedAnalytics: false,
        transactionFeePercent: 10,
        viewMode: 'vault' as ViewMode,
    };

    switch (role) {
        case 'vault':
            return { ...base, storageLimitGB: 0.5 };
        case 'vault_pro':
            return {
                ...base,
                isPremium: true,
                storageLimitGB: 1,
                hasAdvancedAnalytics: true,
            };
        case 'studio':
            return {
                ...base,
                isPremium: true,
                viewMode: 'studio' as ViewMode,
                canSell: true,
                storageLimitGB: 2,
                hasAdvancedAnalytics: true,
            };
        case 'hybrid':
            return {
                ...base,
                isPremium: true,
                viewMode: 'vault' as ViewMode,
                canSell: true,
                storageLimitGB: 10,
                hasAdvancedAnalytics: true,
                hasTeamAccess: true,
            };
        default: {
            const _exhaustive: never = role;
            return _exhaustive;
        }
    }
};

const createBaseState = (): Omit<UserState, 'setRole' | 'setActualRole' | 'setName' | 'setPremium' | 'setViewMode' | 'reset'> => {
    const role: UserRole = 'vault';
    return {
        role,
        actualRole: role,
        name: 'User',
        ...getRoleCapabilities(role),
    };
};

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            ...createBaseState(),
            setRole: (role) => {
                const caps = getRoleCapabilities(role);
                set({ role, ...caps });
            },
            setActualRole: (actualRole) => set({ actualRole }),
            setName: (name) => set({ name }),
            setPremium: (isPremium) => set({ isPremium }),
            setViewMode: (viewMode) => set({ viewMode }),
            reset: () => set({ ...createBaseState() }),
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => AsyncStorage),
            skipHydration: process.env.NODE_ENV === 'test',
            // SECURITY: Only persist viewMode (UI preference).
            // actualRole and other permission data are fetched from server only.
            partialize: (state): PersistedUserState => ({
                viewMode: state.viewMode,
            }),
            merge: (persistedState, currentState) => {
                const parsed = persistedState as { state?: Partial<PersistedUserState> } | undefined;
                const persisted = parsed?.state;

                // Restore only viewMode from storage
                // All other data (role, actualRole, permissions) come from server
                return {
                    ...currentState,
                    viewMode: persisted?.viewMode || 'vault',
                };
            },
        }
    )
);
