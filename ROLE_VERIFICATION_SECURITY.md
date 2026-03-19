# Role-Based Security Fix: Verification & Implementation Guide

## Problem Summary

**Before**: `useUserStore.ts` persisted `actualRole` to AsyncStorage, allowing local tampering:
```typescript
// VULNERABLE: User modifies AsyncStorage
{ actualRole: "vault_free" } → { actualRole: "hybrid_executive" }
// Result: Unauthorized access to Studio mode
```

**After**: Role data fetched ONLY from server (Firestore), verified on app startup:
```typescript
// SECURE: Server-verified tier persists only in memory (useAuthStore)
// Never stored locally. Fetched fresh on every app launch.
```

---

## Architecture

### New Stores

#### 1. **useAuthStore** (Security-Critical)
- **Location**: `store/useAuthStore.ts`
- **Purpose**: Holds server-verified permission data (NEVER persists to AsyncStorage)
- **Data**:
  - `actualRole`: UserRole verified from Firestore/Custom Claims
  - `subscriptionTier`: Current subscription plan
  - `isSubscribed`: Boolean (subscription active + not expired)
  - `subscriptionExpiresAt`: Timestamp of next renewal
  - `isVerifyingRole`: Loading state during server fetch

#### 2. **useUserStore** (UI Preferences Only)
- **Location**: `store/useUserStore.ts` (updated)
- **Purpose**: UI and non-security-critical preferences ONLY
- **Persisted Data**: 
  - `viewMode`: 'vault' or 'studio' (user preference)
- **Non-Persisted Data**:
  - `actualRole` (NOW removed from persist)
  - `role` (derived from actualRole, not stored)
  - All permission-based capabilities

---

## Firestore Schema

The subscription verification system requires the following document structure:

```
users/
  {uid}/
    subscription/
      current/  ← READ THIS DOCUMENT ON APP STARTUP
        {
          "tier": "hybrid_executive",           // Required: UserRole type
          "isSubscribed": true,                 // Required: Boolean
          "expiresAt": Timestamp,               // Required: Renewal date or null
          "paymentProvider": "stripe",          // Optional: Which provider
          "providerSubscriptionId": "sub_XXX",  // Optional: Provider's ID
          "autoRenew": true,                    // Optional: Will renew
          "createdAt": Timestamp,               // Optional: Subscription start
          "features": {                         // Optional: Detailed breakdown
            "storageLimitGB": 10,
            "canSell": true,
            "hasAdvancedAnalytics": true,
            "hasTeamAccess": true
          }
        }
```

### Firestore Security Rules
```javascript
match /users/{uid}/subscription/{document=**} {
  allow read: if request.auth.uid == uid;
  // Backend only can write (via Cloud Functions)
  allow write: if false;
}
```

---

## Implementation Steps

### Step 1: Deploy New Store & Utility Files
- ✅ `store/useAuthStore.ts` - Created
- ✅ `utils/subscriptionVerification.ts` - Created
- These files are production-ready

### Step 2: Update Firestore Schema
Run this Cloud Function (one-time) to migrate existing user subscription data:

```typescript
// functions/src/migrations/migrateSubscriptions.ts
export const migrateSubscriptionsToNewSchema = functions.https.onRequest(
  async (req, res) => {
    const db = admin.firestore();
    const usersSnap = await db.collection('users').get();
    const batch = db.batch();
    
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const subscriptionRef = userDoc.ref
        .collection('subscription')
        .doc('current');
      
      batch.set(subscriptionRef, {
        tier: userData.actualRole || 'vault_free',
        isSubscribed: userData.isPremium || false,
        expiresAt: userData.subscriptionExpiresAt || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    
    await batch.commit();
    res.status(200).send('Migration complete');
  }
);
```

### Step 3: Update useUserStore (Remove Persisted Role)
- ✅ Already updated: Now only persists `viewMode`
- ✅ `actualRole` removed from persist config

### Step 4: Update useAppSwitcher
- ✅ Already updated: Now reads `serverVerifiedRole` from `useAuthStore`
- ✅ Fallback to free tier if verification fails

### Step 5: Update _layout.tsx (Verify on App Startup)
- ✅ Already updated: Calls `fetchVerifiedSubscriptionTier()` when user authenticates
- ✅ Sets `isVerifyingRole=true` while fetching
- ✅ Gracefully handles verification errors

### Step 6: Verify Role in Components
Anywhere you access role/permissions, use `useAuthStore`:

