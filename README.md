# Shoouts

Shoouts is an Expo + Firebase mobile app with five subscription-driven experiences:

- `shoout`: buyer mode for discovery, cart, checkout, and messaging
- `vault`: private storage, folders, uploads, and secure sharing
- `vault_pro`: higher-capacity Vault plan
- `studio`: seller tools for listings, analytics, ads, payouts, and messaging
- `hybrid`: combined Studio + Vault workflow

The current app uses Expo Router for navigation, Zustand for client state, Firebase for auth/data/storage, Cloud Functions for secure server workflows, Flutterwave for verified payments, and EAS for native builds.

## Current Stack

- Expo SDK 55
- React 19.2 / React Native 0.83
- Expo Router
- Zustand
- Firebase Auth, Firestore, Storage, Cloud Functions
- Flutterwave checkout and webhook verification
- Sentry runtime monitoring
- Jest + `jest-expo`

## Current App Surface

### Route groups

- `app/index.tsx`: splash / auth entry routing
- `app/(auth)/*`: onboarding, login, signup, OTP, password reset, role selection, studio creation
- `app/(tabs)/*`: home, search/explore, cart, marketplace, library, more
- `app/settings/*`: subscriptions, appearance, notifications, privacy, downloads, localization, payment methods, help
- `app/studio/*`: upload, analytics, earnings, withdraw, settings, ads flow, seller messages
- `app/vault/*`: upload, updates, links, folder detail, track detail
- `app/chat/*`: buyer and seller chat threads
- `app/admin/*`: creators, moderation, metrics, payouts
- `app/listing/[id].tsx`: transparent modal listing detail

### Shared UI and state

- App-mode switching is driven by `useAppSwitcher` and persisted `activeAppMode`
- Server-verified subscription state lives in `useAuthStore`
- User-facing capabilities are mirrored into `useUserStore`
- Playback, downloads, cart, localization, appearance, accessibility, notifications, and toast state each have dedicated stores

## Subscription Model In Code

The active plan definitions live in [`utils/subscriptions.ts`](c:/Users/HP/Desktop/Shoouts/shoout/utils/subscriptions.ts).

Current plans and prices:

- `shoout`: free
- `vault`: free
- `vault_pro`: USD 5.99 / month
- `studio`: USD 18.99 / month
- `hybrid`: USD 24.99 / month

Capabilities are feature-flagged in code, including:

- cart and marketplace messaging
- Vault storage limits and upload permissions
- seller publishing and replies
- analytics and ads access
- team-access flags for Hybrid

## Backend State

Cloud Functions are exported from [`functions/src/index.ts`](c:/Users/HP/Desktop/Shoouts/shoout/functions/src/index.ts) and currently grouped as:

- `auth`
- `checkout`
- `subscription`
- `webhook`
- `uploads`
- `aggregation`
- `admin`
- `bootstrap`
- `migration`

Important backend flows:

- `createCheckoutSession` creates pending checkout sessions and server-calculated totals
- `activateSubscriptionTier` verifies payment before activating paid plans
- scheduled downgrades handle expired subscriptions
- webhook handlers verify Flutterwave callbacks
- Firestore rules block client writes for purchases and other backend-only records

## Local Development

### Prerequisites

- Node.js 20+
- npm
- Firebase CLI
- EAS CLI for native builds

### Install

```bash
npm install
cd functions && npm install && cd ..
```

### Run

```bash
npm start
```

Useful scripts:

```bash
npm test
npm run test:coverage
npm run test:functions
npm run lint
```

Seeder and utility scripts also exist under `scripts/`, including:

- `dev:seed`
- `dev:seed:test`
- `dev:seed:full`
- `dev:seed:rest`
- `dev:seed:royalty-free`
- `dev:seed:media`
- `dev:backfill:publish-snapshot`

## Environment and Secrets

### Client-side Expo env

The app currently reads Expo public env values such as:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY`
- `EXPO_PUBLIC_FLUTTERWAVE_ENCRYPTION_KEY`
- `EXPO_PUBLIC_FUNCTIONS_URL`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

Keep private server credentials out of `EXPO_PUBLIC_*`.

### EAS native file secrets

Android Firebase config is injected by [`app.config.ts`](c:/Users/HP/Desktop/Shoouts/shoout/app.config.ts). EAS should provide:

```bash
eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value google-services.json
```

Locally, `app.config.ts` only sets `googleServicesFile` if the repo-level file actually exists.

### Firebase Functions secrets

Server-side payment and upload flows rely on secure secrets set in Firebase, including:

- `FLUTTERWAVE_SECRET_KEY`
- `FLUTTERWAVE_SECRET_HASH`
- `UPLOAD_BUCKET_NAME`

## Notifications and Monitoring

- Notifications are initialized in [`app/_layout.tsx`](c:/Users/HP/Desktop/Shoouts/shoout/app/_layout.tsx)
- Notification helpers live in [`utils/notifications.ts`](c:/Users/HP/Desktop/Shoouts/shoout/utils/notifications.ts)
- Sentry initialization is triggered from app startup via `app/monitoring.ts`

## Firebase Project Files

- [`firebase.json`](c:/Users/HP/Desktop/Shoouts/shoout/firebase.json): functions, Firestore, Storage, emulator config
- [`firestore.rules`](c:/Users/HP/Desktop/Shoouts/shoout/firestore.rules): auth, subscription, uploads, purchases, folders, links, merch, chat-related rules
- [`storage.rules`](c:/Users/HP/Desktop/Shoouts/shoout/storage.rules): storage permissions

## CI/CD

The current workflow file is [`deploy.yml`](c:/Users/HP/Desktop/Shoouts/shoout/.github/workflows/deploy.yml).

It currently runs:

- lint and Cloud Functions type-check
- app tests with coverage
- `npm audit` and gitleaks
- EAS preview builds on pull requests
- EAS production builds on version tags
- Firebase deploys to `dev`
- Firebase deploys to `main` / `master`

## EAS Builds

Run EAS commands from the app directory:

```bash
cd c:\Users\HP\Desktop\Shoouts\shoout
eas build --platform android --profile preview
```

Current build notes:

- the project now resolves cleanly on Expo SDK 55
- `expo config --json --full` succeeds
- Expo Doctor only still warns that `expo-av` is unmaintained

## Testing Notes

Frontend tests live in `__tests__/`.

Functions tests live in `functions/src/__tests__/`.

Jest uses `jest-expo` plus repo-level mocks for Firebase, Expo runtime shims, linear gradients, and Flutterwave.

## Known Gaps

- `README.md` and `PRD.md` were rewritten to reflect the codebase as it exists now, but product copy and screenshots are still absent
- `expo-av` is still in use for playback and remains the main package-level warning from Expo Doctor
- some older comments and generated artifacts in the repo still reference earlier plan names and flows
