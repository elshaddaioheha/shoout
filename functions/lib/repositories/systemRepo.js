"use strict";
/**
 * System repository — aggregation caches and global collection-group queries.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setBestSellers = setBestSellers;
exports.setTrending = setTrending;
exports.uploadsCollectionGroup = uploadsCollectionGroup;
exports.subscriptionCollectionGroup = subscriptionCollectionGroup;
const types_1 = require("../types");
const base_1 = require("./base");
const col = () => (0, base_1.getDb)().collection(types_1.COLLECTIONS.SYSTEM);
async function setBestSellers(data) {
    await col().doc('bestSellers').set(data);
}
async function setTrending(data) {
    await col().doc('trending').set(data);
}
// ── Collection Group Queries ───────────────────────────────────────────────
function uploadsCollectionGroup() {
    return (0, base_1.getDb)().collectionGroup(types_1.COLLECTIONS.UPLOADS);
}
function subscriptionCollectionGroup() {
    return (0, base_1.getDb)().collectionGroup(types_1.COLLECTIONS.SUBSCRIPTION);
}
