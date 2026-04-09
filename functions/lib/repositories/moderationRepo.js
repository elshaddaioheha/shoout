"use strict";
/**
 * Moderation repository — content reports, moderation log, payout ledger.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRef = reportRef;
exports.getReport = getReport;
exports.reportsQuery = reportsQuery;
exports.addLogEntry = addLogEntry;
exports.ledgerQuery = ledgerQuery;
exports.ledgerRef = ledgerRef;
exports.createLedgerEntry = createLedgerEntry;
const types_1 = require("../types");
const base_1 = require("./base");
// ── Content Reports ────────────────────────────────────────────────────────
const reports = () => (0, base_1.getDb)().collection(types_1.COLLECTIONS.CONTENT_REPORTS);
function reportRef(reportId) {
    return reports().doc(reportId);
}
async function getReport(reportId) {
    const snap = await reportRef(reportId).get();
    return { exists: snap.exists, data: snap.data(), snap };
}
function reportsQuery() {
    return reports();
}
// ── Moderation Log ─────────────────────────────────────────────────────────
const modLog = () => (0, base_1.getDb)().collection(types_1.COLLECTIONS.MODERATION_LOG);
async function addLogEntry(data) {
    await modLog().add(data);
}
// ── Payout Ledger ──────────────────────────────────────────────────────────
const ledger = () => (0, base_1.getDb)().collection(types_1.COLLECTIONS.PAYOUT_LEDGER);
function ledgerQuery() {
    return ledger();
}
function ledgerRef(entryId) {
    return entryId ? ledger().doc(entryId) : ledger().doc();
}
async function createLedgerEntry(data) {
    const docRef = ledger().doc();
    await docRef.set(data);
    return docRef.id;
}
