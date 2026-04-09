/**
 * Admin handlers - Content moderation, role management, compliance, and payouts
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as authorization from '../services/authorization';
import * as payouts from '../services/payouts';
import { AdminRole, SUSPENSION_DURATION_MS } from '../types';
import {
  userRepo,
  transactionRepo,
  moderationRepo,
  systemRepo,
  serverTimestamp,
  newBatch,
  timestampFromMs,
  deleteField,
} from '../repositories';
import { calculatePlatformFee } from '../utils/formatting';

export const adminGetModerationQueue = functions.https.onCall(async (data: any, context: any) => {
  authorization.assertRole(context, ['admin', 'moderator']);

  const filters = data?.filters ?? {};
  const limit = Math.min(Number(data?.limit) || 25, 100);

  let query = moderationRepo.reportsQuery().where('status', '==', 'pending') as admin.firestore.Query;

  if (filters.type) query = query.where('type', '==', String(filters.type));
  if (filters.reporterId) query = query.where('reporterId', '==', String(filters.reporterId));
  if (filters.uploaderId) query = query.where('uploaderId', '==', String(filters.uploaderId));
  if (filters.trackId) query = query.where('trackId', '==', String(filters.trackId));

  if (filters.startAt || filters.endAt) {
    if (filters.startAt) query = query.where('createdAt', '>=', timestampFromMs(Number(filters.startAt)));
    if (filters.endAt) query = query.where('createdAt', '<=', timestampFromMs(Number(filters.endAt)));
  }

  query = query.orderBy('createdAt', 'desc').limit(limit);

  if (data?.cursorId) {
    const { snap: cursorDoc } = await moderationRepo.getReport(String(data.cursorId));
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.get();
  const reports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const nextCursorId = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : null;

  return { reports, nextCursorId };
});

export const adminReviewReport = functions.https.onCall(async (data: any, context: any) => {
  authorization.assertRole(context, ['admin', 'moderator']);

  const reportId = String(data?.reportId || '');
  const decision = String(data?.decision || '').toLowerCase();
  const notes = String(data?.notes || '');

  if (!reportId) throw new functions.https.HttpsError('invalid-argument', 'reportId is required');
  if (!['dismiss', 'uphold', 'escalate'].includes(decision)) {
    throw new functions.https.HttpsError('invalid-argument', 'decision must be one of dismiss|uphold|escalate');
  }

  const { exists, data: report, snap } = await moderationRepo.getReport(reportId);
  if (!exists) throw new functions.https.HttpsError('not-found', 'Report not found');

  const r = report as Record<string, any>;
  const now = serverTimestamp();
  const batchWrite = newBatch();

  batchWrite.update(moderationRepo.reportRef(reportId), {
    status: 'resolved',
    resolution: decision,
    resolvedAt: now,
    resolvedBy: context.auth.uid,
    decisionNotes: notes || null,
  });

  if (decision === 'uphold' && r.trackId && r.uploaderId) {
    batchWrite.set(
      userRepo.uploadRef(r.uploaderId, r.trackId),
      { isRemoved: true, removedAt: now },
      { merge: true }
    );
    batchWrite.set(
      userRepo.ref(r.uploaderId),
      { suspendedUntil: timestampFromMs(Date.now() + SUSPENSION_DURATION_MS) },
      { merge: true }
    );
  }

  await batchWrite.commit();

  await authorization.logAdminAction({
    actorId: context.auth.uid,
    action: 'review_report',
    targetType: 'contentReport',
    targetId: reportId,
    reason: notes,
    details: { decision, report: r },
  });

  return { success: true };
});

export const adminReviewReportsBatch = functions.https.onCall(async (data: any, context: any) => {
  authorization.assertRole(context, ['admin', 'moderator']);

  const reportIds = (data?.reportIds as string[]) || [];
  const decision = String(data?.decision || '').toLowerCase();
  const reason = String(data?.reason || '');

  if (!Array.isArray(reportIds) || reportIds.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'reportIds must be a non-empty array');
  }
  if (!['dismiss', 'uphold', 'escalate'].includes(decision)) {
    throw new functions.https.HttpsError('invalid-argument', 'decision must be one of dismiss|uphold|escalate');
  }

  const now = serverTimestamp();
  const batchWrite = newBatch();
  let processedCount = 0;

  for (const reportId of reportIds) {
    const { exists, data: report } = await moderationRepo.getReport(reportId);
    if (!exists) continue;

    const r = report as Record<string, any>;

    batchWrite.update(moderationRepo.reportRef(reportId), {
      status: 'resolved',
      resolution: decision,
      resolvedAt: now,
      resolvedBy: context.auth.uid,
      decisionNotes: reason || null,
    });

    if (decision === 'uphold' && r.trackId && r.uploaderId) {
      batchWrite.set(
        userRepo.uploadRef(r.uploaderId, r.trackId),
        { isRemoved: true, removedAt: now },
        { merge: true }
      );
      batchWrite.set(
        userRepo.ref(r.uploaderId),
        { suspendedUntil: timestampFromMs(Date.now() + SUSPENSION_DURATION_MS) },
        { merge: true }
      );
    }

    processedCount++;
  }

  await batchWrite.commit();

  await authorization.logAdminAction({
    actorId: context.auth.uid,
    action: 'review_reports_batch',
    targetType: 'contentReports',
    targetId: reportIds.join(','),
    reason: reason || `Batch ${decision}`,
    details: { count: processedCount, decision },
  });

  return { success: true, processed: processedCount };
});

export const adminSuspendCreator = functions.https.onCall(async (data: any, context: any) => {
  authorization.assertRole(context, ['admin']);

  const creatorId = String(data?.creatorId || '');
  const durationDays = Number(data?.durationDays ?? 0);
  const reason = String(data?.reason || '');

  if (!creatorId) throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');

  const suspendedUntil = durationDays > 0
    ? timestampFromMs(Date.now() + durationDays * 24 * 60 * 60 * 1000)
    : null;

  await userRepo.merge(creatorId, {
    suspendedUntil,
    suspensionReason: reason || null,
  });

  await authorization.logAdminAction({
    actorId: context.auth.uid,
    action: 'suspend_creator',
    targetType: 'user',
    targetId: creatorId,
    reason,
    details: { durationDays },
  });

  return {
    success: true,
    suspendedUntil: suspendedUntil ? suspendedUntil.toDate().toISOString() : null,
  };
});

export const adminUnsuspendCreator = functions.https.onCall(async (data: any, context: any) => {
  authorization.assertRole(context, ['admin']);

  const creatorId = String(data?.creatorId || '');
  const reason = String(data?.reason || '');
  if (!creatorId) throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');

  await userRepo.merge(creatorId, {
    suspendedUntil: deleteField(),
    suspensionReason: deleteField(),
  });

  await authorization.logAdminAction({
    actorId: context.auth.uid,
    action: 'unsuspend_creator',
    targetType: 'user',
    targetId: creatorId,
    reason,
  });

  return { success: true };
});

export const adminGetComplianceMetrics = functions.https.onCall(async (_data: any, context: any) => {
  authorization.assertRole(context, ['admin', 'moderator', 'auditor']);

  const dayAgo = timestampFromMs(Date.now() - 24 * 60 * 60 * 1000);

  const [pendingReportsSnap, recentUploadsSnap, recentTransactionsSnap] = await Promise.all([
    moderationRepo.reportsQuery().where('status', '==', 'pending').get(),
    systemRepo.uploadsCollectionGroup().where('createdAt', '>=', dayAgo).get(),
    transactionRepo.query().where('createdAt', '>=', dayAgo).get(),
  ]);

  return {
    pendingReports: pendingReportsSnap.size,
    dailyUploads: recentUploadsSnap.size,
    dailyTransactions: recentTransactionsSnap.size,
  };
});

export const adminGetPayoutLedger = functions.https.onCall(async (data: any, context: any) => {
  authorization.assertRole(context, ['admin', 'auditor']);

  const filters = data?.filters ?? {};
  const limit = Math.min(Number(data?.limit) || 25, 100);

  let query = moderationRepo.ledgerQuery() as admin.firestore.Query;

  if (filters.creatorId) query = query.where('creatorId', '==', String(filters.creatorId));
  if (filters.status) query = query.where('status', '==', String(filters.status));
  if (filters.startAt) query = query.where('createdAt', '>=', timestampFromMs(Number(filters.startAt)));
  if (filters.endAt) query = query.where('createdAt', '<=', timestampFromMs(Number(filters.endAt)));

  query = query.orderBy('createdAt', 'desc').limit(limit);

  if (data?.cursorId) {
    const cursorSnap = await moderationRepo.ledgerRef(String(data.cursorId)).get();
    if (cursorSnap.exists) {
      query = query.startAfter(cursorSnap);
    }
  }

  const snapshot = await query.get();
  const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const nextCursorId = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : null;

  return { entries, nextCursorId };
});

export const adminSetUserRole = functions.https.onCall(async (data: any, context: any) => {
  authorization.assertRole(context, ['admin']);

  const uid = String(data?.uid || '');
  const role = String(data?.role || '') as AdminRole;

  if (!uid || !role) throw new functions.https.HttpsError('invalid-argument', 'uid and role are required');
  if (!['admin', 'moderator', 'auditor'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
  }

  await admin.auth().setCustomUserClaims(uid, { role });

  await authorization.logAdminAction({
    actorId: context.auth.uid,
    action: 'set_user_role',
    targetType: 'user',
    targetId: uid,
    reason: `Set role to ${role}`,
  });

  return { success: true };
});

export const adminGetCreators = functions.https.onCall(async (data: any, context: any) => {
  authorization.assertRole(context, ['admin', 'moderator']);

  const queryStr = String(data?.query || '').toLowerCase();
  const limit = Math.min(Number(data?.limit) || 25, 100);

  const snapshot = await userRepo.query().limit(limit * 2).get();

  const creators = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const userData = doc.data() as any;
      const subData = await userRepo.getSubscription(doc.id);
      return {
        id: doc.id,
        name: userData.name || userData.email?.split('@')[0] || 'Unknown',
        email: userData.email || '',
        tier: (subData as any)?.tier || 'vault',
        suspendedUntil: userData.suspendedUntil?.seconds
          ? new Date(userData.suspendedUntil.seconds * 1000).toISOString()
          : null,
        createdAt: userData.createdAt?.seconds
          ? new Date(userData.createdAt.seconds * 1000).toISOString()
          : null,
      };
    })
  );

  const filtered = queryStr
    ? creators.filter(
      (c) => c.name.toLowerCase().includes(queryStr) || c.email.toLowerCase().includes(queryStr)
    )
    : creators;

  return { creators: filtered.slice(0, limit) };
});

export const adminGetCreatorDetails = functions.https.onCall(async (data: any, context: any) => {
  authorization.assertRole(context, ['admin', 'moderator', 'auditor']);

  const creatorId = String(data?.creatorId || '');
  if (!creatorId) throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');

  const userData = await userRepo.getById(creatorId);
  if (!userData) throw new functions.https.HttpsError('not-found', 'Creator not found');

  const u = userData as Record<string, any>;
  const subData = await userRepo.getSubscription(creatorId);
  const uploadsSnap = await userRepo.getAllUploads(creatorId);
  const payoutsSnap = await userRepo.payoutsQuery(creatorId)
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  return {
    id: creatorId,
    name: u.name || u.email?.split('@')[0] || 'Unknown',
    email: u.email || '',
    tier: (subData as any)?.tier || 'vault',
    suspendedUntil: u.suspendedUntil?.seconds
      ? new Date(u.suspendedUntil.seconds * 1000).toISOString()
      : null,
    suspensionReason: u.suspensionReason || null,
    uploadCount: uploadsSnap.size,
    recentPayouts: payoutsSnap.docs.map((doc) => ({
      id: doc.id,
      amount: doc.data().amount,
      status: doc.data().status,
      createdAt: doc.data().createdAt?.seconds
        ? new Date(doc.data().createdAt.seconds * 1000).toISOString()
        : null,
    })),
    createdAt: u.createdAt?.seconds
      ? new Date(u.createdAt.seconds * 1000).toISOString()
      : null,
  };
});

export const adminTriggerPayoutReconciliation = functions.https.onCall(async (data: any, context: any) => {
  authorization.assertRole(context, ['admin']);

  const creatorId = String(data?.creatorId || '');
  if (!creatorId) throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');

  const txnsSnap = await transactionRepo.query()
    .where('sellerId', '==', creatorId)
    .where('status', '==', 'completed')
    .get();

  let totalAmount = 0;
  for (const doc of txnsSnap.docs) {
    // Use amountNgn (new field) with fallback to legacy amount field
    totalAmount += Number(doc.data().amountNgn || doc.data().amount || 0);
  }

  const platformFee = calculatePlatformFee(totalAmount);
  const payoutAmount = totalAmount - platformFee;

  await moderationRepo.createLedgerEntry({
    creatorId,
    amount: payoutAmount,
    status: 'pending',
    totalTransactions: totalAmount,
    platformFee,
    createdAt: serverTimestamp(),
  });

  await authorization.logAdminAction({
    actorId: context.auth.uid,
    action: 'trigger_payout_reconciliation',
    targetType: 'user',
    targetId: creatorId,
    details: { totalAmount, platformFee, payoutAmount },
  });

  return { success: true, payoutAmount, platformFee, totalTransactions: totalAmount };
});

/**
 * adminExecutePayout - Initiates a Flutterwave bank transfer for a pending payout ledger entry.
 * Requires admin role + ledger entry ID + creator bank details.
 */
