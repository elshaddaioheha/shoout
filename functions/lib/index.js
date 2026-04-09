"use strict";
/**
 * Firebase Cloud Functions - Entry Point
 *
 * This file initializes Firebase and exports all handler functions.
 * Business logic is organized in layers:
 *  - types/       → Shared type definitions & constants
 *  - utils/       → Pure utility functions (crypto, validation, formatting, firebase helpers)
 *  - services/    → Business logic (billing, payments, invoicing, authorization)
 *  - handlers/    → HTTP & callable function handlers
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
// ============================================================================
// Firebase Initialization
// ============================================================================
admin.initializeApp();
// ============================================================================
// Authentication Handlers
// ============================================================================
__exportStar(require("./handlers/auth"), exports);
// ============================================================================
// Checkout Handlers for payment gating
// ============================================================================
__exportStar(require("./handlers/checkout"), exports);
// ============================================================================
// Subscription Handlers
// ============================================================================
__exportStar(require("./handlers/subscription"), exports);
// ============================================================================
// Webhook Handlers
// ============================================================================
__exportStar(require("./handlers/webhook"), exports);
// ============================================================================
// Upload Handlers
// ============================================================================
__exportStar(require("./handlers/uploads"), exports);
// ============================================================================
// Aggregation Handlers
// ============================================================================
__exportStar(require("./handlers/aggregation"), exports);
// ============================================================================
// Admin Handlers
// ============================================================================
__exportStar(require("./handlers/admin"), exports);
// ============================================================================
// Bootstrap Handlers (Auth triggers)
// ============================================================================
__exportStar(require("./handlers/bootstrap"), exports);
// ============================================================================
// Migration Handlers (one-time admin tools)
// ============================================================================
__exportStar(require("./handlers/migration"), exports);
