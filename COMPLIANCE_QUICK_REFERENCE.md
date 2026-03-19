# Compliance & Creator Economy Quick Reference

## Environment Setup

### 1. Create Firebase Projects

**Development Project:**
```bash
firebase projects create "shoouts-dev" --set-as-default
firebase init firestore
firebase init storage
firebase init functions
```

**Production Project:**
```bash
firebase projects create "shoouts-prod"
```

### 2. Set Default Projects

**.firebaserc (version control):**
```json
{
  "projects": {
    "dev": "shoouts-dev-12345",
    "prod": "shoouts-prod-67890"
  },
  "default": "dev"
}
```

### 3. Environment Variables

**Create in GitHub Actions Secrets** (NOT local .env):

```
STRIPE_SECRET_KEY_DEV         # Stripe test key
STRIPE_SECRET_KEY_PROD        # Stripe live key

STRIPE_WEBHOOK_SECRET_DEV
STRIPE_WEBHOOK_SECRET_PROD

FLUTTERWAVE_SECRET_HASH_DEV
FLUTTERWAVE_SECRET_HASH_PROD

MUX_TOKEN_ID_DEV
MUX_TOKEN_SECRET_DEV
MUX_TOKEN_ID_PROD
MUX_TOKEN_SECRET_PROD

FIREBASE_CONFIG_DEV           # Firebase web config JSON
FIREBASE_CONFIG_PROD

EAS_TOKEN                      # Expo EAS build token
APPLE_ID, APPLE_PASSWORD       # App Store credentials

SLACK_WEBHOOK_DEV, SLACK_WEBHOOK_PROD  # For CI/CD notifications
```

---

## Stripe Connect Setup

### 1. Create Stripe Account

Visit: https://stripe.com
- Sign up as "Platform" (multi-vendor)
- Enable Connect in settings
- Get Stripe Secret Key

### 2. Test Your Connect Flow

**Local Development:**
```bash
# In app code:
const result = await httpsCallable(functions, 'setupStripeConnect')({
  country: 'NG'
});

// Redirect user to onboardingUrl
window.location.href = result.data.onboardingUrl;
```

### 3. Webhook Configuration

**In Stripe Dashboard:**
- Go to Developers → Webhooks
- Add endpoint:
  - URL: `https://us-central1-shoouts-prod.cloudfunctions.net/stripeWebhook`
  - Events: `account.updated`, `payout.paid`
  - Signing secret: Copy and store in GitHub Secrets

---

## Content Moderation System

### User Reporting (In-App)

```typescript
// components/TrackCard.tsx
<TouchableOpacity onPress={() => shareMenu.show()}>
  <MaterialIcons name="more-vert" size={24} />
</TouchableOpacity>

// Share menu shows:
// - Share
// - Add to Playlist
// - Report Track ← Users click here
```

### Report Reasons
- **Copyright Infringement** - Ripped from existing song
- **Offensive Content** - Hate speech, violence
- **Spam** - Irrelevant, low-quality, promotional

### Admin Dashboard Access

**Set Firebase Custom Claims (backend only):**
```typescript
// Cloud Function: adminSetRole
await admin.auth().setCustomUserClaims(adminUserId, { admin: true });
```

**Admin Dashboard URL:**
```
https://admin.shoouts.app

Login required → Firebase Auth
Checks: customClaims.admin == true
Access denied if not admin
```

### Admin Workflow

1. **Login** → https://admin.shoouts.app
2. **See moderation queue** (sorted by date)
3. **Play preview** of flagged track
4. **Decision:**
   - ✅ **UPHOLD**: Track deleted, creator suspended 30 days
   - ❌ **DISMISS**: Report closed, creator notified

### Outcomes if Report Upheld

```
Track: isActive = false  (soft-deleted)
Creator: suspended 30 days, can't upload/withdraw
Buyers: Refund issued ($amount returned)
```

---

## GitHub Actions CI/CD

### Trigger Events

**Development (dev branch):**
```
On: push to dev
Runs: lint, test, security
Deploys: Dev Firebase + EAS preview
```

**Production (main branch):**
```
On: push to main
Runs: lint, test, security
Requires approval (GitHub environments)
Deploys: Prod Firebase + EAS production + App Store
```

### Safety Checks

**Prevents accidental production pushes:**

1. **Project Verification:**
   ```bash
   firebase use
   # Echo output: must contain 'prod'
   # If not: FAIL and exit
   ```

2. **Secrets Validation:**
   - EAS token required
   - Stripe live key required (contains `sk_live_`)

3. **Slack Notifications:**
   - Dev deploy status
   - Prod deploy status + health check

### Manual Deploy (if CI/CD fails)

```bash
# Deploy dev
firebase deploy --only functions,firestore,storage --project dev

# Deploy prod (WARNING: requires main branch)
firebase deploy --only functions,firestore,storage --project prod
```

---

## Payout Reconciliation

### Manual Payout Check

**Query Firestore:**
```typescript
// Check pending payouts
db.collectionGroup('payouts')
  .where('status', '==', 'pending')
  .orderBy('createdAt', 'desc')
  .get()

// Check daily reconciliation logs
db.collection('payoutLedger')
  .where('createdAt', '>=', thirtyDaysAgo)
  .orderBy('createdAt', 'desc')
  .get()
```

