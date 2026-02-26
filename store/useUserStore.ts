import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type UserRole = 'vault' | 'vault_pro' | 'studio' | 'hybrid';
export type ViewMode = 'vault' | 'studio';

interface UserState {
    role: UserRole;
    name: string;
    isPremium: boolean;
    viewMode: ViewMode; // Especially for Hybrid users to toggle
    setRole: (role: UserRole) => void;
    setName: (name: string) => void;
    setPremium: (isPremium: boolean) => void;
    setViewMode: (mode: ViewMode) => void;
    reset: () => void;
}

const STORAGE_KEY = 'user-storage-v2'; // Bump version for new schema

const defaultState: UserState = {
    role: 'vault',
    name: 'User',
    isPremium: false,
    viewMode: 'vault',
    setRole: () => { },
    setName: () => { },
    setPremium: () => { },
    setViewMode: () => { },
    reset: () => { },
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
                    setState((prev) => ({
                        ...prev,
                        ...parsed,
                        isPremium: parsed.role === 'vault_pro' || parsed.role === 'hybrid' || !!parsed.isPremium,
                    }));
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
            name: state.name,
            isPremium: state.isPremium,
            viewMode: state.viewMode,
        };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist)).catch(() => {
            // Ignore storage errors
        });
    }, [state.role, state.name, state.isPremium, state.viewMode]);

    const setRole = useCallback((role: UserRole) => {
        setState((prev) => ({
            ...prev,
            role,
            isPremium: role === 'vault_pro' || role === 'hybrid' || prev.isPremium,
            // Default view mode based on role
            viewMode: role === 'studio' ? 'studio' : 'vault',
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
        setState((prev) => ({
            ...prev,
            role: 'vault',
            name: 'User',
            isPremium: false,
            viewMode: 'vault',
        }));
    }, []);

    const store: UserState = {
        ...state,
        setRole,
        setName,
        setPremium,
        setViewMode,
        reset,
    };

    return selector ? selector(store) : (store as unknown as T);
}
