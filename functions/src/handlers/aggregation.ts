/**
 * Aggregation handlers - Best sellers, trending, and scheduled uploads
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as aggregation from '../services/aggregation';

/**
 * Verifies bearer token on HTTP onRequest endpoints.
 * Returns the decoded token or sends an error response and returns null.
 */
async function verifyBearerToken(
  req: functions.https.Request,
  res: any
): Promise<admin.auth.DecodedIdToken | null> {
  const authHeader = String(req.header('authorization') || '');
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing bearer token' });
    return null;
  }
  try {
    return await admin.auth().verifyIdToken(authHeader.slice('Bearer '.length).trim());
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
    return null;
  }
}

/**
 * aggregateBestSellers - Manually triggered aggregation of best sellers (admin auth required)
 */
export const aggregateBestSellers = functions.https.onRequest(
  { timeoutSeconds: 540, memory: '512MiB' },
  async (req, res) => {
    const decoded = await verifyBearerToken(req, res);
    if (!decoded) return;
    const role = decoded.role as string | undefined;
    if (!role || !['admin', 'moderator'].includes(role)) {
      res.status(403).json({ error: 'Insufficient privileges' });
      return;
    }

    try {
      const count = await aggregation.aggregateBestSellers();
      res.status(200).json({ success: true, count });
    } catch (error) {
      functions.logger.error('Failed to aggregate best sellers:', error);
      res.status(500).json({ error: 'Failed to aggregate best sellers' });
    }
  }
);

/**
 * aggregateTrending - Manually triggered aggregation of trending tracks (admin auth required)
 */
export const aggregateTrending = functions.https.onRequest(
  { timeoutSeconds: 300, memory: '256MiB' },
  async (req, res) => {
    const decoded = await verifyBearerToken(req, res);
    if (!decoded) return;
    const role = decoded.role as string | undefined;
    if (!role || !['admin', 'moderator'].includes(role)) {
      res.status(403).json({ error: 'Insufficient privileges' });
      return;
    }

    try {
      const count = await aggregation.aggregateTrending();
      res.status(200).json({ success: true, count });
    } catch (error) {
      functions.logger.error('Failed to aggregate trending:', error);
      res.status(500).json({ error: 'Failed to aggregate trending' });
    }
  }
);

/**
 * scheduleAggregateBestSellers - Scheduled aggregation (every 60 minutes)
 */
export const scheduleAggregateBestSellers = onSchedule(
  { schedule: 'every 60 minutes' },
  async () => {
    await aggregation.aggregateBestSellers();
  }
);

/**
 * scheduleAggregateTrending - Scheduled aggregation (every 60 minutes)
 */
export const scheduleAggregateTrending = onSchedule(
  { schedule: 'every 60 minutes' },
  async () => {
    await aggregation.aggregateTrending();
  }
);

/**
 * schedulePromoteUpcomingUploads - Scheduled promotion of scheduled releases (every 10 minutes)
 */
export const schedulePromoteUpcomingUploads = onSchedule(
  { schedule: 'every 10 minutes' },
  async () => {
    await aggregation.promoteUpcomingUploads();
  }
);