### Handling Failed Transfers

**If Stripe transfer fails:**
1. Webhook doesn't fire → payout stays 'pending'
2. `reconcilePayouts()` job (daily 2am UTC) checks status
3. If transfer failed in Stripe, mark payout 'failed'
4. Creator notified: "Payout failed, may be KYC issue"

### Debug Command

```bash
# Check specific creator's payouts
gcloud firestore documents get users/creatorId/payouts

# Check Stripe transfer status  in Stripe Dashboard
# Developers → Activity → Transfers
```

---

## Offline Download Management

### Device Storage Limits

**iOS:**
- Cached directory: ~1GB typical
- System clears when device storage low (<1GB free)
- User can manually delete via Settings

**Best Practice:**
- Warn user when offline library > 500MB
- Show "Delete oldest downloaded" option

### Check Offline Storage Size

```typescript
const { getOfflineStorageSize } = useOfflineDownload();
const sizeMB = (await getOfflineStorageSize()) / (1024 * 1024);
console.log(`Offline library: ${sizeMB.toFixed(1)} MB`);
```

### Auto-Cleanup (if space needed)

```typescript
// If device storage < 1GB, delete oldest offline tracks
async function autoCleanupOldest() {
  const tracks = await getOfflineLibrary();
  const oldest = tracks.sort((a, b) => a.downloadedAt - b.downloadedAt)[0];
  if (oldest) {
    await deleteOfflineTrack(oldest.trackId);
  }
}
```

---

## Firestore Collections Reference

### New/Updated Collections

```
contentReports/
  ├─ uploaderId
  ├─ trackId
  ├─ trackTitle
  ├─ trackArtist
  ├─ reporterId
  ├─ reason: 'copyright' | 'offensive' | 'spam'
  ├─ description
  ├─ status: 'submitted' | 'reviewed'
  ├─ decision: 'upheld' | 'dismissed'
  ├─ createdAt
  └─ reviewedAt

users/{uid}/payouts/
  ├─ transactionId
  ├─ creatorId
  ├─ buyerId
  ├─ amountUsd
  ├─ creatorAmountUsd (90%)
  ├─ shooutsAmountUsd (10%)
  ├─ transferId
  ├─ status: 'pending' | 'settled' | 'failed'
  └─ createdAt

payoutLedger/
  ├─ Same fields as payouts
  ├─ recordType: 'stripe_transfer'
  └─ Permanent audit trail

users/{uid}
  ├─ stripeAccountId
  ├─ kycStatus: 'pending' | 'verified' | 'rejected'
  ├─ stripeChargesEnabled
  ├─ stripePayoutsEnabled
  ├─ suspensionReason (if suspended)
  ├─ suspendedAt
  ├─ suspendedUntil
  ├─ canUpload: boolean
  └─ canWithdraw: boolean

moderationLog/
  ├─ action: 'content_removed' | 'creator_suspended'
  ├─ targetUserId
  ├─ reason
  ├─ adminId
  └─ timestamp
```

---

## Compliance Checklist

### Before First Creator Upload
- [ ] Firestore rules: payouts read-only
- [ ] Firestore rules: contentReports read-only
- [ ] Admin role: Custom Claims enforcement
- [ ] KYC: Stripe Connect tested
- [ ] Terms of Service: Created + linked in app
- [ ] Privacy Policy: Created + compliant

### Before Production Launch
- [ ] Stripe Connect: Production account created
- [ ] Webhook: Secret in GitHub Actions secrets
- [ ] GitHub Actions: CI/CD pipeline tested
- [ ] Admin Dashboard: Deployed
- [ ] Moderation system: Tested (flag → review → uphold)
- [ ] Refund system: Tested
- [ ] Offline downloads: Data not exposed on device

### After Launch (Monitoring)
- [ ] Daily: Check moderation queue
- [ ] Weekly: Review payout reconciliation
- [ ] Monthly: Check KYC verification rates
- [ ] Monthly: Audit contentReports, removals
- [ ] Quarterly: Tax compliance review

---

## Troubleshooting

### "KYC verification stuck on pending"

**Check:**
1. Is creator in Stripe Dashboard? (account.id populated?)
2. Did Stripe webhook fire? (check Cloud Function logs)
3. Is stripeWebhook function deployed? (`firebase functions:list`)

**Fix:**
```bash
# Manually trigger webhook in Stripe test CLI
stripe webhooks trigger account.updated
```

### "Payout stuck as pending"

**Check:**
1. Is transfer actually in Stripe? (Developers → Activity)
2. Did reconcilePayouts() run? (Check logs)

**Fix:**
```bash
# Force reconciliation
gcloud functions call reconcilePayouts --region us-central1
```

### "Admin can't see moderation queue"

**Check:**
1. Is user in Firebase Auth?  
2. Custom Claims set? `admin: true` in Firebase user token
3. Admin Dashboard pointing to correct Firebase project?

**Fix:**
```bash
# Set custom claim
firebase auth:import users.json
# Then use above command to setCustomUserClaims
```

---

**Last Updated:** March 2026
