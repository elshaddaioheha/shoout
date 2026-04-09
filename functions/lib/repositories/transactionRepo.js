"use strict";
/**
 * Transaction repository — marketplace purchase records.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ref = ref;
exports.query = query;
const types_1 = require("../types");
const base_1 = require("./base");
const col = () => (0, base_1.getDb)().collection(types_1.COLLECTIONS.TRANSACTIONS);
function ref(txnId) {
    return col().doc(txnId);
}
function query() {
    return col();
}
