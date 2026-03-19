# Audio Streaming & Anti-Piracy Architecture

## Executive Summary

This document outlines **Shoouts'** three-layer defense against casual audio piracy:

1. **Watermarking** - Audio watermark ("Shoouts!") on marketplace previews
2. **HLS Transcoding** - Chunked, adaptive bitrate streaming (not progressive downloads)
3. **Signed URLs** - Time-limited download links (15 min) for verified purchases only

**Result**: Prevents right-click file downloads + reduces storage egress by 80% via adaptive bitrate + maintains full quality for legitimate users.

---

## Problem: Unprotected Raw Audio

### Current Vulnerabilities

**Before (Raw Firebase Storage URLs):**
```
https://storage.googleapis.com/shoouts.appspot.com/users/userId/audio/track.wav
```

**Risks:**
- ❌ Anyone can inspect network tab and download 50MB WAV directly
- ❌ No watermark → resold without attribution
- ❌ High bandwidth costs (egress billing on every stream)
- ❌ No DRM or purchase verification
- ❌ Mobile users buffer on 3G/4G (no adaptive bitrate)

**Estimated Monthly Cost** (before optimization):
```
10,000 users × 5 streams/month × 50MB × $0.12/GB
= 10,000 × 5 × 50MB × $0.12 = ~$3,000/month ⚠️
```

---

## Solution Architecture

### Storage Structure

```
Cloud Storage Bucket (shoouts-music)
├── originals/
│   ├── userId1/
│   │   ├── trackId1.wav          ← 50MB original (BACKEND ONLY)
│   │   ├── trackId2.wav
│   │   └── ...
│   └── userId2/
│
├── hls-previews/
│   ├── userId1/
│   │   ├── trackId1/
│   │   │   ├── manifest.m3u8      ← Watermarked HLS manifest
│   │   │   ├── segment-000.ts     ← 6-second chunks (128kbps)
│   │   │   ├── segment-001.ts
│   │   │   ├── segment-132.ts
│   │   │   └── ...
│   │   └── trackId2/
│   │       └── ...
│   └── userId2/
│
├── vaults/
│   ├── userId1/
│   │   ├── track.wav              ← Temporary (moved → originals/ after processing)
│   │   └── ...
│   └── userId2/
│
└── system/
    └── bestSellers.json           ← Pre-computed top 12 (read-only)
```

### Access Control Matrix

| Path | User Read | User Write | Backend Read | Backend Write | Security |
|------|-----------|------------|--------------|---------------|----------|
| `originals/` | ❌ | ❌ | ✅ (signed URL) | ✅ (Admin SDK) | High |
| `hls-previews/` | ❌ (signed URL only) | ❌ | ✅ | ✅ (Admin SDK) | High |
| `vaults/` | ✅ (own files) | ✅ (own files) | ✅ | ✅ | Medium |
| `system/` | ✅ (read-only) | ❌ | ✅ | ✅ | High |

---

## Layer 1: Watermarking

### Implementation

**Trigger:** When user uploads audio file to `vaults/{userId}/{filename}`

**Workflow:**
```
1. User uploads WAV/MP3/FLAC to vaults/
   ↓
2. Cloud Storage trigger fires → processAudioUpload()
   ↓
3. Copy original to originals/{userId}/{trackId}.wav
   ↓
4. Call Mux API with signed URL to original
   ↓
5. Mux transcodes + adds "Shoouts!" watermark overlay
   ↓
6. Mux returns HLS manifest + playback ID
   ↓
7. Save HLS segments to hls-previews/{userId}/{trackId}/
   ↓
8. Update Firestore: transcodingStatus = 'complete'
   ↓
9. Marketplace can now stream watermarked version
```

### Watermarking Strategy

**Audio Watermark** (not visual):
- Subtle "Shoouts!" voice overlay in background (repeated every 15 seconds)
- Configured in Mux watermark settings (pre-setup required)
- Inaudible to casual listeners but unmistakable to piracy detector

