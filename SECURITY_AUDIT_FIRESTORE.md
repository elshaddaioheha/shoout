# Firestore Security Audit (Noob-Friendly)

Date: 2026-03-29
Scope: `firestore.rules` (primary), plus a quick cross-check of `storage.rules`.

## TL;DR
Your rules have **good protection for money-critical data** (transactions, payouts, purchases are backend-only), but there are a few **important gaps** that could let users write data they should not write.

## Risk Summary

### High risk
1. **Users can create their own user doc with privileged-looking fields on first write**
   - `users/{uid}` create only checks `role`, but does not block fields like `isPremium`, `canSell`, `actualRole`, etc.
   - A malicious client could set these values during account bootstrap.
   - Even if backend ignores them, this can still create trust bugs in app logic/UI.

2. **Chat message create does not verify sender is chat participant**
   - In `/chats/{chatId}/messages/{messageId}`, `create` checks `senderId == auth.uid` and non-empty text, but does not check membership in chat participants.
   - This could allow posting into chats the user does not belong to.

### Medium risk
3. **Write validation is too loose in several collections**
   - Many `create/update` rules verify only 1-2 fields (e.g., `title`, `price`) and leave all other fields unconstrained.
   - Attackers can add extra fields that may be trusted by client code later.

4. **Subscription client writes allow selecting paid tiers in unpaid mode**
   - You prevent `isSubscribed == true`, which is good.
   - But clients can still set `tier` to `studio`/`hybrid` while unpaid. If any app path checks tier without checking subscription status, behavior can drift.

### Low risk / hardening
5. **Public-to-all-authenticated reads are broad**
   - Authenticated reads for uploads/merch/system metadata may be intended.
   - Confirm this is business-intended and not accidental overexposure.

## What you did well
- Backend-only write model for purchases, transactions, payouts, moderation logs is strong.
- Explicit deny-by-default style with backend-only helper and final deny blocks (in storage rules) is good.
- Role helper functions rely on auth token claims rather than mutable Firestore profile fields.

## Noob explanation (what’s happening)
Think of Firestore rules as a **bouncer at a club**:
- If your app asks to read/write data, the bouncer checks these rules.
- If request matches an `allow` condition, it passes.
- If not, it is denied.

In your case:
- For money stuff, bouncer says “clients cannot write here, only trusted backend.” ✅
- For some user-generated stuff (profiles/messages/uploads), bouncer is a bit too trusting and does not fully inspect every field. ⚠️

So the likely issue you’re feeling is:
- Some writes are denied unexpectedly due to strict ownership checks, **or**
- Some writes pass but later create weird app state because extra fields were not blocked.

## Recommended fixes (priority order)

1. **Lock user document create schema**
   - On `users/{uid}` create, explicitly allow-list keys with `request.resource.data.keys().hasOnly([...])`.
   - Forbid sensitive keys on create, not only update.

2. **Fix message create authorization**
   - Require sender to be a participant:
     - either check `request.auth.uid in get(chatDoc).data.participants`
     - and also `request.resource.data.senderId == request.auth.uid`.

3. **Add allow-list schema validation in high-traffic writes**
   - `users/{uid}/uploads`, `notifications`, `campaigns`, etc.
   - Validate types and bounds for each expected field.

4. **Tighten subscription writes**
   - For client writes, consider restricting tier to `vault` only.
   - Let backend promote to paid tiers after verified payment.

5. **Add automated rule tests in Emulator Suite**
   - Use unit tests for allow/deny cases so future edits don’t reopen holes.

## Suggested first test cases
- User tries to create own profile with `{isPremium: true}` → should deny.
- Non-participant tries to post in existing chat → should deny.
- User tries to set upload price > 0 without active paid subscription → should deny.
- Client tries to create transaction/payout/purchase docs → should deny.

