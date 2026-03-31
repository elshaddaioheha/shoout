"use strict";
/**
 * Firebase utilities - lazy initialization, common queries, config access
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
exports.getStorage = getStorage;
exports.getFlutterwaveSecret = getFlutterwaveSecret;
exports.getFlutterwaveSecretKey = getFlutterwaveSecretKey;
exports.getUserSubscription = getUserSubscription;
exports.getUser = getUser;
exports.getUpload = getUpload;
exports.serverTimestamp = serverTimestamp;
exports.timestampFromMs = timestampFromMs;
exports.timestampFromDate = timestampFromDate;
exports.now = now;
exports.batch = batch;
exports.userExistsInAuth = userExistsInAuth;
exports.getAuthUser = getAuthUser;
exports.getAuthUserByUid = getAuthUserByUid;
exports.getSignedUrl = getSignedUrl;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const types_1 = require("../types");
let _db = null;
let _storage = null;
/**
 * Gets or initializes the Firestore database instance
 */
function getDb() {
    if (!_db) {
        _db = admin.firestore();
    }
    return _db;
}
/**
 * Gets or initializes the Cloud Storage instance
 */
function getStorage() {
    if (!_storage) {
        _storage = admin.storage();
    }
    return _storage;
}
/**
 * Gets Flutterwave webhook secret hash from environment
 */
function getFlutterwaveSecret() {
    return types_1.FLUTTERWAVE_SECRET_HASH || functions.config()?.flutterwave?.secret_hash || '';
}
/**
 * Gets Flutterwave API secret key from environment
 */
function getFlutterwaveSecretKey() {
    return types_1.FLUTTERWAVE_SECRET_KEY || functions.config()?.flutterwave?.secret_key || '';
}
/**
 * Queries a user's current subscription
 */
async function getUserSubscription(userId) {
    const db = getDb();
    const snap = await db
        .collection('users')
        .doc(userId)
        .collection('subscription')
        .doc('current')
        .get();
    return snap.data();
}
/**
 * Fetches user document
 */
async function getUser(userId) {
    const db = getDb();
    const snap = await db.collection('users').doc(userId).get();
    return snap.data();
}
/**
 * Fetches upload document
 */
async function getUpload(uploaderId, uploadId) {
    const db = getDb();
    const snap = await db
        .collection('users')
        .doc(uploaderId)
        .collection('uploads')
        .doc(uploadId)
        .get();
    return snap.data();
}
/**
 * Creates server timestamp
 */
function serverTimestamp() {
    return admin.firestore.FieldValue.serverTimestamp();
}
/**
 * Creates Timestamp from milliseconds
 */
function timestampFromMs(ms) {
    return admin.firestore.Timestamp.fromMillis(ms);
}
/**
 * Creates Timestamp from date
 */
function timestampFromDate(date) {
    return admin.firestore.Timestamp.fromDate(date);
}
/**
 * Gets current Timestamp
 */
function now() {
    return admin.firestore.Timestamp.now();
}
/**
 * Starts a Firebase batch write
 */
function batch() {
    return getDb().batch();
}
/**
 * Checks if user exists in Firebase Auth
 */
async function userExistsInAuth(email) {
    try {
        await admin.auth().getUserByEmail(email);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Gets user record from Firebase Auth
 */
async function getAuthUser(email) {
    try {
        return await admin.auth().getUserByEmail(email);
    }
    catch {
        return null;
    }
}
/**
 * Gets Auth user by UID
 */
async function getAuthUserByUid(uid) {
    try {
        return await admin.auth().getUser(uid);
    }
    catch {
        return null;
    }
}
/**
 * Gets signed URL from Storage bucket
 */
async function getSignedUrl(filePath, expiryMs, bucketName) {
    const storage = getStorage();
    const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
    const file = bucket.file(filePath);
    const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiryMs,
    });
    return url;
}
