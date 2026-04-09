"use strict";
/**
 * Admin handlers - Content moderation, role management, compliance, and payouts
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
exports.adminCheckPayoutStatus = exports.adminExecutePayout = exports.adminTriggerPayoutReconciliation = exports.adminGetCreatorDetails = exports.adminGetCreators = exports.adminSetUserRole = exports.adminGetPayoutLedger = exports.adminGetComplianceMetrics = exports.adminUnsuspendCreator = exports.adminSuspendCreator = exports.adminReviewReportsBatch = exports.adminReviewReport = exports.adminGetModerationQueue = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const authorization = __importStar(require("../services/authorization"));
const payouts = __importStar(require("../services/payouts"));
const types_1 = require("../types");
const repositories_1 = require("../repositories");
const formatting_1 = require("../utils/formatting");
exports.adminGetModerationQueue = functions.https.onCall(async (data, context) => {
    authorization.assertRole(context, ['admin', 'moderator']);
    const filters = data?.filters ?? {};
    const limit = Math.min(Number(data?.limit) || 25, 100);
    let query = repositories_1.moderationRepo.reportsQuery().where('status', '==', 'pending');
    if (filters.type)
        query = query.where('type', '==', String(filters.type));
    if (filters.reporterId)
        query = query.where('reporterId', '==', String(filters.reporterId));
    if (filters.uploaderId)
        query = query.where('uploaderId', '==', String(filters.uploaderId));
    if (filters.trackId)
        query = query.where('trackId', '==', String(filters.trackId));
    if (filters.startAt || filters.endAt) {
        if (filters.startAt)
            query = query.where('createdAt', '>=', (0, repositories_1.timestampFromMs)(Number(filters.startAt)));
        if (filters.endAt)
            query = query.where('createdAt', '<=', (0, repositories_1.timestampFromMs)(Number(filters.endAt)));
    }
    query = query.orderBy('createdAt', 'desc').limit(limit);
    if (data?.cursorId) {
        const { snap: cursorDoc } = await repositories_1.moderationRepo.getReport(String(data.cursorId));
        if (cursorDoc.exists) {
            query = query.startAfter(cursorDoc);
        }
    }
    const snapshot = await query.get();
    const reports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const nextCursorId = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : null;
    return { reports, nextCursorId };
});
exports.adminReviewReport = functions.https.onCall(async (data, context) => {
    authorization.assertRole(context, ['admin', 'moderator']);
    const reportId = String(data?.reportId || '');
    const decision = String(data?.decision || '').toLowerCase();
    const notes = String(data?.notes || '');
    if (!reportId)
        throw new functions.https.HttpsError('invalid-argument', 'reportId is required');
    if (!['dismiss', 'uphold', 'escalate'].includes(decision)) {
        throw new functions.https.HttpsError('invalid-argument', 'decision must be one of dismiss|uphold|escalate');
    }
    const { exists, data: report, snap } = await repositories_1.moderationRepo.getReport(reportId);
    if (!exists)
        throw new functions.https.HttpsError('not-found', 'Report not found');
    const r = report;
    const now = (0, repositories_1.serverTimestamp)();
    const batchWrite = (0, repositories_1.newBatch)();
    batchWrite.update(repositories_1.moderationRepo.reportRef(reportId), {
        status: 'resolved',
        resolution: decision,
        resolvedAt: now,
        resolvedBy: context.auth.uid,
        decisionNotes: notes || null,
    });
    if (decision === 'uphold' && r.trackId && r.uploaderId) {
        batchWrite.set(repositories_1.userRepo.uploadRef(r.uploaderId, r.trackId), { isRemoved: true, removedAt: now }, { merge: true });
        batchWrite.set(repositories_1.userRepo.ref(r.uploaderId), { suspendedUntil: (0, repositories_1.timestampFromMs)(Date.now() + types_1.SUSPENSION_DURATION_MS) }, { merge: true });
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
exports.adminReviewReportsBatch = functions.https.onCall(async (data, context) => {
    authorization.assertRole(context, ['admin', 'moderator']);
    const reportIds = data?.reportIds || [];
    const decision = String(data?.decision || '').toLowerCase();
    const reason = String(data?.reason || '');
    if (!Array.isArray(reportIds) || reportIds.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'reportIds must be a non-empty array');
    }
    if (!['dismiss', 'uphold', 'escalate'].includes(decision)) {
        throw new functions.https.HttpsError('invalid-argument', 'decision must be one of dismiss|uphold|escalate');
    }
    const now = (0, repositories_1.serverTimestamp)();
    const batchWrite = (0, repositories_1.newBatch)();
    let processedCount = 0;
    for (const reportId of reportIds) {
        const { exists, data: report } = await repositories_1.moderationRepo.getReport(reportId);
        if (!exists)
            continue;
        const r = report;
        batchWrite.update(repositories_1.moderationRepo.reportRef(reportId), {
            status: 'resolved',
            resolution: decision,
            resolvedAt: now,
            resolvedBy: context.auth.uid,
            decisionNotes: reason || null,
        });
        if (decision === 'uphold' && r.trackId && r.uploaderId) {
            batchWrite.set(repositories_1.userRepo.uploadRef(r.uploaderId, r.trackId), { isRemoved: true, removedAt: now }, { merge: true });
            batchWrite.set(repositories_1.userRepo.ref(r.uploaderId), { suspendedUntil: (0, repositories_1.timestampFromMs)(Date.now() + types_1.SUSPENSION_DURATION_MS) }, { merge: true });
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
exports.adminSuspendCreator = functions.https.onCall(async (data, context) => {
    authorization.assertRole(context, ['admin']);
    const creatorId = String(data?.creatorId || '');
    const durationDays = Number(data?.durationDays ?? 0);
    const reason = String(data?.reason || '');
    if (!creatorId)
        throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');
    const suspendedUntil = durationDays > 0
        ? (0, repositories_1.timestampFromMs)(Date.now() + durationDays * 24 * 60 * 60 * 1000)
        : null;
    await repositories_1.userRepo.merge(creatorId, {
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
exports.adminUnsuspendCreator = functions.https.onCall(async (data, context) => {
    authorization.assertRole(context, ['admin']);
    const creatorId = String(data?.creatorId || '');
    const reason = String(data?.reason || '');
    if (!creatorId)
        throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');
    await repositories_1.userRepo.merge(creatorId, {
        suspendedUntil: (0, repositories_1.deleteField)(),
        suspensionReason: (0, repositories_1.deleteField)(),
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
exports.adminGetComplianceMetrics = functions.https.onCall(async (_data, context) => {
    authorization.assertRole(context, ['admin', 'moderator', 'auditor']);
    const dayAgo = (0, repositories_1.timestampFromMs)(Date.now() - 24 * 60 * 60 * 1000);
    const [pendingReportsSnap, recentUploadsSnap, recentTransactionsSnap] = await Promise.all([
        repositories_1.moderationRepo.reportsQuery().where('status', '==', 'pending').get(),
        repositories_1.systemRepo.uploadsCollectionGroup().where('createdAt', '>=', dayAgo).get(),
        repositories_1.transactionRepo.query().where('createdAt', '>=', dayAgo).get(),
    ]);
    return {
        pendingReports: pendingReportsSnap.size,
        dailyUploads: recentUploadsSnap.size,
        dailyTransactions: recentTransactionsSnap.size,
    };
});
exports.adminGetPayoutLedger = functions.https.onCall(async (data, context) => {
    authorization.assertRole(context, ['admin', 'auditor']);
    const filters = data?.filters ?? {};
    const limit = Math.min(Number(data?.limit) || 25, 100);
    let query = repositories_1.moderationRepo.ledgerQuery();
    if (filters.creatorId)
        query = query.where('creatorId', '==', String(filters.creatorId));
    if (filters.status)
        query = query.where('status', '==', String(filters.status));
    if (filters.startAt)
        query = query.where('createdAt', '>=', (0, repositories_1.timestampFromMs)(Number(filters.startAt)));
    if (filters.endAt)
        query = query.where('createdAt', '<=', (0, repositories_1.timestampFromMs)(Number(filters.endAt)));
    query = query.orderBy('createdAt', 'desc').limit(limit);
    if (data?.cursorId) {
        const cursorSnap = await repositories_1.moderationRepo.ledgerRef(String(data.cursorId)).get();
        if (cursorSnap.exists) {
            query = query.startAfter(cursorSnap);
        }
    }
    const snapshot = await query.get();
    const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const nextCursorId = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : null;
    return { entries, nextCursorId };
});
exports.adminSetUserRole = functions.https.onCall(async (data, context) => {
    authorization.assertRole(context, ['admin']);
    const uid = String(data?.uid || '');
    const role = String(data?.role || '');
    if (!uid || !role)
        throw new functions.https.HttpsError('invalid-argument', 'uid and role are required');
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
exports.adminGetCreators = functions.https.onCall(async (data, context) => {
    authorization.assertRole(context, ['admin', 'moderator']);
    const queryStr = String(data?.query || '').toLowerCase();
    const limit = Math.min(Number(data?.limit) || 25, 100);
    const snapshot = await repositories_1.userRepo.query().limit(limit * 2).get();
    const creators = await Promise.all(snapshot.docs.map(async (doc) => {
        const userData = doc.data();
        const subData = await repositories_1.userRepo.getSubscription(doc.id);
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
    }));
    const filtered = queryStr
        ? creators.filter((c) => c.name.toLowerCase().includes(queryStr) || c.email.toLowerCase().includes(queryStr))
        : creators;
    return { creators: filtered.slice(0, limit) };
});
exports.adminGetCreatorDetails = functions.https.onCall(async (data, context) => {
    authorization.assertRole(context, ['admin', 'moderator', 'auditor']);
    const creatorId = String(data?.creatorId || '');
    if (!creatorId)
        throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');
    const userData = await repositories_1.userRepo.getById(creatorId);
    if (!userData)
        throw new functions.https.HttpsError('not-found', 'Creator not found');
    const u = userData;
    const subData = await repositories_1.userRepo.getSubscription(creatorId);
    const uploadsSnap = await repositories_1.userRepo.getAllUploads(creatorId);
    const payoutsSnap = await repositories_1.userRepo.payoutsQuery(creatorId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
    return {
        id: creatorId,
        name: u.name || u.email?.split('@')[0] || 'Unknown',
        email: u.email || '',
        tier: subData?.tier || 'vault',
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
exports.adminTriggerPayoutReconciliation = functions.https.onCall(async (data, context) => {
    authorization.assertRole(context, ['admin']);
    const creatorId = String(data?.creatorId || '');
    if (!creatorId)
        throw new functions.https.HttpsError('invalid-argument', 'creatorId is required');
    const txnsSnap = await repositories_1.transactionRepo.query()
        .where('sellerId', '==', creatorId)
        .where('status', '==', 'completed')
        .get();
    let totalAmount = 0;
    for (const doc of txnsSnap.docs) {
        // Use amountNgn (new field) with fallback to legacy amount field
        totalAmount += Number(doc.data().amountNgn || doc.data().amount || 0);
    }
    const platformFee = (0, formatting_1.calculatePlatformFee)(totalAmount);
    const payoutAmount = totalAmount - platformFee;
    await repositories_1.moderationRepo.createLedgerEntry({
        creatorId,
        amount: payoutAmount,
        status: 'pending',
        totalTransactions: totalAmount,
        platformFee,
        createdAt: (0, repositories_1.serverTimestamp)(),
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
exports.adminExecutePayout = functions.https.onCall(async (data, context) => {
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
exports.adminCheckPayoutStatus = functions.https.onCall(async (data, context) => {
    authorization.assertRole(context, ['admin', 'auditor']);
    const transferId = String(data?.transferId || '');
    if (!transferId) {
        throw new functions.https.HttpsError('invalid-argument', 'transferId is required');
    }
    const result = await payouts.checkTransferStatus(transferId);
    return { success: true, ...result };
});
