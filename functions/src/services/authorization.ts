/**
 * Authorization service - Role-gating and admin action logging
 */

import * as functions from 'firebase-functions';
import { AdminRole } from '../types';
import { getDb, serverTimestamp } from '../utils/firebase';

/**
 * Extracts user role from Firebase Auth custom claims
 */
export function getUserRoleFromContext(context: any): AdminRole | null {
  return (context?.auth?.token?.role as AdminRole) ?? null;
}

/**
 * Asserts user has required role(s), throws error if not
 */
export function assertRole(context: any, allowedRoles: AdminRole[], message?: string): void {
  const role = getUserRoleFromContext(context);
  if (!role || !allowedRoles.includes(role)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      message || 'Insufficient privileges'
    );
  }
}

/**
 * Logs an admin action to the moderation log
 */
export async function logAdminAction(params: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  details?: any;
}): Promise<void> {
  const db = getDb();
  await db.collection('moderationLog').add({
    actorId: params.actorId,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    reason: params.reason || null,
    details: params.details || null,
    createdAt: serverTimestamp(),
  });
}

/**
 * Gets user's role for authorization checks
 */
export async function getUserRole(uid: string): Promise<AdminRole | null> {
  const user = await require('firebase-admin').auth().getUser(uid).catch(() => null);
  if (!user) return null;
  return (user.customClaims?.role as AdminRole) ?? null;
}
