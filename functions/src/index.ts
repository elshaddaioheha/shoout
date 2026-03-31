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

import * as admin from 'firebase-admin';

// ============================================================================
// Firebase Initialization
// ============================================================================

admin.initializeApp();

// ============================================================================
// Authentication Handlers
// ============================================================================

export * from './handlers/auth';

// ============================================================================
// Checkout Handlers
// ============================================================================

export * from './handlers/checkout';

// ============================================================================
// Subscription Handlers
// ============================================================================

export * from './handlers/subscription';

// ============================================================================
// Webhook Handlers
// ============================================================================

export * from './handlers/webhook';

// ============================================================================
// Upload Handlers
// ============================================================================

export * from './handlers/uploads';

// ============================================================================
// Aggregation Handlers
// ============================================================================

export * from './handlers/aggregation';

// ============================================================================
// Admin Handlers
// ============================================================================

export * from './handlers/admin';

