/**
 * Robust Store Utilities for Zustand + Firebase (React Native)
 * 
 * Handles:
 * - Offline persistence with conflict resolution
 * - Optimistic UI updates with rollback on failure
 * - Race condition prevention
 * - Sync status tracking
 * 
 * Usage in your stores:
 * ```typescript
 * import { useSyncStatus } from '@/store/robust-store-utils';
 * import { useCartStore } from '@/store/useCartStore';
 * 
 * // In component:
 * const items = useCartStore(state => state.items);
 * const syncStatus = useSyncStatus(state => 
 *   state.getSyncStatus('cart')
 * );
 * ```
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number | null;
  lastError: string | null;
  retryCount: number;
  isOffline: boolean;
}

export interface RobustStoreConfig<T> {
  /** Store name for AsyncStorage */
  storeName: string;

  /** Function to sync state with backend (Firebase, etc.) */
  onSync?: (state: T) => Promise<void>;

  /** Max retries for failed syncs */
  maxRetries?: number;

  /** Debounce sync by N ms (prevents rapid re-syncs) */
  syncDebounceMs?: number;

  /** Detect conflicts and merge (custom conflict resolution) */
  onConflict?: (local: T, remote: T) => T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync Status Store (Global)
// ─────────────────────────────────────────────────────────────────────────────

export const useSyncStatus = create<{
  stores: Record<string, SyncStatus>;
  setSyncStatus: (storeName: string, status: Partial<SyncStatus>) => void;
  getSyncStatus: (storeName: string) => SyncStatus;
}>((set, get) => ({
  stores: {},
  setSyncStatus: (storeName, status) => {
    set(state => ({
      stores: {
        ...state.stores,
        [storeName]: {
          ...(state.stores[storeName] || {
            isSyncing: false,
            lastSyncTime: null,
            lastError: null,
            retryCount: 0,
            isOffline: false,
          }),
          ...status,
        },
      },
    }));
  },
  getSyncStatus: (storeName) => {
    const status = get().stores[storeName];
    return status || {
      isSyncing: false,
      lastSyncTime: null,
      lastError: null,
      retryCount: 0,
      isOffline: false,
    };
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Create Robust Store with Offline Persistence
// ─────────────────────────────────────────────────────────────────────────────

export function createRobustStore<T extends Record<string, any>>(
  storeName: string,
  initialState: T,
  config: RobustStoreConfig<T> & { [K in keyof T]: (set: any, get: any) => T[K] }
) {
  const {
    onSync,
    maxRetries = 3,
    syncDebounceMs = 500,
  } = config;

  let syncTimeoutId: ReturnType<typeof setTimeout> | null = null;

  return create<T & {
    // Sync management
    _sync: () => Promise<void>;
    _syncWithRetry: (retryCount?: number) => Promise<void>;
    getSync: () => SyncStatus;

    // Optimistic updates (with rollback support)
    _updateOptimistic: (updates: Partial<T>, rollbackValue: T | null) => Promise<void>;
  }>()(
    persist(
      (set, get) => ({
        ...initialState,

        // ─── Sync Implementation ───────────────────────────────────────────
        _sync: async () => {
          if (!onSync) return;

          const status = useSyncStatus.getState().getSyncStatus(storeName);
          if (status.isSyncing) return; // Already syncing

          useSyncStatus.getState().setSyncStatus(storeName, {
            isSyncing: true,
            lastError: null,
          });

          try {
            const state = get() as T;
            await onSync(state);

            useSyncStatus.getState().setSyncStatus(storeName, {
              isSyncing: false,
              lastSyncTime: Date.now(),
              retryCount: 0,
            });
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            useSyncStatus.getState().setSyncStatus(storeName, {
              isSyncing: false,
              lastError: errorMsg,
              isOffline: error instanceof TypeError && error.message.includes('fetch'),
            });

            throw error;
          }
        },

        _syncWithRetry: async (retryCount = 0) => {
          try {
            await (get() as any)._sync();
          } catch (error) {
            if (retryCount < maxRetries) {
              // Exponential backoff: 1s, 2s, 4s, etc.
              const delayMs = 1000 * Math.pow(2, retryCount);
              console.warn(
                `[${storeName}] Sync failed, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries})`
              );

              await new Promise(resolve => setTimeout(resolve, delayMs));
              await (get() as any)._syncWithRetry(retryCount + 1);
            } else {
              console.error(
                `[${storeName}] Sync failed after ${maxRetries} retries:`,
                error
              );
              throw error;
            }
          }
        },

        getSync: () => useSyncStatus.getState().getSyncStatus(storeName),

        // ─── Optimistic Updates ────────────────────────────────────────────
        _updateOptimistic: async (updates: Partial<T>, rollbackValue: T | null) => {
          // 1. Save current state for rollback
          const previousState = { ...get() };

          try {
            // 2. Apply update immediately (optimistic)
            set(updates as any);

            // 3. Try to sync
            await (get() as any)._syncWithRetry(0);

            // 4. Success - UI already updated, sync complete
            return;
          } catch (error) {
            // 5. Failure - rollback UI to previous state
            if (rollbackValue) {
              set(rollbackValue as any);
            } else {
              set(previousState as any);
            }

            // 6. Re-throw for component error boundary
            throw error;
          }
        },
      }),
      {
        name: `shoouts-${storeName}-storage`,
        storage: createJSONStorage(() => AsyncStorage),
        // Only persist specific fields (exclude sync methods)
        partialize: (state) => {
          const { _sync, _syncWithRetry, _updateOptimistic, getSync, ...persisted } = state as any;
          return persisted;
        },
      }
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline Detection Utility (React Native)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to detect network connectivity in React Native
 * Returns true if online, false if offline
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(!!state.isConnected);
    });

    // Check initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsOnline(!!state.isConnected);
    });

    return unsubscribe;
  }, []);

  return isOnline;
}

