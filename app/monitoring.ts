import * as Sentry from '@sentry/react-native';

let isInitialized = false;

export function initMonitoring(): void {
  if (isInitialized) {
    return;
  }

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    enabled: process.env.NODE_ENV !== 'test',
    sendDefaultPii: true,
    tracesSampleRate: 0.1,
    attachScreenshot: false,
  });

  isInitialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!isInitialized) {
    return;
  }

  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
    return;
  }

  Sentry.captureException(error);
}
