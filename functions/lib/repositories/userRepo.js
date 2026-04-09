"use strict";
/**
 * User repository — all reads/writes to users collection and subcollections.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ref = ref;
exports.getById = getById;
exports.merge = merge;
exports.query = query;
exports.subscriptionRef = subscriptionRef;
exports.getSubscription = getSubscription;
exports.uploadRef = uploadRef;
exports.getUpload = getUpload;
exports.getAllUploads = getAllUploads;
exports.uploadsCollection = uploadsCollection;
exports.purchaseRef = purchaseRef;
exports.purchasesQuery = purchasesQuery;
exports.payoutsQuery = payoutsQuery;
const types_1 = require("../types");
const base_1 = require("./base");
const col = () => (0, base_1.getDb)().collection(types_1.COLLECTIONS.USERS);
// ── User Document ──────────────────────────────────────────────────────────
function ref(userId) {
    return col().doc(userId);
}
async function getById(userId) {
    const snap = await ref(userId).get();
    return snap.exists ? snap.data() : undefined;
}
async function merge(userId, data) {
    await ref(userId).set(data, { merge: true });
}
function query() {
    return col();
}
// ── Subscription Subcollection ─────────────────────────────────────────────
function subscriptionRef(userId) {
    return ref(userId).collection(types_1.COLLECTIONS.SUBSCRIPTION).doc('current');
}
async function getSubscription(userId) {
    const snap = await subscriptionRef(userId).get();
    return snap.exists ? snap.data() : undefined;
}
// ── Uploads Subcollection ──────────────────────────────────────────────────
function uploadRef(userId, uploadId) {
    return ref(userId).collection(types_1.COLLECTIONS.UPLOADS).doc(uploadId);
}
async function getUpload(userId, uploadId) {
    const snap = await uploadRef(userId, uploadId).get();
    return snap.exists ? snap.data() : undefined;
}
async function getAllUploads(userId) {
    return ref(userId).collection(types_1.COLLECTIONS.UPLOADS).get();
}
function uploadsCollection(userId) {
    return ref(userId).collection(types_1.COLLECTIONS.UPLOADS);
}
// ── Purchases Subcollection ────────────────────────────────────────────────
function purchaseRef(userId, purchaseId) {
    return ref(userId).collection(types_1.COLLECTIONS.PURCHASES).doc(purchaseId);
}
function purchasesQuery(userId) {
    return ref(userId).collection(types_1.COLLECTIONS.PURCHASES);
}
// ── Payouts Subcollection ──────────────────────────────────────────────────
function payoutsQuery(userId) {
    return ref(userId).collection(types_1.COLLECTIONS.PAYOUTS);
}
