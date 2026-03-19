import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type UserRole =
    | 'vault_free' | 'vault_creator' | 'vault_pro' | 'vault_executive'
    | 'studio_free' | 'studio_pro' | 'studio_plus'
    | 'hybrid_creator' | 'hybrid_executive';

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

const defaultState = {
    role: 'vault_free' as UserRole,
    actualRole: 'vault_free' as UserRole,
    name: 'User',
    isPremium: false,
    viewMode: 'vault' as ViewMode,
    storageLimitGB: 0.05, // 50MB
    canSell: false,
    hasTeamAccess: false,
    hasAdvancedAnalytics: false,
    transactionFeePercent: 10,
};

const getRoleCapabilities = (role: UserRole) => {
    // Shared defaults
    let capabilities = {
        isPremium: false,
        storageLimitGB: 0.05,
        canSell: false,
        hasTeamAccess: false,
        hasAdvancedAnalytics: false,
        transactionFeePercent: 10,
        viewMode: 'vault' as ViewMode
    };

    switch (role) {
        // Vault Plans
        case 'vault_free':
            return { ...capabilities };
        case 'vault_creator':
            return { ...capabilities, isPremium: true, storageLimitGB: 0.5 };
        case 'vault_pro':
            return { ...capabilities, isPremium: true, storageLimitGB: 1, hasAdvancedAnalytics: true };
        case 'vault_executive':
            return { ...capabilities, isPremium: true, storageLimitGB: 5, hasAdvancedAnalytics: true, hasTeamAccess: true };

        // Studio Plans
        case 'studio_free':
            return { ...capabilities, viewMode: 'studio' as ViewMode, canSell: true };
        case 'studio_pro':
            return { ...capabilities, viewMode: 'studio' as ViewMode, isPremium: true, canSell: true }; // Basic analytics implicitly true
        case 'studio_plus':
            return { ...capabilities, viewMode: 'studio' as ViewMode, isPremium: true, canSell: true, hasAdvancedAnalytics: true };

        // Hybrid Plans
        case 'hybrid_creator':
            return { ...capabilities, viewMode: 'vault' as ViewMode, isPremium: true, canSell: true, storageLimitGB: 5, hasAdvancedAnalytics: true };
        case 'hybrid_executive':
            return { ...capabilities, viewMode: 'vault' as ViewMode, isPremium: true, canSell: true, storageLimitGB: 10, hasAdvancedAnalytics: true, hasTeamAccess: true };

        default:
            return capabilities;
    }
};

const createBaseState = (): Omit<UserState, 'setRole' | 'setActualRole' | 'setName' | 'setPremium' | 'setViewMode' | 'reset'> => ({
    ...defaultState,
});

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
