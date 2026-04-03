import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AppMode, SubscriptionPlanId } from '@/utils/subscriptions';
import { getEffectivePlan, getFeatureFlags } from '@/utils/subscriptions';

export type UserRole = SubscriptionPlanId;
export type ViewMode = AppMode;

interface UserState {
    role: UserRole;
    actualRole: UserRole;
    name: string;
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
    reset: () => void;
}

interface PersistedUserState {
    activeAppMode: ViewMode;
}

const STORAGE_KEY = 'shoouts-user-preferences-v4';

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

const createBaseState = (): Omit<UserState, 'setRole' | 'setActualRole' | 'setName' | 'setPremium' | 'setViewMode' | 'setActiveAppMode' | 'reset'> => {
    const role: UserRole = 'vault';
    return {
        role,
        actualRole: role,
        name: 'User',
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
            setViewMode: (viewMode) => set({ activeAppMode: viewMode, viewMode }),
            setActiveAppMode: (activeAppMode) => set({ activeAppMode, viewMode: activeAppMode }),
            reset: () => set({ ...createBaseState() }),
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => AsyncStorage),
            skipHydration: process.env.NODE_ENV === 'test',
            partialize: (state): PersistedUserState => ({
                activeAppMode: state.activeAppMode,
            }),
            merge: (persistedState, currentState) => {
                const parsed = persistedState as { state?: Partial<PersistedUserState> } | undefined;
                const persisted = parsed?.state;

                return {
                    ...currentState,
                    activeAppMode: persisted?.activeAppMode || 'shoout',
                    viewMode: persisted?.activeAppMode || 'shoout',
                };
            },
        }
    )
);
