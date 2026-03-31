/**
 * Admin handlers - Content moderation, role management, compliance, and payouts
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as authorization from '../services/authorization';
import { AdminRole } from '../types';
import { getDb, serverTimestamp, batch } from '../utils/firebase';

/**
 * adminGetModerationQueue - Lists pending content reports with filtering
 */
export const adminGetModerationQueue = functions.https.onCall(async (data: any, context: any) => {
  authorization.assertRole(context, ['admin', 'moderator']);

  const filters = data?.filters ?? {};
  const limit = Math.min(Number(data?.limit) || 25, 100);

  const db = getDb();
  let query: admin.firestore.Query = db
    .collection('contentReports')
    .where('status', '==', 'pending');

  if (filters.type) {
    query = query.where('type', '==', String(filters.type));
  }
  if (filters.reporterId) {
    query = query.where('reporterId', '==', String(filters.reporterId));
  }
  if (filters.uploaderId) {
    query = query.where('uploaderId', '==', String(filters.uploaderId));
  }
  if (filters.trackId) {
    query = query.where('trackId', '==', String(filters.trackId));
  }

  if (filters.startAt || filters.endAt) {
    const startAt = filters.startAt
      ? admin.firestore.Timestamp.fromMillis(Number(filters.startAt))
      : null;
    const endAt = filters.endAt
      ? admin.firestore.Timestamp.fromMillis(Number(filters.endAt))
      : null;
    if (startAt) query = query.where('createdAt', '>=', startAt);
    if (endAt) query = query.where('createdAt', '<=', endAt);
  }

  query = query.orderBy('createdAt', 'desc').limit(limit);

  if (data?.cursorId) {
    const cursorDoc = await db.collection('contentReports').doc(String(data.cursorId)).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.get();
  const reports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const nextCursorId = snapshot.docs.length
    ? snapshot.docs[snapshot.docs.length - 1].id
    : null;

  return { reports, nextCursorId };
});

/**
 * adminReviewReport - Reviews a single report and applies decision
 */
export const adminReviewReport = functions.https.onCall(async (data: any, context: any) => {
  authorization.assertRole(context, ['admin', 'moderator']);

  const reportId = String(data?.reportId || '');
  const decision = String(data?.decision || '').toLowerCase();
  const notes = String(data?.notes || '');

  if (!reportId) {
    throw new functions.https.HttpsError('invalid-argument', 'reportId is required');
  }
  if (!['dismiss', 'uphold', 'escalate'].includes(decision)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'decision must be one of dismiss|uphold|escalate'
    );
  }

  const db = getDb();
  const reportRef = db.collection('contentReports').doc(reportId);
  const reportSnap = await reportRef.get();

  if (!reportSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Report not found');
  }

  const report = reportSnap.data() as Record<string, any>;
  const now = serverTimestamp();
  const updates: Record<string, any> = {
    status: 'resolved',
    resolution: decision,
    resolvedAt: now,
    resolvedBy: context.auth.uid,
    decisionNotes: notes || null,
  };

  const batchWrite = batch();
  batchWrite.update(reportRef, updates);

  // If upholding, remove content and suspend creator
  if (decision === 'uphold' && report.trackId && report.uploaderId) {
    const trackRef = db.collection('uploads').doc(report.trackId);
    batchWrite.set(trackRef, { isRemoved: true, removedAt: now }, { merge: true });

    const userRef = db.collection('users').doc(report.uploaderId);
    batchWrite.set(
      userRef,
      {
        suspendedUntil: admin.firestore.Timestamp.fromMillis(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ),
      },
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
    details: { decision, report },
  });

  return { success: true };
});

/**
 * adminReviewReportsBatch - Applies decision to multiple reports
 */
