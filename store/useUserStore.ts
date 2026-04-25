import type { AppMode, SubscriptionPlanId } from '@/utils/subscriptions';
import { getEffectivePlan, getFeatureFlags } from '@/utils/subscriptions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export type UserRole = SubscriptionPlanId;
export type ViewMode = AppMode;

interface UserState {
    role: UserRole;
    actualRole: UserRole;
    name: string;
    isHydrated: boolean;
    isPremium: boolean;
    activeAppMode: ViewMode;
    viewMode: ViewMode;
    storageLimitGB: number;
    maxVaultUploads: number;
    canSell: boolean;
    canAccessVaultWorkspace: boolean;
    canUploadToVault: boolean;
    canShareVaultLinks: boolean;
    canEditVaultTracks: boolean;
    hasTeamAccess: boolean;
    hasAdvancedAnalytics: boolean;
    transactionFeePercent: number;
    setRole: (role: UserRole) => void;
    setActualRole: (role: UserRole) => void;
    setName: (name: string) => void;
    setPremium: (isPremium: boolean) => void;
    setViewMode: (mode: ViewMode) => void;
    setActiveAppMode: (mode: ViewMode) => void;
    setHydrated: (isHydrated: boolean) => void;
    reset: () => void;
}

interface PersistedUserState {
    activeAppMode: ViewMode;
}

const STORAGE_KEY = 'shoouts-user-preferences-v4';
const canUseBrowserStorage = typeof window !== 'undefined';

const noopStorage: StateStorage = {
    getItem: () => null,
    setItem: () => {
        // No-op for non-browser runtimes (server-side web rendering).
    },
    removeItem: () => {
        // No-op for non-browser runtimes (server-side web rendering).
    },
};

const getRoleCapabilities = (role: UserRole) => {
    const flags = getFeatureFlags(role);
    return {
        isPremium: role !== 'shoout' && role !== 'vault',
        storageLimitGB: flags.storageLimitGB,
        maxVaultUploads: flags.maxVaultUploads,
        canSell: flags.canSell,
        canAccessVaultWorkspace: flags.canAccessVaultWorkspace,
        canUploadToVault: flags.canUploadToVault,
        canShareVaultLinks: flags.canShareVaultLinks,
        canEditVaultTracks: flags.canEditVaultTracks,
        hasTeamAccess: flags.canUseTeamAccess,
        hasAdvancedAnalytics: flags.canUseAnalytics,
        transactionFeePercent: role === 'hybrid' ? 10 : 10,
    };
};

const createBaseState = (): Omit<
    UserState,
    'setRole' | 'setActualRole' | 'setName' | 'setPremium' | 'setViewMode' | 'setActiveAppMode' | 'setHydrated' | 'reset'
> => {
    const role: UserRole = 'shoout';
    return {
        role,
        actualRole: role,
        name: 'User',
        isHydrated: process.env.NODE_ENV === 'test',
        activeAppMode: 'shoout',
        viewMode: 'shoout',
        ...getRoleCapabilities(role),
    };
};

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            ...createBaseState(),
            setRole: (role) => {
                const normalizedRole = getEffectivePlan(role) as UserRole;
                const caps = getRoleCapabilities(normalizedRole);
                set({ role: normalizedRole, ...caps });
            },
            setActualRole: (actualRole) => set({ actualRole: getEffectivePlan(actualRole) as UserRole }),
            setName: (name) => set({ name }),
            setPremium: (isPremium) => set({ isPremium }),
            setViewMode: (viewMode) => {
                const normalizedMode = getEffectivePlan(viewMode) as ViewMode;
                set({ activeAppMode: normalizedMode, viewMode: normalizedMode });
            },
            setActiveAppMode: (activeAppMode) => {
                const normalizedMode = getEffectivePlan(activeAppMode) as ViewMode;
                set({ activeAppMode: normalizedMode, viewMode: normalizedMode });
            },
            setHydrated: (isHydrated) => set({ isHydrated }),
            reset: () => set({ ...createBaseState() }),
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => (canUseBrowserStorage ? AsyncStorage : noopStorage)),
            skipHydration: process.env.NODE_ENV === 'test' || !canUseBrowserStorage,
            onRehydrateStorage: (state) => {
                state?.setHydrated(false);
                return (rehydratedState, error) => {
                    if (error) {
                        console.warn('[useUserStore] Failed to rehydrate persisted state:', error);
                    }
                    rehydratedState?.setHydrated(true);
                };
            },
            partialize: (state): PersistedUserState => ({
                activeAppMode: state.activeAppMode,
            }),
            merge: (persistedState, currentState) => {
                const parsed = persistedState as { state?: Partial<PersistedUserState> } | undefined;
                const persisted = parsed?.state;
                const persistedMode = getEffectivePlan(persisted?.activeAppMode) as ViewMode;

                return {
                    ...currentState,
                    activeAppMode: persistedMode,
                    viewMode: persistedMode,
                };
            },
        }
    )
);
