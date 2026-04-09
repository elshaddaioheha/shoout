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

export * as userRepo from './userRepo';
export * as checkoutRepo from './checkoutRepo';
export * as transactionRepo from './transactionRepo';
export * as paymentRepo from './paymentRepo';
export * as moderationRepo from './moderationRepo';
export * as otpRepo from './otpRepo';
export * as systemRepo from './systemRepo';
export * as emailRepo from './emailRepo';
export * as storageRepo from './storageRepo';

// Re-export shared primitives for batch writes and timestamps
export {
  getDb,
  serverTimestamp,
  deleteField,
  timestampFromMs,
  timestampFromDate,
  timestampNow,
  newBatch,
} from './base';

export type { DocRef, DocSnap, Query, WriteBatch, Timestamp } from './base';