export const adminExecutePayout = functions.https.onCall(async (data: any, context: any) => {
  authorization.assertRole(context, ['admin']);

  const ledgerEntryId = String(data?.ledgerEntryId || '');
  const accountBank = String(data?.accountBank || '');
  const accountNumber = String(data?.accountNumber || '');
  const beneficiaryName = String(data?.beneficiaryName || '');

  if (!ledgerEntryId) {
    throw new functions.https.HttpsError('invalid-argument', 'ledgerEntryId is required');
  }
  if (!accountBank || !accountNumber || !beneficiaryName) {
    throw new functions.https.HttpsError('invalid-argument', 'Bank details required: accountBank, accountNumber, beneficiaryName');
  }

  const result = await payouts.initiateTransfer(ledgerEntryId, {
    accountBank,
    accountNumber,
    beneficiaryName,
  });

  if (!result.success) {
    throw new functions.https.HttpsError('internal', result.error || 'Transfer failed');
  }

  await authorization.logAdminAction({
    actorId: context.auth.uid,
    action: 'execute_payout',
    targetType: 'payoutLedger',
    targetId: ledgerEntryId,
    details: { transferId: result.transferId, status: result.status },
  });

  return { success: true, transferId: result.transferId, status: result.status };
});

/**
 * adminCheckPayoutStatus - Checks transfer status with Flutterwave for a given transferId.
 */
export const adminCheckPayoutStatus = functions.https.onCall(async (data: any, context: any) => {
  authorization.assertRole(context, ['admin', 'auditor']);

  const transferId = String(data?.transferId || '');
  if (!transferId) {
    throw new functions.https.HttpsError('invalid-argument', 'transferId is required');
  }

  const result = await payouts.checkTransferStatus(transferId);
  return { success: true, ...result };
});
