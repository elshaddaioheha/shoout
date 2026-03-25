# SHOOUTS – TECHNICAL & PRODUCT REQUIREMENTS DOCUMENT (PRD)
*(Reflecting Latest State of Codebase, Infrastructure & CI/CD)*

## 1. What Shoouts Is (High-Level)
Shoouts is an African-first digital music platform that securely blends:
- **A music IP marketplace** (buying & selling components, verses, and beats).
- **A private, creative vault storage system.**
- **Localized African payments** backed by Stripe / Flutterwave Webhooks.
- **Creator-focused monetization tools.**

The platform offers the infrastructure to monetize, protect, and share intellectual property through role-based dynamic user interfaces—shifting complexity away from Western-centric ecosystems.

---

## 2. Core Product Architecture (3-Mode System)

### A. Shoouts Vault (Storage Mode)
**Purpose:** Trust, privacy, creative retention.
**Key functions:**
- Secure encrypted file upload (`processAudioUpload`).
- Private and shareable download links dynamically signed for short expiration.
- Folder-based organization with hierarchical routing.
- Strict read/write Firestore security based completely on verified Firebase `uid`.

### B. Shoouts Studio (Marketplace Mode)
**Purpose:** Monetization & B2B/B2C Checkout.
**Key functions:**
- Upload tracks/beats and configure licenses & prices.
- Seamless checkouts orchestrated via API (`createCheckoutSession`) with automatic atomic atomic updates.
- Listener tracking and deep unified buyer-seller chat integrations.

### C. Shoouts Hybrid Creator Mode (Premium)
**Purpose:** ARPU and Professional Lifecycle Management.
**Key functions:**
- A blended UI (`app/hybrid/`) converging the Vault’s storage simplicity with the Studio’s commercial visibility.
- Sell directly from Vaulted raw files.
- Advanced analytics visibility over marketplace transactions.

---

## 3. Engineering State & Core Infrastructure (What We've Built)

### Frontend Layer (Expo / React Native)
- **Expo Router:** Statically typed, path-based implicit navigation rendering exact states (auth routing).
- **State Management:** Widespread Zustand utilization (`useAuthStore`, `useUserStore`, `useCartStore`, `useToastStore`). The global stores heavily depend on hydration strictly tied to Firebase `onAuthStateChanged`.
- **UI Components:** Widespread usage of Reanimated, isolated atomic components, Lucide SDK icon packs, and responsive hooks supporting hybrid web scaling.

### Authentication & Lifecycle Guard
- **Firebase Auth as the Ground Truth**: Stores completely defer `tier` mapping and identity logic to Firebase backend validation. Explicit logout procedures globally wipe stores, purge listeners, and revoke states instantaneously to prevent local session leakage.
- **Role Hydration**: User credentials strictly enforce their status (Vault vs Hybrid vs Studio) based on continuous validation synced against `users/${uid}/subscription/current`.

### Backend Layer (Firebase Cloud Functions)
- **Data Execution:** All backend functions restrict read/writes conditionally. Transaction workflows guarantee atomicity inside `.ts` generated blocks triggered via Firebase HTTP Requests/Webhooks.
- **Monetization Engine (Flutterwave):** Validates precise `FLUTTERWAVE_SECRET_HASH` signatures and executes backend-locked transaction write sequences to prevent client spoofing.
- **Token Freshness:** All heavy file interactions force client-side ID Token refreshes dynamically (`getIdToken(true)`) dodging opaque server rejection scenarios.

---

## 4. Environment & Deployment (CI/CD)

The application relies strictly on rigorous automation via GitHub Actions (`deploy.yml`) managing the full path from developer testing to Production Firebase/Android rollouts.

### Environments & Secrets Protocol
1. **GitHub Deployments (`deploy-dev`, `deploy-prod`)**: 
   - Depends meticulously on mapped repository secrets (Dev tokens vs Prod Service Accounts encoded in `json`).
   - Dynamically parses `.firebaserc` definitions inside the runtime Ubuntu environment.
2. **EAS Android Build Pipeline**: 
   - Employs dynamic `app.config.ts` mapping. 
   - Prohibits hardcoding native `google-services.json` arrays inside `eas.json` (as `env` strings overrule file streams).
   - Secures sensitive config via `eas secret:create` exclusively pulling securely verified files at runtime.

### Testing & Validation Gates (Jest + NPM Audit)
- All merges are restricted by the `lint-and-type-check` logic (firing ESLint and `tsc` over Cloud Functions) alongside a comprehensive suite handling complex `react-test-renderer` mock environments shielding native `expo-apple-authentication` and router trees from tearing down `Node` modules. Node 20 architecture.

---

## 5. Monetization Logic & Pricing Tables 

*Currency: USD equivalent (supports local processing endpoints like NGN/GHS).*

### Studio Mode (Sellers)
- **Studio Free ($0):** Limited listings, basic analytics, 10% tx fee.
- **Studio Pro ($18.99):** Unlimited listings, customizable pricing & licensing control, chat support.
- **Studio Plus ($69.99):** Absolute marketplace priority boosting, full payouts access.

### Vault Mode (Storage/Execs)
- **Vault Free ($0):** 50 MB, strictly internal hosting.
- **Vault Creator ($5):** 500 MB capacity, shareable secure link deployment.
- **Vault Pro ($10):** 1 GB capacity, file permission locking (view vs download).
- **Vault Executive ($18):** 5 GB capacity with advanced listener tracking and collaborative team layers.

### Hybrid Creator Mode
- **Hybrid Creator ($15) / Executive ($25):** Complete convergence. Access to 5–10 GB Vault environments mapped directly to the active Marketplace API allowing direct raw file commercialization, prioritized rankings, and reduced workflow friction.

---

## 6. Success Metrics & Future Roadmap Architecture

### Active Goals
- Stable Cloud Function health post-deployment webhooks.
- Paid conversion pipeline retention measuring exactly how many `vault` accounts successfully transition and execute `studio` transactions natively on devices.
- Maintaining flawless `Upload -> Watermark (HLS Transcoding) -> Encrypted Stream` velocity.

### Next Technical Phases
1. Native push notification infrastructure mapping.
2. Advanced Analytics dashboard scaling mapping user streams across components.
3. Expanded API endpoints managing complex B2B label/team access accounts natively.

*Shoouts explicitly monetizes creators through subscriptions and B2B transactions, deploying Hybrid workflow logic to dictate scalable long-term revenue mechanics.*