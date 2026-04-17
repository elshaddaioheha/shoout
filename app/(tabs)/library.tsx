import ShooutsFavouritesScreen from '@/components/library/ShooutFavouritesScreen';
import HybridLibraryScreen from '@/components/library/HybridLibraryScreen';
import StudioCreatorScreen from '@/components/library/StudioCreatorScreen';
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
  const isHybridUser = activeRole?.startsWith('hybrid');
  const isStudioUser = user.activeAppMode === 'studio' || activeRole?.startsWith('studio');
  const isCreatorSurface = isStudioUser || isHybridUser;

  if (isHybridUser) {
    return <HybridLibraryScreen />;
  }

  if (isCreatorSurface) {
    return <StudioCreatorScreen />;
  }

  return <ShooutsFavouritesScreen />;
}
