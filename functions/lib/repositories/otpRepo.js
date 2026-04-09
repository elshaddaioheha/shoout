"use strict";
/**
 * OTP repository — challenge and token documents.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.challengeRef = challengeRef;
exports.getChallenge = getChallenge;
exports.setChallenge = setChallenge;
exports.tokenRef = tokenRef;
exports.getToken = getToken;
exports.setToken = setToken;
exports.mergeToken = mergeToken;
const types_1 = require("../types");
const base_1 = require("./base");
// ── OTP Challenges ─────────────────────────────────────────────────────────
const challenges = () => (0, base_1.getDb)().collection(types_1.COLLECTIONS.EMAIL_OTP_CHALLENGES);
function challengeRef(docId) {
    return challenges().doc(docId);
}
async function getChallenge(docId) {
    const snap = await challengeRef(docId).get();
    return { exists: snap.exists, data: snap.data() };
}
async function setChallenge(docId, data) {
    await challengeRef(docId).set(data, { merge: true });
}
// ── OTP Tokens ─────────────────────────────────────────────────────────────
const tokens = () => (0, base_1.getDb)().collection(types_1.COLLECTIONS.EMAIL_OTP_TOKENS);
function tokenRef(tokenId) {
    return tokens().doc(tokenId);
}
async function getToken(tokenId) {
    const snap = await tokenRef(tokenId).get();
    return { exists: snap.exists, data: snap.data() };
}
async function setToken(tokenId, data) {
    await tokenRef(tokenId).set(data);
}
async function mergeToken(tokenId, data) {
    await tokenRef(tokenId).set(data, { merge: true });
}
