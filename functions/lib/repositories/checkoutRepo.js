"use strict";
/**
 * Checkout session repository.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ref = ref;
exports.getByTxRef = getByTxRef;
exports.getSnapByTxRef = getSnapByTxRef;
exports.create = create;
exports.merge = merge;
const types_1 = require("../types");
const base_1 = require("./base");
const col = () => (0, base_1.getDb)().collection(types_1.COLLECTIONS.CHECKOUT_SESSIONS);
function ref(txRef) {
    return col().doc(txRef);
}
async function getByTxRef(txRef) {
    const snap = await ref(txRef).get();
    return snap.exists ? snap.data() : undefined;
}
async function getSnapByTxRef(txRef) {
    return ref(txRef).get();
}
async function create(txRef, data) {
    await ref(txRef).set(data);
}
async function merge(txRef, data) {
    await ref(txRef).set(data, { merge: true });
}
