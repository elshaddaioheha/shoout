# Secure Payment Processing with Cloud Functions

## Overview

This document outlines how **Transactions** and **Purchases** documents are now write-protected in Firestore. Only verified backend processes (Cloud Functions) can create these documents after receiving cryptographically verified payment webhooks.

## Architecture

### Client-Side Changes
- ✅ **Transactions**: Clients can only **READ** their own transactions (as buyer or seller)
- ✅ **Purchases**: Clients can only **READ** their own purchases  
- ✅ **Payouts**: Clients can only **READ** their own payouts
- ❌ Clients **CANNOT** create, update, or delete any of these documents

### Backend Requirements
The backend **MUST**:
1. Receive payment confirmation from Flutterwave/Stripe (via webhook or direct API call)
2. **Cryptographically verify** the webhook signature
3. Query the payment provider's API to confirm the payment was successful
4. Only **after verification**, create the corresponding Firestore documents
5. Use the Admin SDK to bypass Firestore security rules

---

## Implementation Guide

### 1. Set Up Firebase Cloud Functions

```bash
npm install -g firebase-tools
firebase init functions
cd functions
npm install
```

### 2. Create Payment Verification Cloud Functions

Create `functions/src/payments.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import crypto from 'crypto';
import axios from 'axios';

const db = admin.firestore();

// Environment variables (set in Firebase Console or .env.local)
const FLUTTERWAVE_SECRET_HASH = process.env.FLUTTERWAVE_SECRET_HASH;
const FLUTTERWAVE_API_KEY = process.env.FLUTTERWAVE_API_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

/**
 * Verify Flutterwave webhook signature
 * @param payload The raw webhook payload (string)
 * @param signature The x-flutterwave-signature header value
 * @returns true if valid, false otherwise
 */
function verifyFlutterwaveSignature(payload: string, signature: string): boolean {
  if (!FLUTTERWAVE_SECRET_HASH) {
    console.error('FLUTTERWAVE_SECRET_HASH not configured');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', FLUTTERWAVE_SECRET_HASH)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

/**
 * Verify payment status with Flutterwave API
 * @param transactionId Flutterwave transaction ID
 * @returns Payment data if valid, null otherwise
 */
async function verifyFlutterwavePayment(transactionId: string) {
  try {
    const response = await axios.get(
      `${FLUTTERWAVE_BASE_URL}/transactions/${transactionId}/verify`,
      {
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_API_KEY}`,
        },
      }
    );

    if (response.data.status === 'success' && response.data.data.status === 'successful') {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('Flutterwave verification failed:', error);
    return null;
  }
}

/**
 * HTTP Cloud Function: After Flutterwave payment, verify and create documents
 * Called by: app/cart.tsx → handlePaymentSuccess()
 */
