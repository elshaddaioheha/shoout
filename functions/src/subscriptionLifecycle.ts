export type SubscriptionBillingCycle = 'monthly' | 'annual';

export function calculateSubscriptionExpiryDate(
  billingCycle: SubscriptionBillingCycle,
  from: Date = new Date()
): Date {
  const next = new Date(from.getTime());
  if (billingCycle === 'annual') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

/** Payload shape expected by the official Trigger Email (`firestore-send-email`) extension. */
export function buildMailQueuePayload(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): { to: string[]; message: { subject: string; text: string; html: string } } {
  return {
    to: [params.to],
    message: {
      subject: params.subject,
      text: params.text,
      html: params.html,
    },
  };
}

export function invoiceStoragePath(userId: string, invoiceNumber: string): string {
  return `invoices/${userId}/${invoiceNumber}.pdf`;
}

/** Static merge fields for `users/{uid}/subscription/current` when a paid subscription expires. */
export function firestoreExpiredSubscriptionDocPatch(): Record<string, unknown> {
  return {
    tier: 'vault',
    status: 'expired',
    isSubscribed: false,
    billingCycle: null,
    expiresAt: null,
  };
}

/** Static merge fields on `users/{uid}` when subscription is downgraded after expiry. */
export function firestoreExpiredUserRolePatch(): Record<string, unknown> {
  return {
    role: 'vault',
    subscriptionStatus: 'expired',
  };
}
