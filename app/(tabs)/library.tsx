import ShooutsFavouritesScreen from '@/components/library/ShooutFavouritesScreen';
import VaultHomeScreen from '@/components/vault/VaultHomeScreen';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import React from 'react';

/**
 * Library Page - Unified library view for all user modes
 * Routes users to appropriate library component based on their role
 */
export default function LibraryScreen() {
  const user = useUserStore((s) => s);
  const authState = useAuthStore((s) => s);

  const activeRole = authState.actualRole || user.actualRole || user.role;
  const isVaultSurface = user.activeAppMode === 'hybrid'
    || user.activeAppMode === 'vault'
    || user.activeAppMode === 'vault_pro'
    || activeRole?.startsWith('hybrid')
    || activeRole?.startsWith('vault');

  if (isVaultSurface) {
    return <VaultHomeScreen />;
  }

  return <ShooutsFavouritesScreen />;
}
