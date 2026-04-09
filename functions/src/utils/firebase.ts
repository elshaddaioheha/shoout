/**
 * Firebase Auth utilities.
 *
 * All Firestore and Storage access has moved to the repositories layer.
 * This file only keeps Firebase Auth helpers used by handlers/services.
 */

import * as admin from 'firebase-admin';

export async function userExistsInAuth(email: string): Promise<boolean> {
  try {
    await admin.auth().getUserByEmail(email);
    return true;
  } catch {
    return false;
  }
}

export async function getAuthUser(email: string): Promise<admin.auth.UserRecord | null> {
  try {
    return await admin.auth().getUserByEmail(email);
  } catch {
    return null;
  }
}

export async function getAuthUserByUid(uid: string): Promise<admin.auth.UserRecord | null> {
  try {
    return await admin.auth().getUser(uid);
  } catch {
    return null;
  }
}
