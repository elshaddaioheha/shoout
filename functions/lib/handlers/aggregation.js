"use strict";
/**
 * Aggregation handlers - Best sellers, trending, and scheduled uploads
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
exports.schedulePromoteUpcomingUploads = exports.scheduleAggregateTrending = exports.scheduleAggregateBestSellers = exports.aggregateTrending = exports.aggregateBestSellers = void 0;
const functions = __importStar(require("firebase-functions"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const aggregation = __importStar(require("../services/aggregation"));
/**
 * aggregateBestSellers - Manually triggered aggregation of best sellers
 */
exports.aggregateBestSellers = functions.https.onRequest({ timeoutSeconds: 540, memory: '512MiB' }, async (req, res) => {
    try {
        const count = await aggregation.aggregateBestSellers();
        res.status(200).json({ success: true, count });
    }
    catch (error) {
        functions.logger.error('Failed to aggregate best sellers:', error);
        res.status(500).json({ error: 'Failed to aggregate best sellers' });
    }
});
/**
 * aggregateTrending - Manually triggered aggregation of trending tracks
 */
exports.aggregateTrending = functions.https.onRequest({ timeoutSeconds: 300, memory: '256MiB' }, async (req, res) => {
    try {
        const count = await aggregation.aggregateTrending();
        res.status(200).json({ success: true, count });
    }
    catch (error) {
        functions.logger.error('Failed to aggregate trending:', error);
        res.status(500).json({ error: 'Failed to aggregate trending' });
    }
});
/**
 * scheduleAggregateBestSellers - Scheduled aggregation (every 60 minutes)
 */
exports.scheduleAggregateBestSellers = (0, scheduler_1.onSchedule)({ schedule: 'every 60 minutes' }, async () => {
    await aggregation.aggregateBestSellers();
});
/**
 * scheduleAggregateTrending - Scheduled aggregation (every 60 minutes)
 */
exports.scheduleAggregateTrending = (0, scheduler_1.onSchedule)({ schedule: 'every 60 minutes' }, async () => {
    await aggregation.aggregateTrending();
});
/**
 * schedulePromoteUpcomingUploads - Scheduled promotion of scheduled releases (every 10 minutes)
 */
exports.schedulePromoteUpcomingUploads = (0, scheduler_1.onSchedule)({ schedule: 'every 10 minutes' }, async () => {
    await aggregation.promoteUpcomingUploads();
});