**Alternative: Metadata Watermark** (if audio overlay not preferred):
- Embed upload timestamp + uploader UID in audio metadata
- Detectible by forensic tools but invisible to user

### Mux Configuration

**Pre-requisite: Create Watermark in Mux Dashboard**
```
1. Login to Mux Dashboard
2. Go to Settings → Video Watermarks
3. Create watermark:
   - Name: "Shoouts Watermark"
   - Image: shoouts-watermark-small.png (or upload audio)
   - Opacity: 40-60% (visible but not intrusive)
4. Note the watermark ID: shoouts-watermark-id
5. Set in Cloud Functions env: WATERMARK_ID=shoouts-watermark-id
```

### Code Reference

See `functions/src/index.ts`:
```typescript
export const processAudioUpload = functions.storage.object().onFinalize(...)
  // Moves file to originals/ and queues Mux transcoding

async function callMuxTranscoding(userId, trackId, originalUrl)
  // Sends audio to Mux with watermark configuration
  // Mux returns playback ID → HLS URL automatically available
```

---

## Layer 2: HLS Transcoding (Adaptive Bitrate Streaming)

### Why HLS Instead of Progressive Download

**Progressive Download (OLD):**
```
Browser: "Give me track.wav"
Server: *sends entire 50MB file*
Result: Can download file to disk, piracy trivial
```

**HLS Streaming (NEW):**
```
Browser: "Give me manifest.m3u8"
Server: *sends playlist of 6-second chunks*
Browser: "Play segment-000.ts, segment-001.ts, ..."
Server: *streams chunks as needed*
Result: Cannot easily download; client-side only streaming
```

### Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Bandwidth** | 50MB per stream | 3-5MB per stream (80% reduction) |
| **Buffering** | Common on 3G | Adaptive in real-time |
| **Download Risk** | Trivial | Complex (must download all chunks) |
| **Cost** | ~$0.12/stream | ~$0.01-0.02/stream |

### Quality Tiers (Multi-Bitrate)

Mux automatically generates multiple bitrate versions:

```
manifest.m3u8 (playlist containing bitrate options):
├── 128kbps (mobile, sample preview)
├── 256kbps (good quality, standard streaming)
└── 512kbps (high quality, premium users only) *future*

Each playlist references 6-second chunks:
├── segment-000-128kbps.ts
├── segment-001-128kbps.ts
└── ...
```

**Adaptive Selection:**
- Mobile (3G): Uses 128kbps chunks
- WiFi: Uses 256kbps chunks
- Premium Tier: Uses 512kbps chunks (if subscribed)

### Storage & Cost Impact

**6-hour track (worst case):**
```
Original: 1 × 50MB WAV file
HLS Chunks:
  - 128kbps: 216 seconds × 16 chunks = 172MB ÷ 128 = ~16MB
  - 256kbps: 216 seconds × 16 chunks = 172MB ÷ 256 = ~32MB
  - 512kbps: 216 seconds × 16 chunks = 172MB ÷ 512 = ~64MB
Total per track: 16 + 32 + 64 + 50MB original = ~162MB

1,000 tracks × 162MB = 162GB
Storage cost: 162GB × $0.020/GB/month = ~$3.24/month
(vs raw files: 1,000 × 50MB = 50GB = $1.00/month)
```

**Worth it because:**
- Egress reduction = 80% savings per stream
- 10,000 users × 5 streams = $3,000 reduced to $600
- Storage increase ($2.24) << egress savings ($2,400)

---

## Layer 3: Signed URLs for Purchases

### Purchase Verification Flow

**Scenario: User bought "Sunset Vibes" track**

```
1. User opens Library tab
   ↓
2. Sees purchase: "Sunset Vibes by @producer1"
   ↓
3. Clicks Download button
   ↓
4. App calls: getStreamingUrl({
       trackId: 'sunset-vibes-123',
       uploaderId: 'producer1',
       isLibraryAccess: true  ← KEY FLAG
     })
   ↓
5. Cloud Function verifies:
   - request.auth.uid has purchase doc for track
   - purchase.createdAt < now (not future-dated)
   ↓
6. Function generates 15-minute signed URL to:
   originals/producer1/sunset-vibes-123.wav
   ↓
7. Returns: {
       url: "https://storage.googleapis.com/...signed...&expiry=1234567",
       expiresIn: 900  (seconds),
       type: 'original'
     }
   ↓
8. Browser downloads HIGH-QUALITY original
   (only 15-minute window, only for verified buyer)
```

