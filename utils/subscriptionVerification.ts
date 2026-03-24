import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, Timestamp } from 'firebase/firestore';
import type { UserRole } from '@/store/useUserStore';
import { useAuthStore } from '@/store/useAuthStore';

type SubscriptionPlan = {
  tier: UserRole;
  isSubscribed: boolean;
  expiresAt: Timestamp | null;
};

/**
 * Fetches the server-verified subscription tier from Firestore
 * 
 * This is the ONLY source of truth for a user's permissions.
 * Called on app startup to populate useAuthStore with verified data.
 * 
 * @throws Error if user is not authenticated or fetch fails
 */
export async function fetchVerifiedSubscriptionTier(): Promise<UserRole> {
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    // Fetch from users/{uid}/subscription document
    const subscriptionRef = doc(db, 'users', user.uid, 'subscription', 'current');
    const subscriptionSnap = await getDoc(subscriptionRef);

    if (!subscriptionSnap.exists()) {
      // New user without subscription record — default to vault trial tier
      console.warn('No subscription document found for user, defaulting to vault');
      updateAuthStore('vault', {
        tier: 'vault',
        isSubscribed: false,
        expiresAt: null,
      });
      return 'vault';
    }

    const subscriptionData = subscriptionSnap.data() as SubscriptionPlan;
    const tier = subscriptionData.tier || 'vault';
    const isSubscribed = subscriptionData.isSubscribed ?? false;
    const expiresAt = subscriptionData.expiresAt
      ? (subscriptionData.expiresAt as Timestamp).toMillis()
      : null;

    // Check if subscription has expired
    if (isSubscribed && expiresAt && Date.now() > expiresAt) {
      console.warn('User subscription has expired, downgrading to vault');
      updateAuthStore('vault', {
        tier: 'vault',
        isSubscribed: false,
        expiresAt: null,
      });
      return 'vault';
    }

    // Update store with verified subscription data
    updateAuthStore(tier, {
      tier,
      isSubscribed,
      expiresAt: subscriptionData.expiresAt,
    });

    return tier;
  } catch (error) {
    console.error('Failed to fetch subscription tier:', error);
    const err = error instanceof Error ? error : new Error('Unknown error fetching subscription');
    useAuthStore.getState().setVerificationError(err);
    throw err;
  }
}

/**
 * Helper to update the auth store with subscription data
 */
function updateAuthStore(tier: UserRole, subscriptionData: SubscriptionPlan) {
  useAuthStore.getState().setActualRole(tier);
  useAuthStore.getState().setSubscriptionData({
    tier: subscriptionData.tier,
    isSubscribed: subscriptionData.isSubscribed,
    expiresAt: subscriptionData.expiresAt ? (subscriptionData.expiresAt as Timestamp).toMillis() : null,
  });
  useAuthStore.getState().setVerifying(false);
  useAuthStore.getState().setVerificationError(null);
}

/**
 * Optional: Verify against Firebase Custom Claims (for extra security)
 * 
 * If using Custom Claims in Firebase Auth, this provides an additional
 * verification layer without needing a Firestore read.
 */
export async function verifyRoleViaCustomClaims(): Promise<UserRole | null> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  try {
    // Force token refresh to get latest custom claims
    const idTokenResult = await user.getIdTokenResult(true);
    const customClaims = idTokenResult.claims;

    if (customClaims?.role) {
      return customClaims.role as UserRole;
    }

    return null;
  } catch (error) {
    console.error('Failed to verify custom claims:', error);
    return null;
  }
}
