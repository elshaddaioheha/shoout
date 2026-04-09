"use strict";
/**
 * Subscription guards — enforce capabilities based on the user's current plan.
 * Every handler that needs permission checks calls these instead of rolling their own.
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
exports.getEntitlements = getEntitlements;
exports.assertCanUploadToVault = assertCanUploadToVault;
exports.assertCanSell = assertCanSell;
exports.assertCanShareVaultLinks = assertCanShareVaultLinks;
exports.assertCanUseAds = assertCanUseAds;
exports.assertCanReplyAsSeller = assertCanReplyAsSeller;
exports.assertCanAccessVault = assertCanAccessVault;
exports.assertVaultUploadAllowed = assertVaultUploadAllowed;
exports.assertStudioUploadAllowed = assertStudioUploadAllowed;
const functions = __importStar(require("firebase-functions"));
const repositories_1 = require("../repositories");
const catalog_1 = require("./catalog");
const entitlements_1 = require("./entitlements");
const storagePolicy_1 = require("./storagePolicy");
/**
 * Reads the user's current plan from Firestore and resolves entitlements.
 */
async function getEntitlements(userId) {
    const sub = await repositories_1.userRepo.getSubscription(userId);
    const plan = sub?.tier || catalog_1.DEFAULT_PLAN;
    return { plan, entitlements: (0, entitlements_1.resolveEntitlements)(plan) };
}
function deny(message) {
    throw new functions.https.HttpsError('permission-denied', message);
}
// ── Capability Assertions ──────────────────────────────────────────────────
async function assertCanUploadToVault(userId) {
    const { entitlements } = await getEntitlements(userId);
    if (!entitlements.canUploadToVault) {
        deny('Your plan does not include Vault uploads. Upgrade to Vault, Vault Pro, or Hybrid.');
    }
    return entitlements;
}
async function assertCanSell(userId) {
    const { entitlements } = await getEntitlements(userId);
    if (!entitlements.canSell) {
        deny('Your plan does not include selling. Upgrade to Studio or Hybrid.');
    }
    return entitlements;
}
async function assertCanShareVaultLinks(userId) {
    const { entitlements } = await getEntitlements(userId);
    if (!entitlements.canShareVaultLinks) {
        deny('Your plan does not include private link sharing. Upgrade to Vault or Hybrid.');
    }
    return entitlements;
}
async function assertCanUseAds(userId) {
    const { entitlements } = await getEntitlements(userId);
    if (!entitlements.canUseAds) {
        deny('Your plan does not include ad campaigns. Upgrade to Studio or Hybrid.');
    }
    return entitlements;
}
async function assertCanReplyAsSeller(userId) {
    const { entitlements } = await getEntitlements(userId);
    if (!entitlements.canReplyAsSeller) {
        deny('Your plan does not include seller messaging. Upgrade to Studio or Hybrid.');
    }
    return entitlements;
}
async function assertCanAccessVault(userId) {
    const { entitlements } = await getEntitlements(userId);
    if (!entitlements.canAccessVaultWorkspace) {
        deny('Your plan does not include the Vault workspace. Upgrade to Vault or Hybrid.');
    }
    return entitlements;
}
// ── Storage Assertions (ledger-aware) ──────────────────────────────────────
async function assertVaultUploadAllowed(userId, fileSizeBytes) {
    const entitlements = await assertCanUploadToVault(userId);
    const usage = await (0, storagePolicy_1.computeVaultUsage)(userId);
    if (entitlements.maxVaultUploads !== Infinity && usage.usedCount >= entitlements.maxVaultUploads) {
        deny(`Vault upload limit reached (${entitlements.maxVaultUploads}). Upgrade for more uploads.`);
    }
    if (entitlements.vaultStorageLimitBytes !== Infinity && usage.usedBytes + fileSizeBytes > entitlements.vaultStorageLimitBytes) {
        const availableMB = Math.max(0, (entitlements.vaultStorageLimitBytes - usage.usedBytes) / (1024 * 1024));
        deny(`Vault storage limit exceeded. Available: ${availableMB.toFixed(1)}MB. Upgrade for more storage.`);
    }
    return { entitlements, usage };
}
async function assertStudioUploadAllowed(userId, fileSizeBytes) {
    const entitlements = await assertCanSell(userId);
    const usage = await (0, storagePolicy_1.computeStudioUsage)(userId);
    if (usage.usedBytes + fileSizeBytes > entitlements.studioStorageLimitBytes) {
        const availableMB = Math.max(0, (entitlements.studioStorageLimitBytes - usage.usedBytes) / (1024 * 1024));
        deny(`Studio storage limit exceeded. Available: ${availableMB.toFixed(1)}MB. Upgrade for more storage.`);
    }
    return { entitlements, usage };
}
