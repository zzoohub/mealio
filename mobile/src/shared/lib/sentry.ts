import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!dsn) {
    if (__DEV__) {
      console.log("Sentry DSN not set, skipping initialization");
    }
    return;
  }

  Sentry.init({
    dsn,
    enabled: !__DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    sendDefaultPii: false,
  });
}

/**
 * Log an error to console (dev) and Sentry (prod).
 * Use instead of raw `console.error` so errors are always tracked.
 */
export function captureError(
  error: unknown,
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
) {
  if (__DEV__) {
    console.error(error);
  }

  const exception =
    error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(exception, {
    tags: context?.tags,
    extra: context?.extra,
  });
}

export { Sentry };
