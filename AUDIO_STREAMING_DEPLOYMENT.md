# Audio Streaming: Environment & Deployment Setup

## Pre-Deployment Checklist

### 1. Mux Account Setup (`mux.com`)

#### Create Mux Account
```bash
1. Visit https://mux.com
2. Sign up for free account
3. Go to Dashboard → Settings → API Access Tokens
4. Create new token:
   - Name: Shoouts Production
   - Permissions: Video.All (for transcoding + watermarking)
5. Copy credentials:
   - Token ID (e.g., abc123xyz...)
   - Token Secret (e.g., secret_xyz...)
```

#### Create Watermark (One-time Setup)
```bash
1. In Mux Dashboard: Settings → Video Watermarks
2. Click "Create Watermark"
3. Upload watermark image (or configure audio watermark):
   - Name: "Shoouts Watermark"
   - Image: shoouts-watermark.png (200x50px, transparent)
   - Opacity: 50% (visible but not intrusive)
4. Note the Watermark ID (e.g., abc123...)
5. Will be used in Cloud Functions env var: WATERMARK_ID
```

**Watermark Requirements:**
- Image: PNG with transparency
- Size: 200x50px or 400x100px (will be scaled down)
- Content: "Shoouts!" text or logo
- Format: Save all watermarks in `assets/watermarks/` directory

#### Configure Webhook (For Transcoding Completion)
```bash
1. Mux Dashboard → Settings → Webhooks
2. Add Webhook:
   - URL: https://[REGION]-[PROJECT_ID].cloudfunctions.net/onHlsTranscodingComplete
   - Signing Secret: (auto-generated, save to Secret Manager)
   - Events: video.asset.ready (when transcoding completes)
3. Note the signing secret (will verify requests are from Mux)
```

---

### 2. Cloud Functions Environment Variables

**File:** `functions/.env.local`

```bash
# ─────────────────────────────────────────────────────────────────────────
# Mux Video API Credentials
# ─────────────────────────────────────────────────────────────────────────
MUX_TOKEN_ID=your_mux_token_id_here
MUX_TOKEN_SECRET=your_mux_token_secret_here
WATERMARK_ID=your_mux_watermark_id_here  # From Mux Dashboard watermarks setup
MUX_WEBHOOK_SECRET=your_webhook_signing_secret_here  # For webhook verification

# ─────────────────────────────────────────────────────────────────────────
# Feature Flags
# ─────────────────────────────────────────────────────────────────────────
ENABLE_AUDIO_TRANSCODING=true  # Toggle HLS transcoding on/off
TRANSCODING_TIMEOUT_MINUTES=5  # Max wait for Mux response

# ─────────────────────────────────────────────────────────────────────────
# Storage Configuration
# ─────────────────────────────────────────────────────────────────────────
STORAGE_BUCKET=shoouts-music-staging  # or shoouts-music-production
ORIGINALS_PATH=originals  # Secure storage path for raw files
HLS_PREVIEW_PATH=hls-previews  # Watermarked preview chunks
VAULTS_PATH=vaults  # Temporary upload staging
```

**Security:** Never commit `.env.local` with real credentials. Use separate files for staging/production.

---

### 3. Google Cloud Secret Manager

**Alternative to .env.local (recommended for production):**

```bash
# Create secrets
gcloud secrets create MUX_TOKEN_ID --replication-policy="automatic"
echo "your_token_id" | gcloud secrets versions add MUX_TOKEN_ID --data-file=-

gcloud secrets create MUX_TOKEN_SECRET --replication-policy="automatic"
echo "your_token_secret" | gcloud secrets versions add MUX_TOKEN_SECRET --data-file=-

gcloud secrets create MUX_WEBHOOK_SECRET --replication-policy="automatic"
echo "your_webhook_secret" | gcloud secrets versions add MUX_WEBHOOK_SECRET --data-file=-

# Grant Cloud Functions access
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:PROJECT_ID@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

**Update Cloud Functions to use secrets:**
```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

async function getMuxCredentials() {
  const secretClient = new SecretManagerServiceClient();
  const tokenIdName = secretClient.secretVersionPath(
    process.env.GCP_PROJECT,
    'MUX_TOKEN_ID',
    'latest'
  );
  const response = await secretClient.accessSecretVersion({ name: tokenIdName });
  return response[0].payload.data.toString();
}
```

---

## Deployment Steps

### Step 1: Prepare Cloud Functions Directory

```bash
cd functions
npm install
```

**Check `functions/package.json` includes:**
```json
{
  "dependencies": {
    "firebase-functions": "^4.4.1",
    "firebase-admin": "^12.0.0",
    "node-fetch": "^2.6.0"  // For HTTP requests to Mux API
  }
}
```

---

### Step 2: Deploy Cloud Functions

```bash
# Deploy all audio streaming functions
firebase deploy --only functions:processAudioUpload \
                        functions:getStreamingUrl \
                        functions:onHlsTranscodingComplete \
                        functions:initiateHlsTranscoding

