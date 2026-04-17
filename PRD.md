# Shoouts PRD

This document reflects the current codebase state in `shoout/` as of April 13, 2026.

## 1. Product Summary

Shoouts is a multi-mode music product that combines:

- buyer-side marketplace discovery and checkout
- private creator storage and sharing
- seller publishing and promotion tools
- subscription-gated switches between experiences

The product is not a single linear app anymore. It is a role-aware shell that routes users into one of five plan-linked modes:

- `shoout`
- `vault`
- `vault_pro`
- `studio`
- `hybrid`

## 2. Product Surfaces In The Current App

### Buyer / Shoout mode

Current buyer-facing functionality includes:

- home feed and search
- listing detail and checkout review
- cart
- playlist and profile views
- buyer chat
- notifications
- merch browsing

This is the default free mode and the fallback when subscription verification fails.

### Vault mode

Current Vault functionality includes:

- uploads
- folders
- secure links
- file-focused updates
- track and folder detail screens
- Vault mini-player

Vault behavior is tied to feature flags and subscription verification rather than separate native builds.

### Studio mode

Current Studio functionality includes:

- upload flow
- analytics
- earnings
- payout withdrawal
- ads flow
- seller messaging
- beats store
- merch store
- settings

Studio is the seller-facing operating mode.

### Hybrid mode

Hybrid is the combined creator plan. In code, it reuses the shared tab shell and Hybrid dashboard/library components instead of living in a separate `app/hybrid/` route folder.

Current Hybrid behavior includes:

- combined access to Studio publishing and promotion
- Vault workspace access
- team-access and analytics feature flags
- elevated storage limits

### Admin surface

There is a real admin route group in the app now:

- creators
- moderation
- metrics
- payouts

## 3. Navigation Model

Navigation is built with Expo Router.

### Root routing

[`app/index.tsx`](c:/Users/HP/Desktop/Shoouts/shoout/app/index.tsx) is the splash entry screen. It resolves:

- authenticated destination
- unauthenticated destination
- motion-aware transition timing

[`app/_layout.tsx`](c:/Users/HP/Desktop/Shoouts/shoout/app/_layout.tsx) currently handles:

- font loading
- splash hide timing
- Firebase auth listener bootstrapping
- server subscription hydration
- push notification deep-link handling
- Google Sign-In configuration
- global toast rendering

### Tab shell

[`app/(tabs)/_layout.tsx`](c:/Users/HP/Desktop/Shoouts/shoout/app/(tabs)/_layout.tsx) provides:

- the bottom tab shell
- mode selector sheet
- transition overlay
- mini-player switching by mode
- hiding or showing some tabs based on current app mode

## 4. Subscription And Capability Model

The canonical client-side subscription config lives in [`utils/subscriptions.ts`](c:/Users/HP/Desktop/Shoouts/shoout/utils/subscriptions.ts).

### Current plans and pricing

- `shoout`: USD 0
- `vault`: USD 0
- `vault_pro`: USD 5.99 / month
- `studio`: USD 18.99 / month
- `hybrid`: USD 24.99 / month

### Current capability flags in code

The product currently gates:

- buying
- cart access
- marketplace messaging
- seller replies
- uploads
- Vault workspace access
- Vault link sharing
- Vault file editing
- analytics
- ads tools
- team access
- storage limits

This is the actual model used by the app today, not the older tier tables that described Vault Executive or Studio Plus variants.

## 5. Auth, Roles, And Security

### Auth source of truth

Firebase Auth remains the identity source of truth.

### Role and subscription verification

Server-verified subscription data is read from:

- `users/{uid}/subscription/current`

[`utils/subscriptionVerification.ts`](c:/Users/HP/Desktop/Shoouts/shoout/utils/subscriptionVerification.ts) currently:

- fetches the canonical subscription document
- defaults missing or expired users back to `shoout`
- updates both auth and user stores
- optionally supports custom-claims verification

