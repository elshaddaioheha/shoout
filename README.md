# Shoouts: Complete Technical Setup & Deployment Guide

Shoouts is an African-first mobile audio streaming and creator marketplace platform built to help artists, producers, and executives store, monetize, and share their IP securely.

## 📱 Tech Stack
- **Frontend:** Expo React Native (iOS/Android) using Expo Router
- **Global State:** Zustand (with persist middleware for cart/session data)
- **Backend:** Firebase (Cloud Functions, Firestore, Storage, Auth)
- **Payments:** Flutterwave integration
- **Deployment:** GitHub Actions CI/CD (lint, test, security, deploy) & Expo Application Services (EAS) for native builds

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Firebase CLI (`npm i -g firebase-tools`)
- Git
- EAS CLI (`npm i -g eas-cli`)

### Installation & Run

```bash
# Clone repository
git clone https://github.com/elshaddaioheha/shoout
cd shoout

# Install frontend dependencies
npm install

# Install backend dependencies
cd functions && npm install && cd ..

# Start local Expo server
npm start
```

---

## 🔐 Environment Variables & Secrets Configuration

Shoouts requires specific secrets for local development, CI/CD, and Native App Builds.

### 1. `EXPO_PUBLIC_*` Variables (Local & EAS Secrets)
These variables (Firebase keys, Flutterwave Public Key, Google OAuth IDs) configure the frontend app.
- **Local:** Define them in your `.env` file at the root.
- **EAS Build:** Expose them directly in Expo using the `eas secret:create` CLI or via the [Expo Dashboard](https://expo.dev).
- **Monitoring:** Set `EXPO_PUBLIC_SENTRY_DSN` for runtime crash/error capture.

*Warning: Never bake private backend keys into `EXPO_PUBLIC_*` variables.*

### 1b. Sentry Build Secrets (CI/EAS)
Sentry source map uploads for release builds should use private build-time secrets:
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

These should be configured as EAS/GitHub secrets, never committed in source.

### 1c. Legal URLs (App Store Readiness)
Set legal document URLs as public env variables so they are visible in-app:
- `EXPO_PUBLIC_PRIVACY_POLICY_URL`
- `EXPO_PUBLIC_TERMS_URL`

If omitted, the app falls back to `https://shoouts.com/privacy` and `https://shoouts.com/terms`.

### 1d. Push Notifications (Expo Notifications + FCM/APNs)
Push notifications are powered by Expo Notifications with Firebase Cloud Messaging (FCM) on Android and APNs on iOS.
- **Setup:** Notifications are initialized on app startup (`initNotifications()` in `app/_layout.tsx`).
- **Permissions:** The app requests notification permissions automatically on the `ios` platform; Android permissions are configured in `app.json`.
- **Deep Linking:** Push notifications can carry a `route` parameter to deep-link users into specific screens.
- **Firebase Functions:** Use `admin.messaging()` in Cloud Functions to send notifications to device tokens retrieved at login/signup.

### 2. Native App Files (`google-services.json` / `GoogleService-Info.plist`)
Native Firebase integration requires the strict configuration files to avoid runtime crashing.
- Do not commit these files to GitHub (they are specified in `.gitignore`).
- For EAS Android builds, dynamic configuration is handled in `app.config.ts` via the `GOOGLE_SERVICES_JSON` variable, and each build profile maps to its matching EAS environment in `eas.json`.
- Upload this file to Expo Secrets using:
  ```bash
  eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value google-services.json
  ```

### 3. Server-side Secrets (Firebase Functions)
These must be set securely via the Firebase CLI to be accessible strictly within Node runtime environments.
```bash
firebase functions:secrets:set FLUTTERWAVE_SECRET_KEY
firebase functions:secrets:set FLUTTERWAVE_SECRET_HASH
firebase functions:secrets:set UPLOAD_BUCKET_NAME
```

---

## 🌍 Localization & Accessibility

### Localization (i18n)
The app supports multiple languages and includes a language selector in Settings.

- **Current Support:** English (en), Spanish (es), French (fr), Portuguese (pt) — en is the default; others are placeholders.
- **Storage:** User language preference is persisted in AsyncStorage via `useLocalizationStore`.
- **Usage:** Import `useTranslation()` hook to access translated strings:
  ```tsx
  const t = useTranslation();
  const label = t('common.appName'); // Returns "Shoouts"
  ```
- **Translation Files:** Located in `utils/i18n/` (JSON format with dot-notation keys).
- **Adding New Locales:** Add a new JSON file (e.g., `utils/i18n/es.json`) and import it in `useLocalizationStore.ts`.

### Accessibility (A11y)
The app includes built-in accessibility features and settings.

- **Text Scaling:** Users can increase/decrease text size in Settings → Localization & Accessibility (small/normal/large/extra-large).
- **Motion Reduction:** Users can disable animations and transitions to reduce motion sickness.
- **High Contrast Mode:** Option to enable high-contrast colors for better visibility.
- **Screen Reader Support:** Notifications, navigation, and interactive elements include proper accessibility labels and hints.
- **Utilities:**
  - `useTextScale()` — Get current text scale multiplier to apply to font sizes.
  - `useReducedMotion()` — Check if animations should be disabled.
  - `useScreenReaderEnabled()` — Detect if screen reader is active.

---

## 🛠 Project Architecture

```
shoout/
├── .github/workflows/deploy.yml       # Production/Dev CI/CD logic
├── app/                               # Mobile App Routes (Tabs, Auth, Vault, Studio)
│   ├── (auth)/                        # Authentication flow
│   └── _layout.tsx                    # Root navigation & auth session listeners
├── components/                        # Reusable modular UI components
├── functions/                         # Cloud Functions (Webhook parsing, DB management)
├── hooks/                             # Custom React hooks
├── scripts/                           # Local database seeding scripts
├── store/                             # Zustand slice stores (Auth, Cart, User, etc.)
├── utils/                             # Error boundaries & responsive styling helpers
├── .firebaserc                        # Firebase environment routing aliases
├── app.config.ts                      # Dynamic Expo config for EAS secrets injection
├── eas.json                           # Expo Application Services profiles config
└── package.json                       # Dependencies & Jest setup mapping
```

---

## 🛡 Security & Authentication Lifecycles

### Auth Guards & Store State
Firebase Authentication dictates the single source of truth for the session.
- **Startup:** On `onAuthStateChanged`, all relevant stores (user metadata, subscriptions) are explicitly populated.
- **Logout:** Handled universally by `performLogout()`. This explicitly purges `useUserStore`, `useAuthStore`, `useCartStore`, and `useToastStore`, unmounts listeners to prevent memory leaks/race conditions, and boots the user to the guest interface cleanly.
- Firebase triggers strict authentication error toasts exclusively when an authentic user tries to access server-locked functionality (e.g., Cloud Functions).

### Subscription Verification
A user's permission (Vault, Studio, Hybrid plans) depends exclusively on the verified document at `users/{uid}/subscription/current`.
- Stores fallback to "vault" gracefully pending backend resolution.
- Firebase automatically demotes expired users seamlessly.

---

## 🚀 GitHub Actions CI/CD Pipeline

The `.github/workflows/deploy.yml` pipeline strictly enforces quality before auto-deploying to Firebase environments:

1. **lint-and-type-check**: Runs `tsc --noEmit` on Cloud functions and widespread ESLint.
2. **test**: Executes the whole Jest suite (`npm run test`) validating store state, auth rendering, UI fallbacks, and component isolation.
3. **security**: Checks `npm audit` and validates source code with `gitleaks` for any exposed private tokens.
4. **deploy-dev** (Triggers on `push` to `dev` branch): Automatically uses `FIREBASE_TOKEN_DEV` to push Functions and Firestore rules to the development project.
5. **deploy-prod** (Triggers on `push` to `master`/`main`): Extracts `proj` ID precisely via `.firebaserc` and uses a mapped GCP Service Account JSON to authorize and deploy to the explicit Production server.
6. **eas-preview-builds** (Triggers on pull requests from this repository): Starts non-blocking EAS preview builds for both Android and iOS.
7. **eas-release-builds** (Triggers on `v*` tags): Starts non-blocking EAS production builds for both Android and iOS.

*Ensure all GitHub Repository Secrets listed in `.github/workflows/deploy.yml` are accurately populated before pushing.*
*For EAS build jobs, add `EXPO_TOKEN` as a GitHub repository secret.*

---

## 📱 EAS Android Build Deployment

To trigger an Android build targeting production or preview:

1. Verify the `eas.json` `preview` or `production` profiles.
2. Confirm the file secret `GOOGLE_SERVICES_JSON` exists in your Expo Dashboard.
3. Run the non-interactive build:
```bash
eas build --platform android --profile preview --non-interactive
```
4. Access the generated APK or AAB inside your EAS Dashboard.

---

## 🐛 Common Troubleshooting

**"Authentication Error" on Upload**
If the upload function rejects requests, ensure the server-side environment `UPLOAD_BUCKET_NAME` is actually mapped inside the Firebase secrets, and `auth` is refreshing tokens synchronously before resolving Functions instances (`getIdToken(true)`).

**EAS Build Fails Missing JSON**
Double-check you are not hardcoding `GOOGLE_SERVICES_JSON` inside `eas.json` (the CLI overrides files with plain string variables if both are declared). Let `app.config.ts` dynamically assign the file location during runtime.

**Jest Expo Import Crashes**
Our `package.json` natively remaps the `expo/src/winter` polyfills and standardizes tests through `__mocks__/firebase.ts` to prevent UI native bindings from destroying Node test runs. If adding new modules (e.g., `expo-apple-authentication`), you must mock them globally first inside test setups.
