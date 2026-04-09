/**
 * Authorization service - Role-gating and admin action logging
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { AdminRole } from '../types';
import { moderationRepo, serverTimestamp } from '../repositories';

export function getUserRoleFromContext(context: any): AdminRole | null {
  return (context?.auth?.token?.role as AdminRole) ?? null;
}

export function assertRole(context: any, allowedRoles: AdminRole[], message?: string): void {
  const role = getUserRoleFromContext(context);
  if (!role || !allowedRoles.includes(role)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      message || 'Insufficient privileges'
    );
  }
}

export async function logAdminAction(params: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  details?: any;
}): Promise<void> {
  await moderationRepo.addLogEntry({
    actorId: params.actorId,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    reason: params.reason || null,
    details: params.details || null,
    createdAt: serverTimestamp(),
  });
}

export async function getUserRole(uid: string): Promise<AdminRole | null> {
  const user = await admin.auth().getUser(uid).catch(() => null);
  if (!user) return null;
  return (user.customClaims?.role as AdminRole) ?? null;
}