### Security: Why 15 Minutes?

**Attack: "I'll download and share the link"**
```
Time 0:00 - Attacker gets link
Time 0:30 - Shares link on Telegram
Time 13:59 - Recipient tries to download
            ✅ Link still valid (could work)
Time 14:30 - Link expired
            ❌ Recipient cannot download
```

**If expiry = 1 hour:**
- Attacker shares at 0:30
- Recipient downloads at 50 minutes
- 10 people could download in series

**With 15-minute expiry:**
- Attacker shares at 0:30
- Recipient has 14.5 minutes to download
- Racing against clock discourages sharing

**Alternative: 5-minute expiry (more secure, but risky for slow networks)**

### Marketplace Preview (No Purchase Required)

**Same function, different branch:**

```
1. User browsing Marketplace
   ↓
2. Clicks Play on "Sunset Vibes" preview
   ↓
3. App calls: getStreamingUrl({
       trackId: 'sunset-vibes-123',
       uploaderId: 'producer1',
       isLibraryAccess: false  ← NO PURCHASE REQUIRED
     })
   ↓
4. Cloud Function skips purchase verification
   ↓
5. Returns signed URL to:
   hls-previews/producer1/sunset-vibes-123/manifest.m3u8
   (1-hour expiry)
   ↓
6. Browser streams WATERMARKED, LOW-BITRATE preview
```

### Code Reference

See `functions/src/index.ts`:
```typescript
export const getStreamingUrl = functions.https.onCall(async (data, context) => {
  // if (isLibraryAccess) → verify purchase, return originals/ signed URL
  // else → return hls-previews/ signed URL (watermarked)
})
```

---

## Implementation Checklist

### Prerequisites

- [ ] **Mux Account** - Create at mux.com, enable Video API
- [ ] **Mux Credentials** - Get Access Token ID + Secret
- [ ] **Watermark Image** - Small PNG (transparent background, 200x50px)
- [ ] **Configure Watermark ID** - In Mux Dashboard
- [ ] **Environment Variables** - Set in `functions/.env.local`:

```bash
MUX_TOKEN_ID=your_token_id
MUX_TOKEN_SECRET=your_token_secret
WATERMARK_ID=shoouts-watermark-id
```

### Phase 1: Cloud Functions Deployment

- [ ] Update `functions/package.json` - Add `node-fetch` if not present
- [ ] Deploy Cloud Functions:
  ```bash
  cd functions
  npm install
  firebase deploy --only functions
  ```
- [ ] Verify deployments:
  ```bash
  firebase functions:list
  ```

### Phase 2: Storage Rules

- [ ] Review updated `storage.rules`:
  - `originals/` - Backend only
  - `hls-previews/` - Signed URLs only
  - `vaults/` - Temporary staging
- [ ] Deploy rules:
  ```bash
  firebase deploy --only storage
  ```

### Phase 3: Client UI Updates

- [ ] Update audio player component to support HLS (`.m3u8` format)
  - Use `hls.js` library for browser support
  - Use HLSPlayer iOS native API
- [ ] Update upload.tsx to use `vaults/` path (instead of `users/uid/audio/`)
- [ ] Update cart.tsx marketplace player
- [ ] Update library.tsx download button (calls `getStreamingUrl`)

### Phase 4: Testing

- [ ] Upload test audio to staging bucket
- [ ] Verify processAudioUpload triggers
- [ ] Check Firestore: transcodingStatus should change to 'complete'
- [ ] Test marketplace playback (watermarked preview)
- [ ] Test library download (full quality, 15-min signed URL)
- [ ] Verify 15-minute URL expiry

