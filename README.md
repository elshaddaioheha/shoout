# Shoouts: Complete Setup & Deployment Guide

## 📱 What is Shoouts?

Shoouts is a mobile audio streaming and creator marketplace platform built with:
- **Frontend:** Expo React Native (iOS/Android)
- **Backend:** Firebase (Functions, Firestore, Storage, Auth)
- **Payments:** Flutterwave integration
- **Streaming:** HLS watermarked audio with signed URLs
- **Deployment:** GitHub Actions CI/CD with multi-environment support

---

## 🚀 Quick Start (10 minutes)

### Prerequisites
```bash
Node.js 20+
Firebase CLI
Git
GitHub account
Flutterwave account (payments)
Mux account (audio transcoding - optional)
```

### Installation

```bash
# Clone repository
git clone https://github.com/elshaddaioheha/shoout
cd shoout

# Install dependencies
npm install
cd functions && npm install && cd ..

# Build
npm run build

# Run locally
npm start
```

---

## 📋 Project Structure

```
shoout/
├── .github/workflows/deploy.yml       # GitHub Actions CI/CD
├── app/                               # Expo app (tabs, auth, pages)
├── components/                        # Reusable UI components
├── functions/                         # Cloud Functions (backend)
│   └── src/
│       └── index.ts                   # Main function exports
├── hooks/                             # React hooks (auth, UI state)
├── scripts/                           # Database seed scripts
├── store/                             # Zustand state management
├── utils/                             # API, error handling
├── firebase.json                      # Firebase config
├── firestore.rules                    # Security rules
├── storage.rules                      # Storage permissions
├── eas.json                           # Expo Application Services config
├── package.json                       # Dependencies
└── tsconfig.json                      # TypeScript config
```

---

## 🔐 Security & Payment System

### How Payments Work

```
Buyer purchases track ($10 USD)
  ↓
App sends payment to Flutterwave
  ↓
Buyer completes payment
  ↓
Flutterwave webhook → Cloud Function
  ↓
Function verifies signature + amount
  ↓
Creates Firestore transaction record
  ↓
User's library updated (purchases collection)
  ↓
✅ User can now download/stream track
```

### Security Model

- **Transactions** & **Purchases**: Read-only for clients (backend-only creation)
- **Firestore Rules**: Enforce that clients cannot directly create purchase records
- **Flutterwave Verification**: Signature validation on every webhook
- **Signed URLs**: Audio files accessed via time-limited signed URLs (1 hour expiry)
- **Watermarking**: Marketplace previews watermarked (HLS streaming)

### Key Firestore Collections

```
transactions/
  └── {txId}: transactionId, buyerId, sellerId, amount, status, createdAt

users/{uid}/purchases/
  └── {id}: trackId, title, artist, price, purchasedAt, audioUrl

users/{uid}/uploads/
  └── {id}: title, artist, price, isPublic, listenCount, audioUrl, coverUrl

system/bestSellers
  └── Cached list of top 12 tracks (updated hourly)
```

---

## 📦 Audio Streaming Features

### Marketplace Preview (Watermarked)
- Watermarked HLS stream (low bitrate)
- Public access (no auth required if track is public)
- 1-hour signed URL expiry
- Path: `hls-previews/{uploaderId}/{trackId}/manifest.m3u8`

### Library Download (Original Quality)
- Full-quality original audio (WAV format)
- Requires verified purchase in `users/{uid}/purchases`
- 15-minute signed URL expiry
- Path: `originals/{uploaderId}/{trackId}.wav`

### Transcoding Pipeline
1. User uploads audio to `vaults/{userId}/`
2. Cloud Function triggers `processAudioUpload`
3. Original moved to `originals/` (secure folder)
4. Mux (or FFmpeg) creates HLS watermark + segments
5. HLS segments stored to `hls-previews/`
6. Upload document tagged with `transcodingStatus: 'complete'`

---

## 🔧 Environment Setup

### Firebase Projects

You need **two separate Firebase projects** (dev and prod):

```bash
# Create projects
firebase projects create shoouts-dev
firebase projects create shoouts-prod

# Initialize
firebase init --project=shoouts-dev
firebase init --project=shoouts-prod
```

