# Shoouts Creator Economy: Implementation Roadmap

## Current Status

✅ **All Core Infrastructure Code Written**
- `functions/src/stripe-connect.ts` - Payout orchestration (330 lines)
- `functions/src/moderation.ts` - Content flagging system (250 lines)  
- `.github/workflows/cicd-pipeline.yml` - Automated CI/CD (300 lines)
- `firestore-compliance.rules` - Immutable ledger security (220 lines)
- `COMPLIANCE_CREATOR_ECONOMY.md` - Full documentation (1000 lines)
- `COMPLIANCE_QUICK_REFERENCE.md` - Developer guide (600 lines)

**Not Yet Done:**
- Export moderation functions from index.ts
- Configure GitHub Secrets
- Create admin dashboard UI
- Implement offline download hook
- Test end-to-end flows

---

## Step-by-Step Implementation

### Step 1: Export Moderation Functions (5 min) 

**File:** `functions/src/index.ts`

**What to add at end of file:**

```typescript
// Export moderation functions
export {
  reportTrack,
  adminReviewReport,
  adminSuspendCreator,
  adminGetModerationQueue,
  adminGetComplianceMetrics,
} from './moderation';
```

**Why:** Makes admin functions callable from Firebase client SDK

---

### Step 2: Update Package Dependencies (2 min)

**File:** `functions/package.json`

**Add to dependencies:**
```json
{
  "dependencies": {
    "@stripe/stripe-js": "^3.0.0",
    "stripe": "^13.0.0"
  }
}
```

**Then run:**
```bash
cd functions
npm install
```

---

### Step 3: Set GitHub Secrets (10 min)

**Go to:** GitHub Repo → Settings → Secrets and variables → Actions

**Add these secrets (for DEV):**
```
Name: STRIPE_SECRET_KEY_DEV
Value: sk_test_...  [Get from Stripe Dashboard]

Name: STRIPE_PUBLISHABLE_KEY_DEV
Value: pk_test_...

Name: FLUTTERWAVE_SECRET_HASH_DEV
Value: [Copy from your Flutterwave account]

Name: SLACK_WEBHOOK_URL
Value: [Get from Slack workspace settings]
```

**Add these secrets (for PROD):**
```
Name: STRIPE_SECRET_KEY_PROD
Value: sk_live_...  [Stripe LIVE mode]

Name: MUX_TOKEN_ID_PROD
Value: [From Mux API]

Name: GITHUB_ENVIRONMENT_APPROVAL_EMAIL
Value: your-team-email@company.com
```

---

### Step 4: Deploy GitHub Actions Workflow (3 min)

**From workspace root:**

```bash
git add .github/workflows/cicd-pipeline.yml
git commit -m "Add GitHub Actions CI/CD pipeline with environment separation"
git push origin main
```

**Verify:**
- Go to GitHub repo → Actions tab
- Should see workflow running
- Check: lint → test → security passes

---

### Step 5: Deploy Functions (5 min)

```bash
cd functions
npm run build  # TypeScript compile

firebase deploy --only functions --project=dev
# Wait for completion...
firebase deploy --only firestore:rules --project=dev
```

**Verify:**
- Firebase Console → Functions → All functions listed
- No deployment errors

---

### Step 6: Create Admin Dashboard (2-3 hours)

**Create folder:**
```bash
mkdir admin-dashboard
cd admin-dashboard
npx create-next-app@latest .
```

**Key pages needed:**
```
pages/
  login.tsx           - Firebase Auth
  moderation/
    queue.tsx         - Pending reports list
    [reportId].tsx    - Review single report + decide
  metrics.tsx         - KYC %, payout volume, etc.
  creators.tsx        - List, search, suspend
```

**Example: Moderation queue page**

```typescript
import { adminGetModerationQueue } from '@/lib/firebase-admin';
import { useState, useEffect } from 'react';

export default function ModerationQueue() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = adminGetModerationQueue().onSnapshot(snapshot => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  return (
    <div>
      <h1>Moderation Queue ({reports.length} pending)</h1>
      {reports.map(report => (
        <div key={report.id} className="p-4 border rounded">
          <p>Track: {report.trackTitle}</p>
          <p>Reason: {report.reason}</p>
          <p>Time reported: {new Date(report.createdAt).toLocaleDateString()}</p>
          <a href={`/moderation/${report.id}`}>Review</a>
        </div>
      ))}
    </div>
  );
}
```