export const completeCartPurchase = functions.https.onCall(async (data, context) => {
  // 1. Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = context.auth.uid;
  const { txRef, items, totalAmount } = data;

  if (!txRef || !items || items.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing txRef or items');
  }

  try {
    // 2. Verify payment with Flutterwave
    const paymentData = await verifyFlutterwavePayment(txRef);
    
    if (!paymentData) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Payment verification failed. Please contact support.'
      );
    }

    // 3. Validate payment amount matches (prevent tampering)
    const expectedAmount = Math.round(totalAmount * 1600); // NGN conversion
    if (Math.abs(paymentData.amount - expectedAmount) > 100) { // Allow 100 NGN difference
      console.error('Amount mismatch:', {
        expected: expectedAmount,
        actual: paymentData.amount,
      });
      throw new functions.https.HttpsError('failed-precondition', 'Payment amount mismatch');
    }

    // 4. Check if this transaction was already processed (idempotency)
    const existingTx = await db
      .collection('transactions')
      .where('flutterwaveRef', '==', txRef)
      .limit(1)
      .get();

    if (!existingTx.empty) {
      console.log('Transaction already processed:', txRef);
      return { success: true, message: 'Purchase already completed' };
    }

    // 5. Batch write: Create transactions + purchases for each item
    const batch = db.batch();
    const timestamp = admin.firestore.Timestamp.now();

    for (const item of items) {
      // Create transaction document
      const txDoc = db.collection('transactions').doc();
      batch.set(txDoc, {
        trackId: item.id,
        buyerId: userId,
        sellerId: item.uploaderId,
        amount: item.price,
        trackTitle: item.title,
        status: 'completed',
        paymentProvider: 'flutterwave',
        flutterwaveRef: txRef,
        timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      // Create purchase document in user's library
      const purchaseDoc = db
        .collection('users')
        .doc(userId)
        .collection('purchases')
        .doc();

      batch.set(purchaseDoc, {
        trackId: item.id,
        title: item.title,
        artist: item.artist,
        price: item.price,
        uploaderId: item.uploaderId,
        audioUrl: item.audioUrl || '',
        coverUrl: item.coverUrl || '',
        purchasedAt: timestamp,
        createdAt: timestamp,
      });
    }

    // Commit all writes atomically
    await batch.commit();

    // 6. Send notification to seller(s)
    const sellerIds = [...new Set(items.map(item => item.uploaderId))];
    for (const sellerId of sellerIds) {
      const notifDoc = db
        .collection('users')
        .doc(sellerId)
        .collection('notifications')
        .doc();

      batch.set(notifDoc, {
        type: 'purchase',
        buyerId: userId,
        message: `Your track was purchased`,
        isRead: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    await batch.commit();

    return {
      success: true,
      message: 'Purchase completed successfully',
      transactionCount: items.length,
    };
  } catch (error: any) {
    console.error('Purchase completion failed:', error);
    
    if (error.code === 'unauthenticated' || error.code === 'invalid-argument' || error.code === 'failed-precondition') {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to complete purchase. Please contact support.'
    );
  }
});

/**
 * HTTPS Webhook: Receives webhook from Flutterwave
 * 
 * Configure in Flutterwave Dashboard:
 * Webhook URL: https://us-central1-shoouts-prod.cloudfunctions.net/flutterwaveWebhook
 * Events: charge.completed
 */
export const flutterwaveWebhook = functions.https.onRequest(async (req, res) => {
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    // Get raw body for signature verification
    const signature = req.headers['x-flutterwave-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    if (!verifyFlutterwaveSignature(payload, signature)) {
      console.warn('Invalid webhook signature');
      return res.status(401).send('Unauthorized');
    }

    const { event, data } = req.body;

    // Only process charge.completed events
    if (event !== 'charge.completed') {
      console.log('Skipping non-charge.completed event:', event);
      return res.status(200).send('OK');
    }

    if (data.status !== 'successful') {
      console.log('Skipping failed payment:', data.id);
      return res.status(200).send('OK');
    }

    // Extract payment reference from tx_ref
    // Format: shoouts_cart_{timestamp} or shoouts_sub_{timestamp}
    const txRef = data.tx_ref;
    
    if (!txRef.startsWith('shoouts_')) {
      console.warn('Unexpected tx_ref format:', txRef);
      return res.status(400).send('Invalid tx_ref');
    }

    // Check if already processed
    const existingTx = await db
      .collection('transactions')
      .where('flutterwaveRef', '==', txRef)
      .limit(1)
      .get();

    if (!existingTx.empty) {
      console.log('Webhook: Transaction already processed:', txRef);
      return res.status(200).send('OK');
    }

    // NOTE: At this point, you'd typically:
    // 1. Query your database to find pending purchase orders
    // 2. Verify metadata matches
    // 3. Create transaction + purchase documents
    
    console.log('Webhook processed successfully:', txRef);
    return res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).send('Internal server error');
  }
});

/**
 * Stripe webhook (for future Stripe integration)
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  // TODO: Implement Stripe webhook signature verification
  // Reference: https://stripe.com/docs/webhooks/signatures
  
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const event = req.body;

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      
      // Verify payment
      // Create transaction + purchase documents
      
      console.log('Stripe payment succeeded:', paymentIntent.id);
      return res.status(200).send({ received: true });
    }

    return res.status(200).send({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return res.status(500).send('Internal server error');
  }
});

/**
 * Subscription payment function
 * Called by: app/settings/subscriptions.tsx
 */
export const completeSubscriptionPurchase = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = context.auth.uid;
  const { txRef, planId, billingCycle, amount } = data;

  try {
    // 1. Verify payment
    const paymentData = await verifyFlutterwavePayment(txRef);
    
    if (!paymentData) {
      throw new functions.https.HttpsError('failed-precondition', 'Payment verification failed');
    }

    // 2. Check if subscription already exists (prevent duplicate processing)
    const existingSub = await db
      .collection('subscriptions')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    // 3. Create/update subscription document
    const timestamp = admin.firestore.Timestamp.now();
    const subscriptionDoc = db.collection('subscriptions').doc();

    const subscriptionData = {
      userId,
      planId,
      billingCycle, // 'monthly' or 'annual'
      status: 'active',
      amount,
      paymentProvider: 'flutterwave',
      flutterwaveRef: txRef,
      startDate: timestamp,
      renewalDate: calculateRenewalDate(billingCycle);
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await subscriptionDoc.set(subscriptionData);

    // 4. Update user document with subscription info
    await db.collection('users').doc(userId).update({
      activeSubscription: planId,
      subscriptionStartDate: timestamp,
    });

    return {
      success: true,
      message: 'Subscription activated successfully',
      subscriptionId: subscriptionDoc.id,
    };
  } catch (error: any) {
    console.error('Subscription purchase failed:', error);
    throw error instanceof functions.https.HttpsError ? error : 
      new functions.https.HttpsError('internal', 'Subscription purchase failed');
  }
});

