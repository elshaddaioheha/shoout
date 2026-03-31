/**
 * Firebase utilities - lazy initialization, common queries, config access
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { FLUTTERWAVE_SECRET_HASH, FLUTTERWAVE_SECRET_KEY } from '../types';

let _db: admin.firestore.Firestore | null = null;
let _storage: admin.storage.Storage | null = null;

/**
 * Gets or initializes the Firestore database instance
 */
export function getDb(): admin.firestore.Firestore {
  if (!_db) {
    _db = admin.firestore();
  }
  return _db;
}

/**
 * Gets or initializes the Cloud Storage instance
 */
export function getStorage(): admin.storage.Storage {
  if (!_storage) {
    _storage = admin.storage();
  }
  return _storage;
}

/**
 * Gets Flutterwave webhook secret hash from environment
 */
export function getFlutterwaveSecret(): string {
  return FLUTTERWAVE_SECRET_HASH || functions.config()?.flutterwave?.secret_hash || '';
}

/**
 * Gets Flutterwave API secret key from environment
 */
export function getFlutterwaveSecretKey(): string {
  return FLUTTERWAVE_SECRET_KEY || functions.config()?.flutterwave?.secret_key || '';
}

/**
 * Queries a user's current subscription
 */
export async function getUserSubscription(
  userId: string
): Promise<admin.firestore.DocumentData | undefined> {
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
export async function getUser(userId: string): Promise<admin.firestore.DocumentData | undefined> {
  const db = getDb();
  const snap = await db.collection('users').doc(userId).get();
  return snap.data();
}

/**
 * Fetches upload document
 */
export async function getUpload(
  uploaderId: string,
  uploadId: string
): Promise<admin.firestore.DocumentData | undefined> {
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
export function serverTimestamp(): admin.firestore.FieldValue {
  return admin.firestore.FieldValue.serverTimestamp();
}

/**
 * Creates Timestamp from milliseconds
 */
export function timestampFromMs(ms: number): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromMillis(ms);
}

/**
 * Creates Timestamp from date
 */
export function timestampFromDate(date: Date): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(date);
}

/**
 * Gets current Timestamp
 */
export function now(): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.now();
}

/**
 * Starts a Firebase batch write
 */
export function batch(): admin.firestore.WriteBatch {
  return getDb().batch();
}

/**
 * Checks if user exists in Firebase Auth
 */
export async function userExistsInAuth(email: string): Promise<boolean> {
  try {
    await admin.auth().getUserByEmail(email);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets user record from Firebase Auth
 */
export async function getAuthUser(email: string): Promise<admin.auth.UserRecord | null> {
  try {
    return await admin.auth().getUserByEmail(email);
  } catch {
    return null;
  }
}

/**
 * Gets Auth user by UID
 */
export async function getAuthUserByUid(uid: string): Promise<admin.auth.UserRecord | null> {
  try {
    return await admin.auth().getUser(uid);
  } catch {
    return null;
  }
}

/**
 * Gets signed URL from Storage bucket
 */
export async function getSignedUrl(
  filePath: string,
  expiryMs: number,
  bucketName?: string
): Promise<string> {
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