---

### Step 7: Implement Offline Download Hook (1-2 hours)

**Create file:** `hooks/useOfflineDownload.ts`

```typescript
import * as FileSystem from 'expo-file-system';
import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OfflineTrack {
  trackId: string;
  title: string;
  artist: string;
  localUri: string;
  downloadedAt: number;
  sizeMb: number;
}

export function useOfflineDownload() {
  const [downloads, setDownloads] = useState<Map<string, OfflineTrack>>(new Map());
  const [downloading, setDownloading] = useState<Set<string>>(new Set());

  const downloadTrackForOffline = useCallback(
    async (trackId: string, title: string, artist: string, m3u8Url: string) => {
      setDownloading(prev => new Set([...prev, trackId]));
      try {
        const cacheDir = `${FileSystem.cacheDirectory}shoouts-downloads/${trackId}/`;
        
        // Create directory
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });

        // Parse M3U8 and download segments
        const m3u8Response = await fetch(m3u8Url);
        const m3u8Content = await m3u8Response.text();
        const segments = m3u8Content.match(/.*\.ts/g) || [];

        let totalSize = 0;
        for (const segment of segments) {
          const segmentUrl = new URL(segment, new URL(m3u8Url).origin).toString();
          const fileName = segment.split('/').pop() || 'segment.ts';
          const filePath = `${cacheDir}${fileName}`;

          const response = await fetch(segmentUrl);
          const blob = await response.blob();
          const base64 = await blob.text(); // Convert to base64

          await FileSystem.writeAsStringAsync(filePath, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          totalSize += (await FileSystem.getInfoAsync(filePath)).size || 0;
        }

        // Save metadata
        const track: OfflineTrack = {
          trackId,
          title,
          artist,
          localUri: `${cacheDir}index.m3u8`,
          downloadedAt: Date.now(),
          sizeMb: totalSize / (1024 * 1024),
        };

        setDownloads(prev => new Map([...prev, [trackId, track]]));
        await AsyncStorage.setItem('offlineTracks', JSON.stringify(Array.from(setDownloads.entries())));
      } finally {
        setDownloading(prev => {
          const next = new Set(prev);
          next.delete(trackId);
          return next;
        });
      }
    },
    []
  );

  const deleteOfflineTrack = useCallback(async (trackId: string) => {
    const cacheDir = `${FileSystem.cacheDirectory}shoouts-downloads/${trackId}/`;
    await FileSystem.deleteAsync(cacheDir);
    setDownloads(prev => {
      const next = new Map(prev);
      next.delete(trackId);
      return next;
    });
  }, []);

  return {
    offlineTracks: Array.from(downloads.values()),
    downloading: Array.from(downloading),
    downloadTrackForOffline,
    deleteOfflineTrack,
    isDownloading: (trackId: string) => downloading.has(trackId),
  };
}
```

**Update playback to use local files:**

In `store/usePlaybackStore.ts`:

```typescript
const playTrack = async (track: Track) => {
  // Check local file first
  if (track.localUri && await FileSystem.getInfoAsync(track.localUri)) {
    setCurrentTrack({ ...track, url: track.localUri, isLocal: true });
  } else {
    // Fall back to streaming
    const streamUrl = await getStreamingUrl(track.id);
    setCurrentTrack({ ...track, url: streamUrl, isLocal: false });
  }
};
```

---

### Step 8: Add Download Button to Library UI (1 hour)

**File:** `app/(tabs)/library.tsx`