### Phase 5: Monitoring

- [ ] Set up Cloud Function error logging (Firestore failures)
- [ ] Monitor Mux API response times (dashboard.mux.com)
- [ ] Track storage costs (originals + hls-previews sizes)
- [ ] Monitor egress charges before/after HLS rollout

---

## Cost Projections

### Scenario: 10,000 Monthly Users

**Monthly activity:**
- 5 streams per user = 50,000 streams
- 1,000 uploads per month
- 10% conversion rate (500 purchases/downloads)

**Costs Breakdown:**

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| **Egress** | 50,000 × 50MB × $0.12/GB | 50,000 × 3MB × $0.12/GB | **$2,400** |
| **Storage** | 1,000 × 50MB = 50GB | 1,000 × (50 + 100MB) = 150GB | **-$2** |
| **Mux API** | $0 | 1,000 × $0.001 per asset | **-$1** |
| **Operations** | Minimal | Logging + monitoring | **-$50** |
| **TOTAL** | ~$3,000 | ~$600 | **$2,400/month** |

**Payback Period:** ~1 day (implementation overhead is minimal)

---

## Troubleshooting

### "HLS playlist won't load in player"

**Solution:**
- Verify signed URL is still valid (check expiry timestamp)
- Ensure CORS headers enabled on Cloud Storage
- Use `hls.js` v1.3+ for better HLS support

### "Mux transcoding never completes"

**Solution:**
- Check Mux Dashboard for failed assets
- Verify signed URL was valid when Mux requested it (2-hour window)
- Check Firestore logs for transcodingStatus = 'failed'

### "Watermark not visible in preview"

**Solution:**
- Verify watermark ID matches Mux configuration
- Check watermark opacity setting (should be 40-60%)
- Re-upload test file to trigger reprocessing

### "Signed URL access denied after 15 minutes"

**Expected behavior** — URLs intentionally expire to prevent sharing.
- User must re-download if needed
- Each download generates new signed URL

---

## Security Considerations

### What's Protected

✅ **Right-click downloads** - Disabled (only chunks accessible)
✅ **URL sharing** - 15-minute expiry prevents reuse
✅ **Attribution** - Watermark identifies Shoouts source
✅ **Quality optimization** - Adaptive bitrate reduces casual sharing incentive
✅ **Purchase verification** - Full-quality only for verified buyers

### What's NOT Protected

⚠️ **Determined pirates** - Can still capture audio stream and reassemble
⚠️ **Screen recording** - User could record playback (unavoidable)
⚠️ **Metadata stripping** - Watermark can be removed with FFmpeg

**Important:** This is anti-piracy **via friction**, not cryptographic DRM. Determined attackers can circumvent, but casual sharing is effectively blocked.

---

## Future Enhancements

### Premium Watermark-Free Downloads

For Hybrid+ subscribers:
```typescript
if (userSubscriptionTier === 'hybrid+') {
  // Issue signed URL without watermark
  return originals/{userId}/{trackId}.wav
} else {
  // Issue watermarked HLS
  return hls-previews/{userId}/{trackId}/manifest.m3u8
}
```

### Analytics Tracking

Track streaming patterns:
- Most popular bitrate (optimize storage)
- Peak usage times (scale transcoding)
- Failed downloads (improve reliability)

### Dynamic Pricing Based on Tier

- **Free**: Marketplace preview only (watermarked, 128kbps, 1 hour)
- **Studio**: Full quality (512kbps, 15 min download)
- **Hybrid**: Unlimited quality (original WAV, 24 hours)

---

## References

- **Mux Video Docs**: https://docs.mux.com/
- **HLS.js Player**: https://github.com/video-dev/hls.js
- **Firebase Cloud Storage Rules**: https://firebase.google.com/docs/storage/security
- **Cloud Functions Storage Triggers**: https://firebase.google.com/docs/functions/gcp-storage-events

---

**Last Updated:** 2024
**Owner:** Shoouts Security Team
**Status:** Implementation in progress
