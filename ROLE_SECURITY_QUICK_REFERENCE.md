# Role-Based Security Fix: Quick Reference

## What Changed

### Security Vulnerability
- **Before**: `actualRole` persisted to AsyncStorage → users could modify it locally to unlock premium features
- **After**: `actualRole` fetched from Firestore on every app startup → tampering impossible

### Key Changes

| Component | Change | Reason |
|-----------|--------|--------|
| `useAuthStore.ts` | **NEW** | Holds server-verified role data (in-memory only, never persisted) |
| `subscriptionVerification.ts` | **NEW** | Fetches & verifies role from Firestore on app startup |
| `useUserStore.ts` | Updated | Now only persists UI preferences (`viewMode`), not role |
| `useAppSwitcher.ts` | Updated | Uses `useAuthStore` (server role) instead of `useUserStore` for access control |
| `_layout.tsx` | Updated | Calls `fetchVerifiedSubscriptionTier()` when user authenticates |

---

## Required Firestore Schema

Create this document for each user during signup:

```javascript
// Firestore: /users/{uid}/subscription/current
{
  "tier": "vault_free",  // UserRole: vault_free, studio_pro, hybrid_executive, etc.
  "isSubscribed": false,
  "expiresAt": null      // Timestamp when subscription renews
}
```

**Firestore Security Rule**:
```javascript
match /users/{uid}/subscription/{document=**} {
  allow read: if request.auth.uid == uid;
  allow write: if false;  // Backend only
}
```

---

## Verification Flow

```
App Startup
    ↓
onAuthStateChanged (user logged in)
    ↓
fetchVerifiedSubscriptionTier()
    ├─ Fetch /users/{uid}/subscription/current
    ├─ Verify not expired
    └─ Update useAuthStore only (NOT AsyncStorage)
    ↓
useAppSwitcher.switchMode('studio')
    ├─ Check useAuthStore.actualRole (server-verified)
    └─ Grant/deny studio access
```

---

## Code Examples

### Before (Vulnerable)
```typescript
// ❌ VULNERABLE: Role from local storage
const { actualRole } = useUserStore();
if (actualRole.startsWith('studio')) {
  // User could modify AsyncStorage to get here!
}
```

### After (Secure)
```typescript
// ✅ SECURE: Role from server only
const { actualRole } = useAuthStore();
if (actualRole?.startsWith('studio')) {
  // Role was verified from Firestore on app startup
}
```

---

## Implementation Checklist

### Files Already Updated ✅
- [x] `store/useAuthStore.ts` - Created (secure store for role)
- [x] `utils/subscriptionVerification.ts` - Created (fetches verified role)
- [x] `store/useUserStore.ts` - Updated (role removed from persist)
- [x] `hooks/useAppSwitcher.ts` - Updated (uses server role)
- [x] `app/_layout.tsx` - Updated (verifies on startup)

### Next Steps (Your Action)

1. **Update Firestore Schema**
   - Create `/users/{uid}/subscription/current` documents during signup
   - Use Cloud Function or upload tool to backfill existing users

2. **Update All Components Reading Role**
   - Search for `useUserStore().actualRole` → replace with `useAuthStore().actualRole`
   - Search for `useUserStore().isPremium` → may need to compute from `useAuthStore().isSubscribed`

3. **Update Signup/Subscription Logic**
   - When user purchases: write to `users/{uid}/subscription/current` in Firestore
   - Don't rely on client-side role updates

4. **Add Firestore Security Rule**
   - Protect subscription documents from client writes
   - Allow backend (Cloud Functions) to write only

5. **Deploy to Production**
   - Test with real Firestore data
   - Verify studio access properly restricted
   - Monitor console for verification errors

---

## Testing

### Quick Local Test
```typescript
// In any component
import { useAuthStore } from '@/store/useAuthStore';

const { actualRole, isVerifyingRole } = useAuthStore();
console.log('Role:', actualRole); // Should be 'vault_free' for new users
console.log('Verifying:', isVerifyingRole); // Should be false after app startup
```

### Verify Access Control
```typescript
// Try switching to studio without permission
switchMode('studio');
// Should redirect to /settings/subscriptions (not allowed)
```

---

## Common Mistakes to Avoid

❌ **DON'T**: Use `useUserStore().actualRole` for access control  
✅ **DO**: Use `useAuthStore().actualRole`

❌ **DON'T**: Persist role to AsyncStorage  
✅ **DO**: Only persist UI preferences

❌ **DON'T**: Trust client-side role without server verification  
✅ **DO**: Always verify role from Firestore on app startup

---

## Support Files
- `ROLE_VERIFICATION_SECURITY.md` - Detailed implementation guide
- `store/useAuthStore.ts` - Source code for secure store
- `utils/subscriptionVerification.ts` - Source code for verification logic