```typescript
import { useOfflineDownload } from '@/hooks/useOfflineDownload';

export default function LibraryTab() {
  const { downloadTrackForOffline, offlineTracks, isDownloading } = useOfflineDownload();
  
  const handleDownload = async (track: Track) => {
    const m3u8Url = await getStreamingUrl(track.id); // Get streaming URL
    await downloadTrackForOffline(track.id, track.title, track.artist, m3u8Url);
  };

  return (
    <ScrollView>
      {tracks.map(track => (
        <View key={track.id} style={styles.trackItem}>
          <Text>{track.title}</Text>
          
          {offlineTracks.find(t => t.trackId === track.id) ? (
            <View style={styles.downloaded}>
              <Text>✓ Downloaded</Text>
              <Button title="Delete" onPress={() => deleteOfflineTrack(track.id)} />
            </View>
          ) : (
            <Button
              title={isDownloading(track.id) ? "Downloading..." : "Download"}
              onPress={() => handleDownload(track)}
              disabled={isDownloading(track.id)}
            />
          )}
        </View>
      ))}
    </ScrollView>
  );
}
```

---

### Step 9: End-to-End Test (2 hours)

**Test 1: Creator KYC**
```
1. Go to settings → Connect Stripe
2. Complete Stripe onboarding form
3. Check Firestore: kycStatus should be 'verified' after ~1 min
4. Verify: User has stripeAccountId in user doc
```

**Test 2: Creator Payout** 
```
1. As buyer: Purchase $10 track
2. See Flutterwave payment
3. Check Firestore: payoutLedger entry created
4. Check Stripe Dashboard: Transfer to creator account
5. Verify: payoutStatus shows 'settled' after 1-2 days
```

**Test 3: Content Moderation**
```
1. As user: Report track (Report This → Copyright)
2. Check Firestore: contentReports/{id} entry created
3. As admin: Go to admin dashboard
4. See report in queue
5. Click "Review" → decide "UPHOLD"
6. Verify: Track becomes inactive, creator suspended
```

**Test 4: Offline Download**
```
1. Go to library
2. Press "Download" on any track
3. Watch progress bar
4. Turn off WiFi
5. Play track → should play from local cache
6. See "♫ Offline" label on now-playing
```

---

## Command Reference

### Local Development

```bash
# Start emulator + seed test data
firebase emulators:start
npm run dev:seed

# Run tests
npm test

# Type check
tsc

# Lint
eslint .
```

### Deploy to Dev
```bash
firebase deploy --project=dev --only functions,firestore
```

### Deploy to Prod
```bash
firebase deploy --project=prod --only functions,firestore
```

### View Logs
```bash
firebase functions:log --project=prod
```

---

## Monitoring Checklist

### Daily (Week 1)

- [ ] Check KYC success rate in Firestore
- [ ] Verify payouts are settled in Stripe Dashboard
- [ ] Monitor content report queue (should be < 5 pending)
- [ ] Check GitHub Actions for failed deployments

### Weekly (Ongoing)

- [ ] Payout reconciliation: Firestore ledger vs Stripe transfers
- [ ] Creator retention: Any unusual suspension patterns?
- [ ] Bug reports: Check GitHub issues + user feedback
- [ ] Performance: Response time of admin dashboard

### Monthly

- [ ] Tax compliance: Download Stripe 1099 forms
- [ ] Audit: Review all moderation decisions
- [ ] Metrics: Report to stakeholders

---

## File Checklist

- [x] `functions/src/stripe-connect.ts` - Created
- [x] `functions/src/moderation.ts` - Created
- [x] `.github/workflows/cicd-pipeline.yml` - Created
- [x] `firestore-compliance.rules` - Created
- [x] `COMPLIANCE_CREATOR_ECONOMY.md` - Created
- [ ] Export moderation functions in `functions/src/index.ts` - **NEXT STEP**
- [ ] Configure GitHub Secrets - **NEXT STEP**
- [ ] Create admin dashboard - **TODO**
- [ ] Implement `useOfflineDownload.ts` hook - **TODO**
- [ ] Test end-to-end - **TODO**

---

## Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Code written | ✅ Complete | |
| Setup GitHub Secrets | 15 min | ⏳ Next |
| Deploy to staging | 30 min | ⏳ Next |
| Admin dashboard | 3 hours | ⏳ Later |
| Offline features | 2 hours | ⏳ Later |
| Testing | 2 hours | ⏳ Later |
| **Total** | **~8 hours** | |

---

**Ready to proceed?** Start with **Step 1**: Export moderation functions.