### Current store split

[`store/useAuthStore.ts`](c:/Users/HP/Desktop/Shoouts/shoout/store/useAuthStore.ts):

- non-persisted
- server-verified role and subscription metadata
- auth bootstrap state

[`store/useUserStore.ts`](c:/Users/HP/Desktop/Shoouts/shoout/store/useUserStore.ts):

- persisted `activeAppMode`
- UI-facing capabilities derived from plan flags
- user display data

### Firestore security model

The rules in [`firestore.rules`](c:/Users/HP/Desktop/Shoouts/shoout/firestore.rules) currently enforce:

- restricted user field changes
- backend-only purchase writes
- paid upload gating for sellers
- owner-only access for favourites, folders, and vault shares
- read/write separation for subscription documents
- role helpers for admin, moderator, and auditor flows

## 6. Backend State

Cloud Functions are organized under `functions/src/`.

### Exported handler groups

- auth
- checkout
- subscription
- webhook
- uploads
- aggregation
- admin
- bootstrap
- migration

### Important server workflows

#### Checkout

[`functions/src/handlers/checkout.ts`](c:/Users/HP/Desktop/Shoouts/shoout/functions/src/handlers/checkout.ts) currently:

- validates auth
- recalculates totals on the server
- creates pending checkout sessions with `txRef`
- returns NGN totals for payment

#### Subscription activation

[`functions/src/handlers/subscription.ts`](c:/Users/HP/Desktop/Shoouts/shoout/functions/src/handlers/subscription.ts) currently:

- verifies bearer auth
- validates plan and billing cycle
- verifies Flutterwave transactions for paid plans
- activates the subscription through lifecycle helpers
- schedules expired-subscription downgrades

#### Webhooks

Webhook handlers verify payment callbacks and prevent client-side payment spoofing.

#### Uploads and authorization

Upload-related services and handlers enforce authenticated access and backend-controlled integrity checks.

## 7. Data Model Themes

The app currently works heavily with these user-scoped subcollections:

- `uploads`
- `folders`
- `favourites`
- `subscription`
- `notifications`
- `purchases`
- `vaultShares`
- `merch`

There are also checkout, payment, moderation, and system repositories inside the Cloud Functions layer.

## 8. Current Technical Stack

Frontend:

- Expo SDK 55
- React 19.2
- React Native 0.83
- Expo Router
- Reanimated 4
- Zustand
- Sentry

Backend:

- Firebase Functions
- Firebase Auth
- Firestore
- Firebase Storage

Payments:

- Flutterwave
- Stripe React Native is present in dependencies, but the current CI and workflow emphasis is Flutterwave

## 9. Delivery And Operations

Current automation is defined in [`deploy.yml`](c:/Users/HP/Desktop/Shoouts/shoout/.github/workflows/deploy.yml).

It includes:

- lint and type-check
- Jest coverage runs
- security checks
- EAS preview builds for pull requests
- EAS release builds for version tags
- Firebase deploys for `dev`
- Firebase deploys for `main` / `master`

## 10. Current Product Constraints

These are the important current realities in the repo:

- the pricing and plan logic in code differs from older documentation
- Hybrid is implemented through shared components and mode switching, not a standalone route tree
- buyer, Vault, Studio, and admin surfaces coexist in one app shell
- Expo Doctor is effectively clean apart from the `expo-av` maintenance warning
- some helper scripts and comments still describe older architecture language

## 11. Near-Term Documentation Truths

For future contributors, the codebase should now be understood like this:

1. Shoouts is a multi-mode subscription app, not just a marketplace.
2. Subscription state is validated from Firestore and mirrored into UI state.
3. Checkout and paid entitlements are verified server-side.
4. Vault, Studio, and Hybrid are real current experiences in the app.
5. README and PRD should track `utils/subscriptions.ts`, route files, and Cloud Function handlers when product changes land.
