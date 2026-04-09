/**
 * Bootstrap handler — creates default subscription when a new Firebase Auth user is created.
 */

import * as functionsV1 from 'firebase-functions/v1';
import * as functions from 'firebase-functions';
import { bootstrapNewUser } from '../subscriptions/lifecycle';

export const onUserCreated = functionsV1.auth.user().onCreate(async (user: any) => {
  try {
    await bootstrapNewUser(user.uid);
    functions.logger.info('Bootstrapped new user with shoout plan', { uid: user.uid });
  } catch (error) {
    functions.logger.error('Failed to bootstrap new user', { uid: user.uid, error });
    // Don't throw — auth user creation should not fail due to subscription bootstrap
  }
});
