import ShooutFavouritesScreen from '@/components/library/ShooutFavouritesScreen';
import HybridLibraryScreen from '@/components/library/HybridLibraryScreen';
import StudioCreatorScreen from '@/components/library/StudioCreatorScreen';
import VaultHomeScreen from '@/components/vault/VaultHomeScreen';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import React from 'react';

export default function LibraryScreen() {
  const user = useUserStore((s) => s);
  const authState = useAuthStore((s) => s);

  const activeRole = authState.actualRole || user.actualRole || user.role;
  const isVaultSurface = user.activeAppMode === 'vault' || user.activeAppMode === 'vault_pro';
  const isHybridUser = activeRole?.startsWith('hybrid');
  const isStudioUser = user.activeAppMode === 'studio' || activeRole?.startsWith('studio');
  const isCreatorSurface = isStudioUser || isHybridUser;

  if (isVaultSurface) {
    return <VaultHomeScreen />;
  }

  if (isHybridUser) {
    return <HybridLibraryScreen />;
  }

  if (isCreatorSurface) {
    return <StudioCreatorScreen />;
  }

  return <ShooutFavouritesScreen />;
}
