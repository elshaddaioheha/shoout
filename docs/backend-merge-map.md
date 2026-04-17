# Backend Merge Map

This maps `functions new/functions/src` into the current backend at `shoout/functions/src`.

Decisions already locked:
- Annual pricing: 12 months
- Vault storage: 0.5GB
- Hybrid vault storage: 10GB

## Directly Merge

- `handlers/bootstrap.ts`
  - Adopt as a separate handler file.
  - Keep current Shoouts bootstrap behavior and current entitlement/claim shape.

- `__tests__/guards.test.ts`
  - Adapt after subscription guard module exists.

- `__tests__/payment-integrity.test.ts`
  - Adapt after payment amount policy is reconciled to current webhook/subscription flow.

- `__tests__/pricing.test.ts`
  - Adapt to current 12-month annual pricing and current ledger-based quotas.

- `__tests__/storagePolicy.test.ts`
  - Adapt after storage policy module exists.

- `__tests__/subscriptions.test.ts`
  - Adapt after subscription module extraction.

- `__tests__/uploadGuard.test.ts`
  - Adapt to current `storageLedger` implementation.

- `__tests__/utils.test.ts`
  - Merge selectively where current utilities match.

## Merge With Adaptation

- `index.ts`
  - Add bootstrap export after creating separate handler.

- `handlers/auth.ts`
  - Remove embedded bootstrap trigger after moving it to `handlers/bootstrap.ts`.
  - Keep OTP callable functions unchanged.

- `handlers/subscription.ts`
  - Keep current implementation as canonical.
  - Borrow idempotency and processing-state handling from the cloned backend.
  - Do not adopt 10-month annual pricing logic.

- `handlers/checkout.ts`
  - Review for payment-integrity improvements only.
  - Keep current cart/session contract unless frontend changes require more.

- `handlers/uploads.ts`
  - Keep current implementation as canonical because it already supports `storageLedger`.
  - Borrow validation hardening only if it does not break vault/studio ledger routing.

- `handlers/webhook.ts`
  - Review for stronger payment integrity and audit trail handling.
  - Keep current purchase/write contract unless schema migration is planned.

- `handlers/admin.ts`
  - Merge targeted hardening and search/filter improvements only.
  - Keep current custom-claims preservation behavior.

- `handlers/aggregation.ts`
  - Review only for incremental cleanup.

- `services/pricing.ts`
  - Keep current implementation as canonical because it already writes `serviceEntitlements` and aligned custom claims.
  - Borrow validation, idempotency, and audit improvements where useful.

- `services/uploadGuard.ts`
  - Keep current implementation as canonical because it already supports separate `vault` and `studio` ledgers.
  - Borrow test patterns, not quota values.

- `services/otp.ts`
  - Review for repository extraction later.

- `services/invoicing.ts`
  - Review for receipt/invoice improvements later.

- `services/flutterwave.ts`
  - Review for verification robustness later.

- `services/authorization.ts`
  - Review for incremental cleanup later.

- `services/aggregation.ts`
  - Review for incremental cleanup later.

- `types/index.ts`
  - Keep current values for pricing and ledger quotas.
  - Borrow richer interfaces only where they do not conflict with current frontend/backend contract.

- `utils/firebase.ts`
  - Borrow helper ideas only.
  - Do not replace wholesale while current handlers are stable.

- `utils/validation.ts`
  - Merge only safe plan/payment validation improvements.

- `utils/crypto.ts`
  - Review only if test coverage shows value.

- `utils/formatting.ts`
  - Keep current unless exact helper improvements are needed.

- `subscriptionLifecycle.ts`
  - Keep current file for compatibility.
  - Borrow testable lifecycle helpers from modular version selectively.

## Defer Until After Preview Build

- `subscriptions/catalog.ts`
- `subscriptions/entitlements.ts`
- `subscriptions/guards.ts`
- `subscriptions/index.ts`
- `subscriptions/lifecycle.ts`
- `subscriptions/storagePolicy.ts`
- `repositories/base.ts`
- `repositories/checkoutRepo.ts`
- `repositories/emailRepo.ts`
- `repositories/index.ts`
- `repositories/moderationRepo.ts`
- `repositories/otpRepo.ts`
- `repositories/paymentRepo.ts`
- `repositories/storageRepo.ts`
- `repositories/systemRepo.ts`
- `repositories/transactionRepo.ts`
- `repositories/userRepo.ts`

Reason:
- These are architecture upgrades, not release blockers.
- Pulling them in now would create a large refactor across most handlers and services.
- Better done after preview deploy is working.

## Current Merge Order

1. Separate bootstrap into `handlers/bootstrap.ts`
2. Export bootstrap from `index.ts`
3. Keep current subscription/storage implementation as canonical
4. Import and adapt low-risk tests
5. Re-run build and targeted tests
6. Only then consider deeper subscription/repository extraction