# Verify deployment
firebase functions:list

# Check logs
firebase functions:log --limit 50
```

**Expected Output:**
```
✔  Deploy functions

Processing audioUpload (storage trigger)
Processing getStreamingUrl (HTTPS callable)
Processing initiateHlsTranscoding (internal)
Processing onHlsTranscodingComplete (HTTPS)

✔  functions: Deployed successfully
```

---

### Step 3: Deploy Storage Rules

```bash
firebase deploy --only storage

# Verify rules are in place
gsutil stat gs://shoouts-music/originals/  # Should exist but be protected
gsutil stat gs://shoouts-music/hls-previews/  # Should exist but be protected
```

**Check Rules Applied:**
```bash
# View current rules
gcloud firebase storage:rules:get

# Should show:
# - originals/{userId}/{trackId}.wav (allow read: if false)
# - hls-previews/{userId}/{trackId}/{segment=**} (allow read: if false)
# - vaults/{userId}/{filename} (allow read: if isOwner, create: if isOwner)
```

---

### Step 4: Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules

# Verify in Firebase Console
# Database Rules tab should show uploads collection rules
```

---

### Step 5: Create Cloud Function Pub/Sub Topic (Optional)

**If using Pub/Sub for async transcoding queue:**

```bash
# Create topic
gcloud pubsub topics create audio-transcoding

# Subscribe Cloud Function
gcloud functions deploy audioTranscodingWorker \
  --runtime nodejs18 \
  --trigger-topic audio-transcoding \
  --region us-central1 \
  --entry-point processAudioTranscodingTask
```

---

## Testing Deployment

### Test 1: Verify Cloud Functions Deployed

```bash
curl https://[REGION]-[PROJECT_ID].cloudfunctions.net/onHlsTranscodingComplete \
  -X GET \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"

# Should return: 405 (Method not allowed) or 200 (OK)
# This confirms function is accessible
```

### Test 2: Upload Test Audio File

```bash
# Upload to vaults/ (triggers processAudioUpload)
gsutil cp test-audio.wav gs://shoouts-music/vaults/test-user/test-audio.wav

# Verify in Cloud Functions logs
firebase functions:log --limit 20

# Should see:
# "Audio upload processing initiated: test-audio"
# "Original file secured: originals/test-user/test-audio.wav"
```

### Test 3: Check Firestore Upload Metadata

```bash
# Query Firestore
gcloud firestore documents list uploads --limit=5

# Should show:
{
  "uploadId": "test-audio",
  "userId": "test-user",
  "fileName": "test-audio.wav",
  "originalStoragePath": "originals/test-user/test-audio.wav",
  "transcodingStatus": "pending"  # Will change to "processing" then "complete"
}
```

### Test 4: Wait for Mux Webhook (30-60 seconds)

```bash
# Monitor Firestore for status change
watch -n 2 'gcloud firestore documents get uploads/test-audio'

# After ~30-60s, should change to:
{
  "transcodingStatus": "complete",
  "muxAssetId": "lw23i90df",
  "playbackId": "lw23i90df",
  "hlsUrl": "https://image.mux.com/lw23i90df/manifest.m3u8"
}
```

### Test 5: Test getStreamingUrl Function

**Client-side (React Native):**
```typescript
import { httpsCallable, Functions } from 'firebase/functions';

async function testStreamingUrl() {
  try {
    const getStreamingUrl = httpsCallable(
      functions,
      'getStreamingUrl'
    );

    const result = await getStreamingUrl({
      trackId: 'test-audio',
      uploaderId: 'test-user',
      isLibraryAccess: false  // Test marketplace preview
    });

    console.log('Streaming URL:', result.data.url);
    console.log('Type:', result.data.type);  // Should be 'watermarked-hls'
    console.log('Expires in:', result.data.expiresIn, 'seconds');
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Test 6: Verify HLS Chunks in Storage

```bash
# List HLS segments (if transcoding completed)
gsutil ls gs://shoots-music/hls-previews/test-user/test-audio/

