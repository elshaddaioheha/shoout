# Shoouts: Creator Economy & Compliance Infrastructure

## Table of Contents

1. [Stripe Connect Payouts](#stripe-connect-payouts)
2. [KYC & Tax Compliance](#kyc--tax-compliance)
3. [Multi-Environment Separation](#multi-environment-separation)
4. [Offline Download Support](#offline-download-support)
5. [Content Moderation & DMCA](#content-moderation--dmca)
6. [Compliance Checklist](#compliance-checklist)

---

## Stripe Connect Payouts

### Architecture: Immediate Payout Splits

**Problem (Old Model):**
- Shoouts holds all funds → manually pays creators weekly
- Exposes Shoouts as a "money transmitter" → requires licensing
- Chargeback risk: if buyer disputes, Shoouts absorbs loss
- Tax liability: Shoouts must collect tax documents from 10,000+ creators

**Solution (Stripe Connect):**
- Payment splits automatically at purchase time
- 90% → creator's Stripe account
- 10% → Shoouts platform account
- Stripe handles KYC, chargebacks, tax forms

### Payment Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Creator signs up → connectStripeAccount()          │
│    - Redirected to Stripe Connect onboarding          │
│    - Provides: ID, bank account, tax info            │
│    - stripeAccountId stored in Firestore              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Buyer purchases track ($10)                         │
│    - Flutterwave processes payment                     │
│    - sends webhook to flutterwaveWebhook()            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. flutterwaveWebhook() verifies payment               │
│    - Calls createConnectPayment(buyerId, creatorId, $10) │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. createConnectPayment():                              │
│    a. Fetch creator's stripeAccountId from Firestore  │
│    b. Verify creator's KYC status = 'verified'        │
│    c. Create Stripe transfer:                         │
│       - $9 → creator's Stripe account                 │
│       - $1 → Shoouts' bank account                    │
│    d. Create immutable ledger entries:                │
│       - users/{creatorId}/payouts/{id}                │
│       - payoutLedger/{id} (global)                    │
│    e. Return immediately                              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Stripe webhook (async, background):                 │
│    - Confirms transfer succeeded                       │
│    - Updates payout status: pending → settled         │
│    - Creator receives funds in bank within 1-2 days   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Creator views earnings in app:                      │
│    - Calls getCreatorPayoutStatus()                    │
│    - Sees: $9 pending, history of payouts             │
│    - Can view linked Stripe account status            │
└─────────────────────────────────────────────────────────┘
```

### Firestore Structure

```typescript
users/{uid}
  - stripeAccountId: string         // Stripe Connect account
  - kycStatus: 'pending|verified|rejected'
  - stripeChargesEnabled: boolean
  - stripePayoutsEnabled: boolean
  - stripeVerifiedAt: timestamp

users/{uid}/payouts
  ├─ transactionId: string
  ├─ creatorId: string
  ├─ buyerId: string
  ├─ amountUsd: number
  ├─ creatorAmountUsd: number (90%)
  ├─ shooutsAmountUsd: number (10%)
  ├─ transferId: string           // Stripe transfer ID
  ├─ status: 'pending|settled|failed'
  └─ createdAt: timestamp

payoutLedger (global audit trail)
  ├─ transactionId, creatorId, buyerId, amounts
  ├─ status: 'pending|settled|failed'
  ├─ recordType: 'stripe_transfer'
  └─ createdAt: timestamp
```

### Code Reference

**Setup Creator Account:**
```typescript
const result = await httpsCallable(functions, 'setupStripeConnect')({
  country: 'NG',
  returnUrl: 'https://shoouts.app/studio/payout-setup?success=true',
  refreshUrl: 'https://shoouts.app/studio/payout-setup?refresh=true',
});

// Returns: { onboardingUrl, stripeAccountId, kycStatus: 'pending' }
// Redirect user to onboardingUrl to complete identity verification
```

**Check Payout Status:**
```typescript
const status = await httpsCallable(functions, 'getCreatorPayoutStatus')();
// Returns: {
//   kycStatus: 'verified|pending|rejected',
//   stripeAccountId: 'acct_...',
//   payoutsEnabled: true,
//   totalSettled: $150.50,
//   totalPending: $45.00,
//   payouts: [...]
// }
```

### Webhook: Stripe Account Updates

**When KYC verification completes:**
```
Stripe sends: account.updated event
→ stripeWebhook() receives event
→ Checks: charges_enabled, payouts_enabled
→ Updates user doc: kycStatus = 'verified'
→ Creator can now receive payouts
```

**When payout is paid:**
```
Stripe sends: payout.paid event
→ stripeWebhook() processes event
→ Updates payout doc: status = 'settled'
→ Creator sees funds in bank account
```

### Security Model

✅ **Shoouts doesn't hold funds**
- Funds transferred directly to creator's account at purchase time
- No "platform wallet" to track, no chargebacks on Shoouts

✅ **No money transmitter license needed**
- Stripe's licensed money transmitter, not Shoouts
- Shoouts only receives 10% commission to own account

✅ **Tax compliance automated**
- Stripe issues 1099 forms to creators (US market)
- Shoouts tracks revenue for its own filings
- Creators responsible for their own tax obligations

✅ **Fraud prevention**
- Stripe verifies creator identity before enabling payouts
- Stripe handles chargebacks (creator liable, not Shoouts)

---

## KYC & Tax Compliance

### What is KYC?

**Know Your Customer (KYC)** = Stripe verifying:
1. **Identity** - Legal name, date of birth, address
2. **Bank Account** - Ownership proof, routing number
3. **Tax Info** - SSN (US) or equivalent (for 1099 forms)

### Shoouts' KYC Flow

**Step 1: Creator Initiates Setup**
```
Studio Tab → Settings → Payouts → "Connect Stripe Account"
↓
Calls: setupStripeConnect()
```

**Step 2: Stripe Onboarding (Hosted)**
```
setupStripeConnect() returns: onboardingUrl
↓
Creator redirected to Stripe's secure form
↓ (Creator fills out their info, Stripe verifies)
↓
Stripe confirms verification → sends account.updated webhook
↓
Creator automatically redirected back to app
```

**Step 3: Shoouts Receives Confirmation**
```
stripeWebhook() processes account.updated
↓
Checks: charges_enabled && payoutsEnabled
↓
Updates user doc: kycStatus = 'verified'
↓
Creator sees in app: "Ready to receive payouts!"
```

### Handling KYC Rejection

**If Stripe rejects creator's info:**
```
account.updated event:
  requirements.disabled_reason = 'under_review' | 'pending_verification' | 'rejected'

↓
stripeWebhook() updates: kycStatus = 'rejected'
↓
Creator sees: "KYC verification failed"
↓
In-app message: "Please resubmit updated information"
↓
Creator clicks "Retry" → Re-opens Stripe onboarding form
```

### Tax Compliance: 1099 Forms

**For US-based creators (SSN provided):**
- Stripe automatically issues Form 1099-K if earnings ≥ $20,000 in year
- Sent to creator and IRS by January 31
- Creators responsible for filing taxes

**For international creators:**
- Tax forms depend on creator's country
- Shoouts recommends: "Consult your tax advisor"
- Stripe handles all required reporting

### Audit Trail: Immutable Ledger

**payoutLedger collection (permanent record):**
```
{
  transactionId: 'tx_001',
  creatorId: 'creator_1',
  buyerId: 'buyer_1',
  amountUsd: 10,
  creatorAmountUsd: 9,
  shooutsAmountUsd: 1,
  transferId: 'tr_stripe_123',
  status: 'settled',
  recordType: 'stripe_transfer',
  createdAt: 2026-03-19T10:30:00Z
}
```

- **Append-only** - Never deleted or modified
- **Tax audit ready** - Shows Shoouts' 10% commission per transaction
- **Global reconciliation** - Can sum by month/year for revenue reports

---

## Multi-Environment Separation

### Problem: Development Data in Production

**Scenario:**
```
Developer runs: seed-dev.mjs in shell
↓ accidentally points to PRODUCTION Firebase
↓
Production database flooded with 1,000 test users
↓
Real users affected: transactions corrupted, payouts lost
↓ 💥 Disaster
```

### Solution: Separate Firebase Projects

**Create two Firebase projects:**

```
shoouts-dev
  ├─ Firebase config (DEV API key)
  ├─ Firestore database (test data)
  ├─ Cloud Storage (test audio files)
  ├─ Cloud Functions (dev endpoints)
  └─ Stripe account (sandbox/test mode)

shoouts-prod
  ├─ Firebase config (PROD API key)
  ├─ Firestore database (real data)
  ├─ Cloud Storage (real audio files)
  ├─ Cloud Functions (production endpoints)
  └─ Stripe account (live mode)
```

### Setup Steps

**1. Create second Firebase project:**
```bash
# In Firebase Console:
Create project → "shoouts-prod"
Set up Firestore
Enable Authentication
Create Cloud Storage bucket
Enable Cloud Functions
```

**2. Download both configs:**
```bash
# DEV config
firebase use dev
firebase init  # Creates .firebaserc

# PROD config
firebase use prod
```

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

**3. Separate environment configs:**

**firebaseConfig.ts (versioncontrol, non-sensitive):**
```typescript
const firebaseConfigs = {
  dev: {
    projectId: "shoouts-dev-12345",
    apiKey: "AIzaSyDEV...",  // OK to commit (API key restricted in Console)
    appId: "1:123:web:...",
  },
  prod: {
    projectId: "shoouts-prod-67890",
    apiKey: "AIzaSyPROD...",
    appId: "1:456:web:...",
  },
};

export function getFirebaseConfig() {
  const env = process.env.REACT_APP_ENV || 'dev';
  return firebaseConfigs[env];
}
```

**functions/.env.dev and functions/.env.prod (NOT in git):**
```bash
# .env.dev
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
FLUTTERWAVE_SECRET_HASH=test_...
FIREBASE_PROJECT_ID=shoouts-dev-12345

# .env.prod
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
FLUTTERWAVE_SECRET_HASH=prod_...
FIREBASE_PROJECT_ID=shoouts-prod-67890
```

**4. Update package.json dev scripts:**
```json
{
  "scripts": {
    "dev:web": "REACT_APP_ENV=dev expo web",
    "dev:ios": "REACT_APP_ENV=dev eas build --platform ios --profile development",
    "dev:test": "NODE_ENV=test jest",
    "dev:seed": "NODE_ENV=dev node scripts/seed-dev.mjs",
    "prod:build": "REACT_APP_ENV=prod eas build --platform ios --profile production",
    "prod:deploy:functions": "firebase deploy --only functions --project prod",
    "prod:deploy:rules": "firebase deploy --only firestore --project prod"
  }
}
```

**5. Update seed script (safe):**
```typescript
// seed-dev.mjs
const firebaseApp = initializeApp(firebaseConfigs.dev);
const db = getFirestore(firebaseApp);

console.log("⚠️ SEEDING DEV ONLY");
console.log("Project:", firebaseApp.options.projectId);
if (!firebaseApp.options.projectId.includes('dev')) {
  throw new Error("🚨 SAFETY CHECK FAILED: Not pointing to dev project!");
}
```

**6. GitHub Actions: Prevent accidental prod changes:**

See **GitHub Actions CI/CD** section below.

---

## Offline Download Support

### Problem: No Offline Listening

**Scenario:**
```
User on airplane:
  - Downloaded track isn't available offline
  - App only streams from Cloud Storage
  - User gets: "No network connection" error
  - Bad experience → negative review
```

### Solution: Download for Offline Listening

**Architecture:**
```
1. User clicks "Download" on purchased track
   ↓
2. App calls: downloadTrackForOffline(trackId)
   ↓
3. Cloud Function generates 15-minute signed URL
   ↓
4. expo-file-system downloads to device's app directory:
   /Library/Caches/shoouts-downloads/{trackId}.m3u8
   /Library/Caches/shoouts-downloads/segments/{trackId}-000.ts
   ...
   ↓
5. usePlaybackStore updates:
   {
     trackId: 'beat_123',
     localUri: 'file:///Library/Caches/.../beat_123.m3u8',
     isOffline: true
   }
   ↓
6. Audio player checks usePlaybackStore first:
   if (track.localUri) play(track.localUri)
   else play(track.streamUrl)
```

### Implementation

**Hook: useOfflineDownload.ts (NEW)**
```typescript
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

interface OfflineTrack {
  trackId: string;
  title: string;
  artist: string;
  localUri: string;
  downloadedAt: number;
  fileSize: number;
  isComplete: boolean;
}

export function useOfflineDownload() {
  const [offlineTracks, setOfflineTracks] = useState<OfflineTrack[]>([]);

  // Get list of downloaded tracks
  async function getOfflineLibrary(): Promise<OfflineTrack[]> {
    const downloadDir = `${FileSystem.cacheDirectory}shoouts-downloads/`;
    
    try {
      const tracks = await FileSystem.readDirectoryAsync(downloadDir);
      // Parse metadata for each track
      return tracks.map(trackId => ({
        trackId,
        localUri: `${downloadDir}${trackId}/manifest.m3u8`,
        downloadedAt: Date.now(),
        // ... more metadata
      }));
    } catch (error) {
      // Directory doesn't exist yet
      return [];
    }
  }

  // Download track for offline
  async function downloadTrackForOffline(trackId: string, title: string) {
    try {
      // 1. Get signed URL from Cloud Function
      const result = await httpsCallable(functions, 'getStreamingUrl')({
        trackId,
        uploaderId: track.uploaderId,
        isLibraryAccess: true
      });

      const signedUrlM3u8 = result.data.url; // 15-minute expiry

      // 2. Create app-specific download directory
      const trackDir = `${FileSystem.cacheDirectory}shoouts-downloads/${trackId}/`;
      await FileSystem.makeDirectoryAsync(trackDir, { intermediates: true });

      // 3. Download HLS manifest
      const manifestPath = `${trackDir}manifest.m3u8`;
      await FileSystem.downloadAsync(signedUrlM3u8, manifestPath);

      // 4. Parse M3U8 file to extract segment URLs
      const manifestContent = await FileSystem.readAsStringAsync(manifestPath);
      const segmentUrls = parseM3u8Segments(manifestContent);

      // 5. Download all segments in parallel (with throttle)
      for (const [index, segmentUrl] of segmentUrls.entries()) {
        const segmentPath = `${trackDir}segment-${String(index).padStart(3, '0')}.ts`;
        
        try {
          await FileSystem.downloadAsync(segmentUrl, segmentPath);
          // Update progress: (index + 1) / segmentUrls.length
        } catch (error) {
          console.error(`Failed to download segment ${index}`);
          throw error;
        }
      }

      // 6. Save metadata (for offline library display)
      const metadata: OfflineTrack = {
        trackId,
        title,
        artist: track.artist,
        localUri: manifestPath,
        downloadedAt: Date.now(),
        fileSize: await getDirectorySize(trackDir),
        isComplete: true
      };

      // Store in local device storage (not Firestore)
      await AsyncStorage.setItem(`offline_${trackId}`, JSON.stringify(metadata));

      setOfflineTracks([...offlineTracks, metadata]);
    } catch (error) {
      console.error('Failed to download offline:', error);
      throw error;
    }
  }

  // Delete offline track to free space
  async function deleteOfflineTrack(trackId: string) {
    const trackDir = `${FileSystem.cacheDirectory}shoouts-downloads/${trackId}/`;
    
    try {
      await FileSystem.deleteAsync(trackDir);
      await AsyncStorage.removeItem(`offline_${trackId}`);
      
      setOfflineTracks(offlineTracks.filter(t => t.trackId !== trackId));
    } catch (error) {
      console.error('Failed to delete offline track:', error);
    }
  }

  // Get total offline storage size
  async function getOfflineStorageSize(): Promise<number> {
    const downloadDir = `${FileSystem.cacheDirectory}shoouts-downloads/`;
    
    try {
      return await getDirectorySize(downloadDir);
    } catch (error) {
      return 0;
    }
  }

  return {
    offlineTracks,
    getOfflineLibrary,
    downloadTrackForOffline,
    deleteOfflineTrack,
    getOfflineStorageSize
  };
}

function parseM3u8Segments(content: string): string[] {
  const lines = content.split('\n');
  const segments: string[] = [];
  
  for (const line of lines) {
    if (!line.startsWith('#') && line.trim()) {
      segments.push(line);
    }
  }
  
  return segments;
}

async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0;
  const items = await FileSystem.readDirectoryAsync(dirPath);
  
  for (const item of items) {
    const itemPath = `${dirPath}${item}`;
    const info = await FileSystem.getInfoAsync(itemPath);
    
    if (info.isDirectory) {
      size += await getDirectorySize(itemPath);
    } else {
      size += info.size || 0;
    }
  }
  
  return size;
}
```

**Update: usePlaybackStore.ts**
```typescript
interface PlaybackTrack {
  trackId: string;
  streamUrl?: string;      // Online URL from Cloud Storage
  localUri?: string;       // Offline file path
  title: string;
  artist: string;
  isOffline?: boolean;     // true if downloaded
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  currentTrack: null,

  playTrack: (track: PlaybackTrack) => {
    // Priority: Local file > Online stream
    const sourceUrl = track.localUri || track.streamUrl;
    
    if (!sourceUrl) {
      throw new Error('No playback source available (offline & no stream)');
    }

    set({
      currentTrack: {
        ...track,
        sourceUri: sourceUrl,
        isPlayingOffline: !!track.localUri
      }
    });
  },

  // ... other methods
}));
```

**Update: Library.tsx**
```typescript
function DownloadButton({ track }: { track: Track }) {
  const { downloadTrackForOffline, offlineTracks } = useOfflineDownload();
  const isDownloaded = offlineTracks.some(t => t.trackId === track.id);

  if (isDownloaded) {
    return (
      <TouchableOpacity>
        <Ionicons name="checkmark-circle" size={24} color="green" />
        <Text>Downloaded</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      onPress={async () => {
        try {
          await downloadTrackForOffline(track.id, track.title);
          Alert.alert('Success', 'Track downloaded for offline listening');
        } catch (error) {
          Alert.alert('Error', 'Failed to download track');
        }
      }}
    >
      <Ionicons name="cloud-download-outline" size={24} />
      <Text>Download</Text>
    </TouchableOpacity>
  );
}
```

### Storage Limitations

**iOS:**
- App-specific cached directory: ~1GB typical limit
- System clears cache when device runs low on space
- User can manually clear in Settings → Storage

**Best Practices:**
- Show user current offline storage size
- Warn when exceeding 500MB
- Auto-delete oldest downloads if space needed

---

## Content Moderation & DMCA

### Problem: Copyright Infringement

**Scenario:**
```
1. User uploads Drake's "Hotline Bling" (ripped from YouTube)
2. Sets price to $2
3. Gets 100 sales → cashes out $180 profit
4. Universal Music Group issues DMCA takedown
5. Shoouts liable for facilitating piracy
6. Lawsuit costs: $250k+ in legal fees
```

### Solution: Moderation System

**Three layers:**
1. **User Reporting** - Community flags suspicious content
2. **Admin Review Dashboard** - Humans verify flagged content
3. **Automated Takedown** - Soft-delete (isActive: false) + suspend creators

### Architecture

```
User sees track → "Report This Track" button
  ↓
Reports/{id}:
  {
    uploaderIs: 'creator_123',
    trackId: 'beat_789',
    reporterUid: 'user_456',
    reason: 'copyright' | 'offensive' | 'spam',
    description: "This is Drake's song",
    evidence: { url, timestamps },
    status: 'submitted' | 'reviewed' | 'upheld' | 'dismissed',
    createdAt: timestamp
  }
  ↓
Admin logs into Dashboard
  ↓
Sees flagged track → plays preview
  ↓
Decision: "UPHELD" (copyright) or "DISMISS" (false report)
  ↓
If UPHELD:
  - uploads/{trackId}: isActive = false (soft-delete)
  - users/{creatorId}: suspensionReason = 'copyright_abuse'
  - Buyer refunds: auto-issue credit
  - Report/{id}: status = 'upheld'
  ↓
If DISMISS:
  - Report/{id}: status = 'dismissed'
  - Creator gets notification: "Report dismissed"
```

---

## Compliance Checklist

### Pre-Launch

- [ ] Stripe Connect: Test account setup
- [ ] KYC verification flow tested
- [ ] Firestore audit ledger in place
- [ ] Environment variables separated (dev/prod)
- [ ] GitHub Actions CI/CD pipeline active
- [ ] Firebase Rules enforce read-only payouts
- [ ] Offline download feature functional
- [ ] Content moderation admin dashboard deployed
- [ ] Terms of Service include: creator obligations, copyright policy
- [ ] Privacy Policy documents data handling
- [ ] DMCA takedown process documented

### Launch (Soft Beta)

- [ ] Monitor failed KYC submissions
- [ ] Test refund flow
- [ ] Monitor payout reconciliation
- [ ] Test DMCA takedown

### Production (Full Launch)

- [ ] Legal review: ToS, Privacy Policy
- [ ] Tax compliance: provide 1099 forms tracking
- [ ] Monitor compliance metrics:
  - KYC success rate
  - DMCA report volume
  - Creator suspension rate
  - Payout success rate

---

**Last Updated:** March 2026
**Owner:** Shoouts Compliance & CreatorOps Team
