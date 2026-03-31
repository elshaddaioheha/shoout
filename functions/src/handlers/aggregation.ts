/**
 * Aggregation handlers - Best sellers, trending, and scheduled uploads
 */

import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as aggregation from '../services/aggregation';

/**
 * aggregateBestSellers - Manually triggered aggregation of best sellers
 */
export const aggregateBestSellers = functions.https.onRequest(
  { timeoutSeconds: 540, memory: '512MiB' },
  async (req, res) => {
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
 * aggregateTrending - Manually triggered aggregation of trending tracks
 */
export const aggregateTrending = functions.https.onRequest(
  { timeoutSeconds: 300, memory: '256MiB' },
  async (req, res) => {
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