# Should list:
# gs://shoouts-music/hls-previews/test-user/test-audio/manifest.m3u8
# gs://shoouts-music/hls-previews/test-user/test-audio/segment-000.ts
# gs://shoouts-music/hls-previews/test-user/test-audio/segment-001.ts
# ...

# Download manifest to verify M3U8 format
gsutil cp gs://shoouts-music/hls-previews/test-user/test-audio/manifest.m3u8 ./
cat manifest.m3u8

# Should contain:
# #EXTM3U
# #EXT-X-VERSION:3
# #EXT-X-TARGETDURATION:6
# #EXTINF:6.0,
# segment-000.ts
# ...
```

---

## Troubleshooting Deployment

### Issue: "Mux API credentials not found"

**Solution:**
```bash
# Verify env vars are set
firebase functions:config:get  # Check if local .env.local used
firebase deploy --only functions  # Redeploy with env vars

# Or use Cloud Secret Manager
gcloud secrets list
gcloud secrets versions access latest --secret="MUX_TOKEN_ID"
```

### Issue: "Firestore rules deployment rejected"

**Solution:**
```bash
# Validate rules syntax
firebase emulators:start --only firestore  # Test locally first

# Check for syntax errors
firebase deploy --only firestore:rules --debug

# View current rules
gcloud firebase firestore:rules:get
```

### Issue: "Storage paths not writable by backend"

**Solution:**
```bash
# Verify admin SDK can write
gcloud auth activate-service-account --key-file=path/to/key.json
gsutil -m cp test.wav gs://shoouts-music/originals/test/

# If denied, check:
# 1. Service account has Editor role
# 2. storage.rules allow Admin SDK writes (Admin SDK bypasses rules)
# 3. Bucket IAM policy includes service account
```

### Issue: "Mux webhook never fires"

**Solution:**
```bash
# Verify webhook URL is reachable
curl https://[REGION]-[PROJECT_ID].cloudfunctions.net/onHlsTranscodingComplete \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'

# Check Cloud Function logs for webhook requests
firebase functions:log onHlsTranscodingComplete --limit 50

# Verify Mux Dashboard shows webhook delivery attempts
# Settings → Webhooks → View recent deliveries
```

---

## Production Deployment Checklist

- [ ] Mux production account created
- [ ] Watermark image uploaded to Mux
- [ ] API credentials stored in Secret Manager
- [ ] Webhook URL configured in Mux Dashboard
- [ ] Cloud Functions deployed to production region
- [ ] Storage/Firestore rules deployed
- [ ] Test audio uploaded and verified transcodingStatus='complete'
- [ ] getStreamingUrl returns valid signed URL
- [ ] HLS.js player tested with watermarked preview
- [ ] Purchase verification tested with signed URL
- [ ] Monitoring alerts configured:
  - [ ] Function error rate > 5%
  - [ ] Transcoding time > 5 minutes
  - [ ] HLS storage > 500GB
  - [ ] Signed URL rejection rate > 10%
- [ ] Rollback plan tested

---

## Monitoring & Metrics

**Cloud Functions Metrics:**
```bash
# CPU utilization
gcloud monitoring timeseries describe \
  --filter='metric.type="cloudfunctions.googleapis.com/execution_times"'

# Response times (should be < 1s for getStreamingUrl)
gcloud monitoring timeseries describe \
  --filter='metric.type="cloudfunctions.googleapis.com/execution_count"'

# Error rate (should be < 0.1%)
gcloud functions describe processAudioUpload --region us-central1 | grep "error"
```

**Mux Dashboard Metrics:**
```
1. Asset Creation → Success Rate (target: 99%)
2. Playback Availability → % uptime (target: 99.9%)
3. Transcoding Duration → P50/P99 latency
4. Origins CDN → Egress traffic trends
```

---

## Rollback Procedure

**If issues discovered after production deployment:**

```bash
# Step 1: Disable Cloud Functions (keep rules in place)
firebase functions:delete processAudioUpload --force
firebase functions:delete onHlsTranscodingComplete --force

# Step 2: Revert storage.rules to previous version
git checkout HEAD~1 storage.rules
firebase deploy --only storage

# Step 3: Monitor existing uploads
# - Already processed uploads continue to work
# - New uploads staged in vaults/ but not transcoded

# Step 4: Investigate in staging environment
# - Deploy to staging bucket
# - Test with smaller subset
# - Fix bugs

# Step 5: Re-deploy to production once fixed
firebase deploy --only functions
firebase deploy --only storage

# Total downtime: < 30 minutes
```

---

**Last Updated:** 2024
**Owner:** Shoouts DevOps Team
