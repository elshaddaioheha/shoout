/**
 * Base repository — shared Firestore access primitives.
 * All collection access goes through repositories. No other layer touches db.collection().
 */

import * as admin from 'firebase-admin';

let _db: admin.firestore.Firestore | null = null;

export function getDb(): admin.firestore.Firestore {
  if (!_db) {
    _db = admin.firestore();
  }
  return _db;
}

export function serverTimestamp(): admin.firestore.FieldValue {
  return admin.firestore.FieldValue.serverTimestamp();
}

export function deleteField(): admin.firestore.FieldValue {
  return admin.firestore.FieldValue.delete();
}

export function timestampFromMs(ms: number): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromMillis(ms);
}

export function timestampFromDate(date: Date): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(date);
}

export function timestampNow(): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.now();
}

export function newBatch(): admin.firestore.WriteBatch {
  return getDb().batch();
}

export type DocRef = admin.firestore.DocumentReference;
export type DocSnap = admin.firestore.DocumentSnapshot;
export type Query = admin.firestore.Query;
export type WriteBatch = admin.firestore.WriteBatch;
export type Timestamp = admin.firestore.Timestamp;
