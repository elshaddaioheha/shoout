import { create } from 'zustand';
import type { UserRole } from './useUserStore';

/**
 * useAuthStore - SECURITY-CRITICAL DATA
 * 
 * This store holds permission and subscription data that comes from the server ONLY.
 * It does NOT persist to AsyncStorage to prevent local tampering.
 * 
 * The actualRole is set only via server verification (Firestore or Custom Claims)
 * and should be re-verified on app startup.
 */

interface AuthState {
  // Server-verified role (never persisted locally)
  actualRole: UserRole | null;

  // Bootstrap state for app entry routing
  isAuthResolved: boolean;
  hasAuthenticatedUser: boolean;
  
  // Subscription details fetched from Firestore
  subscriptionTier: string | null;
  isSubscribed: boolean;
  subscriptionExpiresAt: number | null;
  
  // Loading state during server verification
  isVerifyingRole: boolean;
  verificationError: Error | null;
  
  // Methods
  setActualRole: (role: UserRole) => void;
  setSubscriptionData: (data: {
    tier: string;
    isSubscribed: boolean;
    expiresAt: number | null;
  }) => void;
  setAuthResolved: (isResolved: boolean) => void;
  setHasAuthenticatedUser: (hasUser: boolean) => void;
  setVerifying: (isVerifying: boolean) => void;
  setVerificationError: (error: Error | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  actualRole: null,
  isAuthResolved: false,
  hasAuthenticatedUser: false,
  subscriptionTier: null,
  isSubscribed: false,
  subscriptionExpiresAt: null,
  isVerifyingRole: true,
  verificationError: null,

  setActualRole: (actualRole) => set({ actualRole }),
  
  setSubscriptionData: ({ tier, isSubscribed, expiresAt }) =>
    set({
      subscriptionTier: tier,
      isSubscribed,
      subscriptionExpiresAt: expiresAt,
    }),

  setAuthResolved: (isAuthResolved) => set({ isAuthResolved }),

  setHasAuthenticatedUser: (hasAuthenticatedUser) => set({ hasAuthenticatedUser }),

  setVerifying: (isVerifyingRole) => set({ isVerifyingRole }),
  
  setVerificationError: (verificationError) => set({ verificationError }),

  reset: () =>
    set({
      actualRole: null,
      hasAuthenticatedUser: false,
      subscriptionTier: null,
      isSubscribed: false,
      subscriptionExpiresAt: null,
      isVerifyingRole: false,
      verificationError: null,
    }),
}));