export const adminReviewReportsBatch = functions.https.onCall(
  async (data: any, context: any) => {
    authorization.assertRole(context, ['admin', 'moderator']);

    const reportIds = (data?.reportIds as string[]) || [];
    const decision = String(data?.decision || '').toLowerCase();
    const reason = String(data?.reason || '');

    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'reportIds must be a non-empty array'
      );
    }
    if (!['dismiss', 'uphold', 'escalate'].includes(decision)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'decision must be one of dismiss|uphold|escalate'
      );
    }

    const db = getDb();
    const now = serverTimestamp();
    const batchWrite = batch();
    let processedCount = 0;

    for (const reportId of reportIds) {
      const reportRef = db.collection('contentReports').doc(reportId);
      const reportSnap = await reportRef.get();

      if (!reportSnap.exists) {
        continue;
      }

      const report = reportSnap.data() as Record<string, any>;

      batchWrite.update(reportRef, {
        status: 'resolved',
        resolution: decision,
        resolvedAt: now,
        resolvedBy: context.auth.uid,
        decisionNotes: reason || null,
      });

      if (decision === 'uphold' && report.trackId && report.uploaderId) {
        const trackRef = db.collection('uploads').doc(report.trackId);
        batchWrite.set(trackRef, { isRemoved: true, removedAt: now }, { merge: true });

        const userRef = db.collection('users').doc(report.uploaderId);
        batchWrite.set(
          userRef,
          {
            suspendedUntil: admin.firestore.Timestamp.fromMillis(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ),
          },
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
  }
);

/**
 * adminSuspendCreator - Manually suspends a creator
 */
export const adminSuspendCreator = functions.https.onCall(
  async (data: any, context: any) => {
    authorization.assertRole(context, ['admin']);

    const creatorId = String(data?.creatorId || '');
    const durationDays = Number(data?.durationDays ?? 0);
    const reason = String(data?.reason || '');

    if (!creatorId) {
      throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');
    }

    const suspendedUntil =
      durationDays > 0
        ? admin.firestore.Timestamp.fromMillis(
          Date.now() + durationDays * 24 * 60 * 60 * 1000
        )
        : null;

    const db = getDb();
    await db.collection('users').doc(creatorId).set(
      {
        suspendedUntil,
        suspensionReason: reason || null,
      },
      { merge: true }
    );

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
  }
);

/**
 * adminUnsuspendCreator - Removes suspension from a creator
 */
export const adminUnsuspendCreator = functions.https.onCall(
  async (data: any, context: any) => {
    authorization.assertRole(context, ['admin']);

    const creatorId = String(data?.creatorId || '');
    const reason = String(data?.reason || '');

    if (!creatorId) {
      throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');
    }

    const db = getDb();
    await db.collection('users').doc(creatorId).set(
      {
        suspendedUntil: admin.firestore.FieldValue.delete(),
        suspensionReason: admin.firestore.FieldValue.delete(),
      },
      { merge: true }
    );

    await authorization.logAdminAction({
      actorId: context.auth.uid,
      action: 'unsuspend_creator',
      targetType: 'user',
      targetId: creatorId,
      reason,
    });

    return { success: true };
  }
);

/**
 * adminGetComplianceMetrics - Returns 24-hour compliance snapshot
 */
export const adminGetComplianceMetrics = functions.https.onCall(
  async (_data: any, context: any) => {
    authorization.assertRole(context, ['admin', 'moderator', 'auditor']);

    const db = getDb();
    const now = Date.now();
    const dayAgo = admin.firestore.Timestamp.fromMillis(now - 24 * 60 * 60 * 1000);

    const [pendingReportsSnap, recentUploadsSnap, recentTransactionsSnap] = await Promise.all([
      db.collection('contentReports').where('status', '==', 'pending').get(),
      db.collection('uploads').where('createdAt', '>=', dayAgo).get(),
      db.collection('transactions').where('createdAt', '>=', dayAgo).get(),
    ]);

    return {
      pendingReports: pendingReportsSnap.size,
      dailyUploads: recentUploadsSnap.size,
      dailyTransactions: recentTransactionsSnap.size,
    };
  }
);

/**
 * adminGetPayoutLedger - Lists payout records with filtering
 */
export const adminGetPayoutLedger = functions.https.onCall(
  async (data: any, context: any) => {
    authorization.assertRole(context, ['admin', 'auditor']);

    const filters = data?.filters ?? {};
    const limit = Math.min(Number(data?.limit) || 25, 100);

    const db = getDb();
    let query: admin.firestore.Query = db.collection('payoutLedger');

    if (filters.creatorId) {
      query = query.where('creatorId', '==', String(filters.creatorId));
    }
    if (filters.status) {
      query = query.where('status', '==', String(filters.status));
    }
    if (filters.startAt || filters.endAt) {
      const startAt = filters.startAt
        ? admin.firestore.Timestamp.fromMillis(Number(filters.startAt))
        : null;
      const endAt = filters.endAt
        ? admin.firestore.Timestamp.fromMillis(Number(filters.endAt))
        : null;
      if (startAt) query = query.where('createdAt', '>=', startAt);
      if (endAt) query = query.where('createdAt', '<=', endAt);
    }

    query = query.orderBy('createdAt', 'desc').limit(limit);

    if (data?.cursorId) {
      const cursorDoc = await db.collection('payoutLedger').doc(String(data.cursorId)).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const nextCursorId = snapshot.docs.length
      ? snapshot.docs[snapshot.docs.length - 1].id
      : null;

    return { entries, nextCursorId };
  }
);

/**
 * adminSetUserRole - Assigns admin, moderator, or auditor role to user
 */
export const adminSetUserRole = functions.https.onCall(
  async (data: any, context: any) => {
    authorization.assertRole(context, ['admin']);

    const uid = String(data?.uid || '');
    const role = String(data?.role || '') as AdminRole;

    if (!uid || !role) {
      throw new functions.https.HttpsError('invalid-argument', 'uid and role are required');
    }
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
  }
);

/**
 * adminGetCreators - Lists creators with search/filter
 */
export const adminGetCreators = functions.https.onCall(
  async (data: any, context: any) => {
    authorization.assertRole(context, ['admin', 'moderator']);

    const query = String(data?.query || '').toLowerCase();
    const limit = Math.min(Number(data?.limit) || 25, 100);

    const db = getDb();
    let q: admin.firestore.Query = db.collection('users');
    q = q.limit(limit * 2);

    const snapshot = await q.get();

    const creators = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const userData = doc.data() as any;
        const subSnap = await db
          .collection('users')
          .doc(doc.id)
          .collection('subscription')
          .doc('current')
          .get();
        const subData = subSnap.data() as any;

        return {
          id: doc.id,
          name: userData.name || userData.email?.split('@')[0] || 'Unknown',
          email: userData.email || '',
          tier: subData?.tier || 'vault',
          suspendedUntil: userData.suspendedUntil?.seconds
            ? new Date(userData.suspendedUntil.seconds * 1000).toISOString()
            : null,
          createdAt: userData.createdAt?.seconds
            ? new Date(userData.createdAt.seconds * 1000).toISOString()
            : null,
        };
      })
    );

    const filtered = query
      ? creators.filter(
        (c) =>
          c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)
      )
      : creators;

    return { creators: filtered.slice(0, limit) };
  }
);