Update `.firebaserc`:
```json
{
  "projects": {
    "dev": "shoouts-dev-xxxxx",
    "prod": "shoouts-prod-yyyyy"
  },
  "default": "dev"
}
```

### Environment Variables

**`.env.local`** (local development):
```
EXPO_PUBLIC_FIREBASE_API_KEY=AIz...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=shoouts-dev.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=shoouts-dev-xxxxx
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=shoouts-dev.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

**Functions environment** (set via GitHub Secrets):
- `FLUTTERWAVE_SECRET_HASH` - Webhook signing key
- `MUX_TOKEN_ID` - Audio transcoding
- `MUX_TOKEN_SECRET` - Audio transcoding

---

## 🚀 GitHub Actions Deployment

### Setup (First Time Only)

**Step 1: Generate Firebase Token**
```bash
firebase login:ci
# Outputs: 1234567890abcdefghijk...
```

**Step 2: Add GitHub Secrets**

Go to: **GitHub → Repo Settings → Secrets and variables → Actions**

Add these secrets:

| Secret | Where to Get |
|--------|--------------|
| `FIREBASE_TOKEN_DEV` | `firebase login:ci` output |
| `FIREBASE_TOKEN_PROD` | `firebase login:ci` output (same) |
| `FLUTTERWAVE_SECRET_HASH_DEV` | Flutterwave Dashboard → Settings → Webhooks (TEST) |
| `FLUTTERWAVE_SECRET_HASH_PROD` | Flutterwave Dashboard → Settings → Webhooks (LIVE) |
| `MUX_TOKEN_ID_DEV` | Mux Dashboard → Access Control → API Tokens |
| `MUX_TOKEN_SECRET_DEV` | Mux Dashboard → Access Control → API Tokens |
| `MUX_TOKEN_ID_PROD` | Mux Dashboard (Production) |
| `MUX_TOKEN_SECRET_PROD` | Mux Dashboard (Production) |
| `SLACK_WEBHOOK_URL` | Slack Workspace → Apps → Incoming Webhooks (optional) |

### Deployment Flows

**Development Branch** (Auto-deploy on every push):
```bash
git checkout dev
git commit -m "New feature"
git push origin dev
# → GitHub Actions: lint → test → security → auto-deploy to firebase-dev
```

**Main Branch** (Manual approval required):
```bash
git checkout main
git pull origin dev
git push origin main
# → GitHub Actions: lint → test → security
# → Awaits approval in GitHub UI
# → Admin approves → auto-deploy to firebase-prod
```

### Workflow Jobs

1. **lint-and-type-check** - TypeScript + ESLint
2. **test** - Jest unit tests with coverage
3. **security** - npm audit + gitleaks secret scanning
4. **deploy-dev** - Auto-deploy to dev Firebase (dev branch only)
5. **deploy-prod** - Deploy to prod Firebase (main branch only, approval required)

---

## 📊 Local Development Workflow

### Running Locally

```bash
# Terminal 1: Start Expo server
npm start

# Terminal 2 (in another window): Build for iOS/Android
npm run ios
npm run android
```

### Firebase Emulator (Local Testing)

```bash
firebase emulators:start

# In another window
npm run dev:seed    # Seed test data into emulator
npm test            # Run Jest tests
```

### Building for Production

```bash
# Web build
npm run web

# iOS build (EAS)
eas build --platform ios

