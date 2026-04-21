import { auth, db } from '@/firebaseConfig';
import type { UserRole } from '@/store/useUserStore';
import { ROUTES, sanitizeRedirectPath } from '@/utils/routes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const HAS_SEEN_ONBOARDING_KEY = 'shoouts-has-seen-onboarding-v1';
export const PENDING_SIGNUP_KEY = 'pendingSignupPayload';

export type AuthDestination = {
  pathname: string;
  params?: Record<string, string>;
};

type AuthFlowMetadata = {
  entryVersion?: number;
  needsRoleSelection?: boolean;
  selectedExperience?: UserRole | null;
  studioSetupCompletedAt?: string | null;
};

type UserProfileDoc = {
  authFlow?: AuthFlowMetadata;
  creatorIntentRole?: UserRole | null;
  studioSetupCompletedAt?: string | null;
};

export async function getHasSeenOnboarding(): Promise<boolean> {
  return (await AsyncStorage.getItem(HAS_SEEN_ONBOARDING_KEY)) === 'true';
}

export async function setHasSeenOnboarding(hasSeen: boolean): Promise<void> {
  await AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, hasSeen ? 'true' : 'false');
}

export function createPendingAuthFlow() {
  return {
    authFlow: {
      entryVersion: 2,
      needsRoleSelection: true,
      selectedExperience: null,
      studioSetupCompletedAt: null,
    },
  };
}

export async function markUserNeedsRoleSelection(
  uid: string,
  payload: Record<string, unknown>
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      ...payload,
      ...createPendingAuthFlow(),
    },
    { merge: true }
  );
}

export async function markSelectedExperience(uid: string, role: UserRole): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      authFlow: {
        entryVersion: 2,
        needsRoleSelection: false,
        selectedExperience: role,
      },
      creatorIntentRole: role,
    },
    { merge: true }
  );
}

export async function markStudioSetupComplete(uid: string, role: UserRole): Promise<void> {
  const completedAt = new Date().toISOString();
  await setDoc(
    doc(db, 'users', uid),
    {
      authFlow: {
        entryVersion: 2,
        needsRoleSelection: false,
        selectedExperience: role,
        studioSetupCompletedAt: completedAt,
      },
      creatorIntentRole: role,
      studioSetupCompletedAt: completedAt,
    },
    { merge: true }
  );
}

export function getSelectedExperience(userData?: UserProfileDoc | null): UserRole | null {
  if (!userData) return null;
  return (userData.authFlow?.selectedExperience || userData.creatorIntentRole || null) as UserRole | null;
}

export async function resolveUnauthenticatedDestination(): Promise<AuthDestination> {
  const hasSeenOnboarding = await getHasSeenOnboarding();
  return hasSeenOnboarding
    ? { pathname: ROUTES.auth.login }
    : { pathname: ROUTES.auth.onboarding };
}

export async function resolveAuthenticatedDestination(redirectTo?: string): Promise<AuthDestination> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    return resolveUnauthenticatedDestination();
  }

  let snapshot;
  try {
    snapshot = await Promise.race([
      getDoc(doc(db, 'users', uid)),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500))
    ]);
  } catch (error) {
    console.warn('[authFlow] Network timeout or error resolving role', error);
    snapshot = null;
  }

  const userData = snapshot && snapshot.exists() ? (snapshot.data() as UserProfileDoc) : null;
  const authFlow = userData?.authFlow;
  const selectedExperience = getSelectedExperience(userData);
  const needsStudioSetup =
    (selectedExperience === 'studio' || selectedExperience === 'hybrid') &&
    !authFlow?.studioSetupCompletedAt &&
    !userData?.studioSetupCompletedAt;

  if (authFlow?.needsRoleSelection) {
    return { pathname: ROUTES.auth.roleSelection };
  }

  if (needsStudioSetup && selectedExperience) {
    return {
      pathname: ROUTES.auth.studioCreation,
      params: { role: selectedExperience },
    };
  }

  const sanitizedRedirect = sanitizeRedirectPath(redirectTo);
  if (sanitizedRedirect) {
    return { pathname: sanitizedRedirect };
  }

  return { pathname: ROUTES.tabs.home };
}