/**
 * adminGetCreatorDetails - Gets full creator profile with payouts and uploads
 */
export const adminGetCreatorDetails = functions.https.onCall(
  async (data: any, context: any) => {
    authorization.assertRole(context, ['admin', 'moderator', 'auditor']);

    const creatorId = String(data?.creatorId || '');
    if (!creatorId) {
      throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');
    }

    const db = getDb();
    const userSnap = await db.collection('users').doc(creatorId).get();
    if (!userSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Creator not found');
    }

    const userData = userSnap.data() as any;
    const subSnap = await db
      .collection('users')
      .doc(creatorId)
      .collection('subscription')
      .doc('current')
      .get();
    const subData = subSnap.data() as any;

    const uploadsSnap = await db
      .collection('users')
      .doc(creatorId)
      .collection('uploads')
      .get();

    const payoutsSnap = await db
      .collection('users')
      .doc(creatorId)
      .collection('payouts')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    return {
      id: creatorId,
      name: userData.name || userData.email?.split('@')[0] || 'Unknown',
      email: userData.email || '',
      tier: subData?.tier || 'vault',
      suspendedUntil: userData.suspendedUntil?.seconds
        ? new Date(userData.suspendedUntil.seconds * 1000).toISOString()
        : null,
      suspensionReason: userData.suspensionReason || null,
      uploadCount: uploadsSnap.size,
      recentPayouts: payoutsSnap.docs.map((doc) => ({
        id: doc.id,
        amount: doc.data().amount,
        status: doc.data().status,
        createdAt: doc.data().createdAt?.seconds
          ? new Date(doc.data().createdAt.seconds * 1000).toISOString()
          : null,
      })),
      createdAt: userData.createdAt?.seconds
        ? new Date(userData.createdAt.seconds * 1000).toISOString()
        : null,
    };
  }
);

/**
 * adminTriggerPayoutReconciliation - Manually calculates and creates payout ledger entry
 */
export const adminTriggerPayoutReconciliation = functions.https.onCall(
  async (data: any, context: any) => {
    authorization.assertRole(context, ['admin']);

    const creatorId = String(data?.creatorId || '');
    if (!creatorId) {
      throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');
    }

    const db = getDb();

    // Sum all completed transactions for creator (as seller)
    const txnsSnap = await db
      .collection('transactions')
      .where('sellerId', '==', creatorId)
      .where('status', '==', 'completed')
      .get();

    let totalAmount = 0;
    for (const doc of txnsSnap.docs) {
      totalAmount += Number(doc.data().amount || 0);
    }

    // Deduct platform fee (10%)
    const platformFee = Math.round(totalAmount * 0.1);
    const payoutAmount = totalAmount - platformFee;

    // Create payout ledger entry
    const ledgerRef = db.collection('payoutLedger').doc();
    await ledgerRef.set({
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

    return {
      success: true,
      payoutAmount,
      platformFee,
      totalTransactions: totalAmount,
    };
  }
);
