"use strict";
/**
 * Authorization service - Role-gating and admin action logging
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
exports.getUserRoleFromContext = getUserRoleFromContext;
exports.assertRole = assertRole;
exports.logAdminAction = logAdminAction;
exports.getUserRole = getUserRole;
const functions = __importStar(require("firebase-functions"));
const firebase_1 = require("../utils/firebase");
/**
 * Extracts user role from Firebase Auth custom claims
 */
function getUserRoleFromContext(context) {
    return context?.auth?.token?.role ?? null;
}
/**
 * Asserts user has required role(s), throws error if not
 */
function assertRole(context, allowedRoles, message) {
    const role = getUserRoleFromContext(context);
    if (!role || !allowedRoles.includes(role)) {
        throw new functions.https.HttpsError('permission-denied', message || 'Insufficient privileges');
    }
}
/**
 * Logs an admin action to the moderation log
 */
async function logAdminAction(params) {
    const db = (0, firebase_1.getDb)();
    await db.collection('moderationLog').add({
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        reason: params.reason || null,
        details: params.details || null,
        createdAt: (0, firebase_1.serverTimestamp)(),
    });
}
/**
 * Gets user's role for authorization checks
 */
async function getUserRole(uid) {
    const user = await require('firebase-admin').auth().getUser(uid).catch(() => null);
    if (!user)
        return null;
    return user.customClaims?.role ?? null;
}
