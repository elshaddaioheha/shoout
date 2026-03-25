"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSubscriptionExpiryDate = calculateSubscriptionExpiryDate;
exports.buildMailQueuePayload = buildMailQueuePayload;
exports.invoiceStoragePath = invoiceStoragePath;
exports.firestoreExpiredSubscriptionDocPatch = firestoreExpiredSubscriptionDocPatch;
exports.firestoreExpiredUserRolePatch = firestoreExpiredUserRolePatch;
function calculateSubscriptionExpiryDate(billingCycle, from = new Date()) {
    const next = new Date(from.getTime());
    if (billingCycle === 'annual') {
        next.setFullYear(next.getFullYear() + 1);
    }
    else {
        next.setMonth(next.getMonth() + 1);
    }
    return next;
}
/** Payload shape expected by the official Trigger Email (`firestore-send-email`) extension. */
function buildMailQueuePayload(params) {
    return {
        to: [params.to],
        message: {
            subject: params.subject,
            text: params.text,
            html: params.html,
        },
    };
}
function invoiceStoragePath(userId, invoiceNumber) {
    return `invoices/${userId}/${invoiceNumber}.pdf`;
}
/** Static merge fields for `users/{uid}/subscription/current` when a paid subscription expires. */
function firestoreExpiredSubscriptionDocPatch() {
    return {
        tier: 'vault',
        status: 'expired',
        isSubscribed: false,
        billingCycle: null,
        expiresAt: null,
    };
}
/** Static merge fields on `users/{uid}` when subscription is downgraded after expiry. */
function firestoreExpiredUserRolePatch() {
    return {
        role: 'vault',
        subscriptionStatus: 'expired',
    };
}
