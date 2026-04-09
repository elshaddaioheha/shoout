"use strict";
/**
 * Repository layer — single entry point for all data access.
 *
 * Usage: import { userRepo, checkoutRepo, ... } from '../repositories';
 *
 * Rules:
 *   - Only repositories touch db.collection() / storage.bucket()
 *   - Services call repositories, never Firestore directly
 *   - Handlers call services, never repositories directly
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
exports.newBatch = exports.timestampNow = exports.timestampFromDate = exports.timestampFromMs = exports.deleteField = exports.serverTimestamp = exports.getDb = exports.storageRepo = exports.emailRepo = exports.systemRepo = exports.otpRepo = exports.moderationRepo = exports.paymentRepo = exports.transactionRepo = exports.checkoutRepo = exports.userRepo = void 0;
exports.userRepo = __importStar(require("./userRepo"));
exports.checkoutRepo = __importStar(require("./checkoutRepo"));
exports.transactionRepo = __importStar(require("./transactionRepo"));
exports.paymentRepo = __importStar(require("./paymentRepo"));
exports.moderationRepo = __importStar(require("./moderationRepo"));
exports.otpRepo = __importStar(require("./otpRepo"));
exports.systemRepo = __importStar(require("./systemRepo"));
exports.emailRepo = __importStar(require("./emailRepo"));
exports.storageRepo = __importStar(require("./storageRepo"));
// Re-export shared primitives for batch writes and timestamps
var base_1 = require("./base");
Object.defineProperty(exports, "getDb", { enumerable: true, get: function () { return base_1.getDb; } });
Object.defineProperty(exports, "serverTimestamp", { enumerable: true, get: function () { return base_1.serverTimestamp; } });
Object.defineProperty(exports, "deleteField", { enumerable: true, get: function () { return base_1.deleteField; } });
Object.defineProperty(exports, "timestampFromMs", { enumerable: true, get: function () { return base_1.timestampFromMs; } });
Object.defineProperty(exports, "timestampFromDate", { enumerable: true, get: function () { return base_1.timestampFromDate; } });
Object.defineProperty(exports, "timestampNow", { enumerable: true, get: function () { return base_1.timestampNow; } });
Object.defineProperty(exports, "newBatch", { enumerable: true, get: function () { return base_1.newBatch; } });
