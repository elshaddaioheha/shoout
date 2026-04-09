/**
 * Email repository — outbound mail queue for Trigger Email extension.
 */

import { EMAIL_COLLECTION } from '../types';
import { getDb, serverTimestamp } from './base';
import { buildMailQueuePayload } from '../subscriptionLifecycle';

export async function queueEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  await getDb().collection(EMAIL_COLLECTION).add({
    ...buildMailQueuePayload(params),
    createdAt: serverTimestamp(),
  });
}