# Android build (EAS)
eas build --platform android
```

---

## 🐛 Troubleshooting

### "Firebase project not found"
```bash
firebase projects:list
firebase use dev    # or prod
```

### "TypeScript compilation errors"
```bash
cd functions
npm run build
```

### "Flutterwave webhook signature invalid"
1. Verify `FLUTTERWAVE_SECRET_HASH` matches Dashboard
2. Check webhook is v2 (not v1)
3. Verify RAW body is being used (not parsed JSON)

### "GitHub Actions deployment failed"
1. Check GitHub Actions tab for error logs
2. Verify all secrets are set: **Settings → Secrets → Review list**
3. Run `npm run build` locally to verify code compiles

### "Signed URL expired"
Normal - URLs expire after 1 hour. Generate a new one via `getStreamingUrl()` Cloud Function.

---

## 📱 Core Features

### Authentication
- Firebase Auth (email + social login)
- Role-based access: user, creator, admin
- Custom claims for authorization
- Secure token refresh

### Upload System
- Audio file upload to Cloud Storage
- File validation (type, size)
- Storage quota enforcement per subscription tier
- Automatic transcoding to HLS

### Shopping Cart
- Add/remove tracks
- Checkout session creation
- Flutterwave payment collection
- Atomic batch writes on payment success

### Library
- View purchased tracks
- Stream/download purchased audio
- Delete from library
- Search within library

### Create Mode (Creator Tools)
- Upload audio tracks
- Set price and metadata
- View earnings
- See listener analytics

### Marketplace
- Browse public tracks
- Filter by genre/artist
- Preview before purchase (watermarked)
- One-click purchase

---

## 💰 Monetization

### Subscription Tiers

**Vault (Listener)**
- Free: 50MB storage, preview only
- Creator: 500MB, 5 uploads, analytics
- Pro: 1GB, unlimited uploads
- Executive: 5GB, analytics + payouts

**Studio (Creator)**
- Free: 100MB, basic analytics
- Pro: 1GB, advanced analytics
- Plus: 10GB, revenue share setup

### Revenue Model
- Buyers pay fixed price per track
- Creator receives 100% of track price (Flutterwave fee absorbed)
- Platform takes 0% (covers via Flutterwave SaaS fee under business account)

---

## 📚 API Reference

### Key Cloud Functions

| Function | Type | Purpose |
|----------|------|---------|
| `createCheckoutSession` | HTTPS | Create Flutterwave checkout |
| `getCheckoutStatus` | HTTPS | Check payment status |
| `flutterwaveWebhook` | HTTPS | Receive payment webhooks |
| `getStreamingUrl` | HTTPS | Get signed URL for audio |
| `validateStorageLimit` | HTTPS | Check user quota |
| `aggregateBestSellers` | HTTP | Cache top tracks (hourly) |
| `processAudioUpload` | Storage Trigger | Handle new uploads |
| `onHlsTranscodingComplete` | HTTP | Receive Mux webhooks |

### Firestore Security Rules

```firestore
// Allow all reads if user is authenticated
allow read: if request.auth != null;

// Deny all direct writes (backend-only)
allow write: if false;

// Custom: Allow creator to read own uploads
match /users/{uid}/uploads/{uploadId} {
  allow read: if request.auth.uid == uid;
  allow write: if false;  // Backend only
}

// Custom: Allow user to read own purchases
match /users/{uid}/purchases/{purchaseId} {
  allow read: if request.auth.uid == uid;
  allow write: if false;  // Backend only
}
```

---

## 🔄 Deployment Checklist

### Before First Deploy

- [ ] Create Firebase dev + prod projects
- [ ] Update `.firebaserc` with project IDs
- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Deploy storage rules: `firebase deploy --only storage`
- [ ] Create Flutterwave test account + get webhook secret
- [ ] Set up GitHub Secrets (all 8)
- [ ] Test locally: `npm start`

### Launch

- [ ] Push to `dev` branch → verify workflow runs
- [ ] Test payment flow locally
- [ ] Push to `main` branch → approve → deploy to prod
- [ ] Verify production endpoints in Firebase Console
- [ ] Monitor Cloud Functions logs: `firebase functions:log --project=prod`

### Post-Launch

- [ ] Monitor best sellers caching job
- [ ] Check for webhook failures
- [ ] Review user uploads and flagged content
- [ ] Track payment success rate

---

## 📞 Support

### Common Commands

```bash
# Deploy everything
firebase deploy --project=dev

# Deploy only functions
firebase deploy --only functions --project=dev

# View logs
firebase functions:log --project=prod

# Emulator
firebase emulators:start

# List functions
firebase functions:list --project=prod

# Delete function
firebase functions:delete functionName --project=prod
```

### Getting Help

- **Firebase Docs:** https://firebase.google.com/docs
- **Expo Docs:** https://docs.expo.dev
- **Flutterwave Docs:** https://developer.flutterwave.com
- **GitHub Actions:** https://github.com/features/actions

---

## 📄 License

MIT

---

**Last Updated:** March 2026  
**Status:** Production Ready ✅