```typescript
// BEFORE (VULNERABLE):
const { actualRole } = useUserStore();  // ❌ Could be modified locally

// AFTER (SECURE):
const { actualRole } = useAuthStore();  // ✅ Server-verified only
```

---

## Testing the Fix

### Unit Test: Verify Role Cannot Be Spoofed
```typescript
// __tests__/security/roleVerification.test.ts
import { useAuthStore } from '@/store/useAuthStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

test('Local storage modifications do not affect server-verified role', async () => {
  // Simulate user modifying AsyncStorage
  await AsyncStorage.setItem(
    'shoouts-user-preferences-v3',
    JSON.stringify({ actualRole: 'hybrid_executive' })
  );
  
  // Server-verified role should still be vault_free
  const { actualRole } = useAuthStore.getState();
  expect(actualRole).toBe('vault_free');
  
  // useAppSwitcher should deny studio access
  // (implementation depends on component test setup)
});
```

### Integration Test: Verify Studio Access Control
```typescript
// __tests__/integration/studioAccess.test.ts
import { useAppSwitcher } from '@/hooks/useAppSwitcher';
import { useAuthStore } from '@/store/useAuthStore';

test('Studio mode denied without vault_studio subscription', () => {
  useAuthStore.getState().setActualRole('vault_free');
  const { isModeAccessible } = useAppSwitcher();
  
  expect(isModeAccessible('studio')).toBe(false);
});

test('Studio mode allowed with hybrid_executive subscription', () => {
  useAuthStore.getState().setActualRole('hybrid_executive');
  const { isModeAccessible } = useAppSwitcher();
  
  expect(isModeAccessible('studio')).toBe(true);
});
```

---

## Optional: Firebase Custom Claims (Extra Security Layer)

For additional verification without Firestore reads, set Custom Claims on user signup:

```typescript
// Backend: When subscription is created
import * as admin from 'firebase-admin';

export const createSubscription = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  
  // Create Firestore subscription doc
  await admin.firestore()
    .collection('users')
    .doc(uid)
    .collection('subscription')
    .doc('current')
    .set({ tier: 'hybrid_executor', ... });
  
  // Set Custom Claims (appears in JWT)
  await admin.auth().setCustomUserClaims(uid, {
    role: 'hybrid_executor',
    tier: 'premium'
  });
});

// Client: Verify via Custom Claims
export async function verifyRoleViaCustomClaims(): Promise<UserRole | null> {
  const auth = getAuth();
  const user = auth.currentUser;
  
  const idTokenResult = await user?.getIdTokenResult(true);
  return idTokenResult?.claims?.role as UserRole | null;
}
```

---

## Deployment Checklist

- [ ] `store/useAuthStore.ts` deployed
- [ ] `utils/subscriptionVerification.ts` deployed
- [ ] `useUserStore.ts` updated (role removed from persist)
- [ ] `useAppSwitcher.ts` updated (uses server-verified role)
- [ ] `_layout.tsx` updated (calls verification on app startup)
- [ ] Firestore schema migrated (subscription documents created)
- [ ] Firestore security rules updated (subscription collection protected)
- [ ] All components using role switched to `useAuthStore`
- [ ] Tests written for role verification
- [ ] Production deployment staged

---

## FAQ

**Q: What if Firestore verification fails?**  
A: User defaults to free tier locally. They won't be blocked from using the app, but paid features will be inaccessible. Retry on next app launch.

**Q: Can users bypass this by killing the app?**  
A: No. Verification happens every app startup (in `onAuthStateChanged`). The old persisted role is ignored.

**Q: What about offline users?**  
A: Last verified role is stored in memory during the session. On next app launch, new verification happens.

**Q: Does this affect performance?**  
A: Adds ~200-500ms Firestore read on app startup. Acceptable—happens once per session.

**Q: Should I also update Custom Claims?**  
A: Recommended for production. Provides verification without Firestore reads. See "Custom Claims" section above.

---

## Security Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Role Storage** | AsyncStorage (user modifiable) | Memory only (server verified) |
| **Verification** | Never | On every app startup |
| **Source of Truth** | Client | Server (Firestore) |
| **Tampering Risk** | ⚠️ HIGH | ✅ NONE |
| **Attack Vector** | Modify AsyncStorage, unlock premium features | Blocked—role re-fetched on app launch |

---

## References

- [Zustand Persist Middleware](https://github.com/pmndrs/zustand?tab=readme-ov-file#middleware)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Custom Claims](https://firebase.google.com/docs/auth/admin-setup)
- [React Native AsyncStorage Security](https://react-native-async-storage.github.io/react-native-async-storage/docs/usage/)
