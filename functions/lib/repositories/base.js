"use strict";
/**
 * Base repository — shared Firestore access primitives.
 * All collection access goes through repositories. No other layer touches db.collection().
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.serverTimestamp = serverTimestamp;
exports.deleteField = deleteField;
exports.timestampFromMs = timestampFromMs;
exports.timestampFromDate = timestampFromDate;
exports.timestampNow = timestampNow;
exports.newBatch = newBatch;
const admin = __importStar(require("firebase-admin"));
let _db = null;
function getDb() {
    if (!_db) {
        _db = admin.firestore();
    }
    return _db;
}
function serverTimestamp() {
    return admin.firestore.FieldValue.serverTimestamp();
}
function deleteField() {
    return admin.firestore.FieldValue.delete();
}
function timestampFromMs(ms) {
    return admin.firestore.Timestamp.fromMillis(ms);
}
function timestampFromDate(date) {
    return admin.firestore.Timestamp.fromDate(date);
}
function timestampNow() {
    return admin.firestore.Timestamp.now();
}
function newBatch() {
    return getDb().batch();
}
