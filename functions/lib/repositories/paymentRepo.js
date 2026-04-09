"use strict";
/**
 * Subscription payment repository.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ref = ref;
exports.getByTxRef = getByTxRef;
exports.merge = merge;
const types_1 = require("../types");
const base_1 = require("./base");
const col = () => (0, base_1.getDb)().collection(types_1.COLLECTIONS.SUBSCRIPTION_PAYMENTS);
function ref(txRef) {
    return col().doc(txRef);
}
async function getByTxRef(txRef) {
    const snap = await ref(txRef).get();
    return snap.exists ? snap.data() : undefined;
}
async function merge(txRef, data) {
    await ref(txRef).set(data, { merge: true });
}