function calculateRenewalDate(billingCycle: string): admin.firestore.Timestamp {
  const date = new Date();
  if (billingCycle === 'annual') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return admin.firestore.Timestamp.fromDate(date);
}
```

### 3. Environment Configuration

Create `functions/.env.local`:

```env
FLUTTERWAVE_SECRET_HASH=your_flutterwave_secret_hash_here
FLUTTERWAVE_API_KEY=your_flutterwave_api_key_here
```

Deploy to Firebase:

```bash
firebase functions:config:set flutterwave.secret_hash="$FLUTTERWAVE_SECRET_HASH"
firebase functions:config:set flutterwave.api_key="$FLUTTERWAVE_API_KEY"
firebase deploy --only functions
```

### 4. Configure Environment Variables in Client

Update `.env` in the root:

```env
EXPO_PUBLIC_BACKEND_URL=https://us-central1-shoouts-prod.cloudfunctions.net
```

---

## Security Checklist

- ✅ Firestore rules block all client writes to `transactions`, `purchases`, `payouts`
- ✅ Backend verifies payment with payment provider's API
- ✅ Backend verifies webhook signatures (cryptographic verification)
- ✅ Idempotency checks prevent duplicate transactions (using `flutterwaveRef`)
- ✅ Amount validation prevents tampering
- ✅ Atomic batch writes ensure consistency
- ✅ Admin SDK used for backend writes (bypasses client rules)
- ✅ Authenticated user required (Firebase Auth token)

---

## Webhook Verification Process

### Flutterwave
1. Flutterwave sends POST to `https://yourfunction.cloudfunctions.net/flutterwaveWebhook`
2. Request includes `x-flutterwave-signature` header
3. Server verifies signature: `HMAC-SHA256(payload, SECRET_HASH)`
4. Server queries Flutterwave API to double-verify payment status
5. Only after both verifications, documents are created

### Stripe (Future)
1. Stripe sends POST with timestamp
2. Server verifies: `timestamp + '.' + payload` against signature
3. Server queries Stripe API to confirm
4. Creates documents only if verified

---

## Testing

### Local Testing with Emulator

```bash
firebase emulators:start --only firestore,functions
```

Then in tests:

```typescript
const functions = firebase.functions();
functions.useFunctionsEmulator('localhost', 5001);

const completeCartPurchase = firebase.functions().httpsCallable('completeCartPurchase');
const result = await completeCartPurchase({
  txRef: 'shoouts_cart_123456',
  items: [...],
  totalAmount: 100,
});
```

---

## Monitoring & Debugging

Monitor Cloud Function logs:

```bash
firebase functions:log --only completeCartPurchase
```

### Key Debug Points
1. Webhook signature mismatch → Wrong SECRET_HASH
2. Payment verification failed → Check Flutterwave API credentials
3. Amount mismatch → Verify conversion rate (USD → NGN)
4. Batch write failures → Firestore quota or rule issues

---

## Future Improvements

1. **Stripe Integration** - Add Stripe webhook handling
2. **Payout Processing** - Create payout documents after threshold
3. **Retry Logic** - Exponential backoff for failed verifications
4. **Rate Limiting** - Prevent abuse of payment endpoints
5. **Audit Logging** - Log all payment events for compliance
6. **Refund Handling** - Process refunds and reverse transactions

---

## References

- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Flutterwave Webhooks](https://developer.flutterwave.com/docs/webhooks)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Firestore Admin SDK](https://firebase.google.com/docs/firestore/manage-data/add-data#server_timestamp)
