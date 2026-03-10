import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

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

const STORAGE_KEY = 'shoouts-user-preferences-v3';

const defaultState: UserState = {
    role: 'vault_free',
    actualRole: 'vault_free',
    name: 'User',
    isPremium: false,
    viewMode: 'vault',
    storageLimitGB: 0.05, // 50MB
    canSell: false,
    hasTeamAccess: false,
    hasAdvancedAnalytics: false,
    transactionFeePercent: 10,
    setRole: () => { },
    setActualRole: () => { },
    setName: () => { },
    setPremium: () => { },
    setViewMode: () => { },
    reset: () => { },
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

export function useUserStore<T = UserState>(
    selector?: (state: UserState) => T
): T {
    const [state, setState] = useState<UserState>(defaultState);

    // Load from AsyncStorage once
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                if (raw && !cancelled) {
                    const parsed = JSON.parse(raw) as Partial<UserState>;
                    if (parsed.role) {
                        const caps = getRoleCapabilities(parsed.role);
                        setState((prev) => ({
                            ...prev,
                            ...parsed,
                            actualRole: parsed.actualRole || parsed.role!,
                            ...caps,
                        }));
                    }
                }
            } catch {
                // Ignore storage errors
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    // Persist whenever core fields change
    useEffect(() => {
        const toPersist = {
            role: state.role,
            actualRole: state.actualRole,
            name: state.name,
            viewMode: state.viewMode,
        };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist)).catch(() => {
            // Ignore storage errors
        });
    }, [state.role, state.name, state.viewMode]);

    const setRole = useCallback((role: UserRole) => {
        setState((prev) => {
            const caps = getRoleCapabilities(role);
            return {
                ...prev,
                role,
                ...caps,
            };
        });
    }, []);

    const setActualRole = useCallback((actualRole: UserRole) => {
        setState((prev) => ({
            ...prev,
            actualRole,
        }));
    }, []);

    const setViewMode = useCallback((viewMode: ViewMode) => {
        setState((prev) => ({
            ...prev,
            viewMode,
        }));
    }, []);

    const setName = useCallback((name: string) => {
        setState((prev) => ({
            ...prev,
            name,
        }));
    }, []);

    const setPremium = useCallback((isPremium: boolean) => {
        setState((prev) => ({
            ...prev,
            isPremium,
        }));
    }, []);

    const reset = useCallback(() => {
        setState(defaultState);
    }, []);

    const store: UserState = {
        ...state,
        setRole,
        setActualRole,
        setName,
        setPremium,
        setViewMode,
        reset,
    };

    return selector ? selector(store) : (store as unknown as T);
}
