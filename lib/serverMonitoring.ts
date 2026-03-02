import * as Sentry from "@sentry/node";

let sentryInitialized = false;

function ensureSentry() {
  const dsn = process.env.SENTRY_DSN || "";
  if (!dsn) return false;
  if (sentryInitialized) return true;
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
    environment: process.env.NODE_ENV || "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
  });
  sentryInitialized = true;
  return true;
}

export async function captureServerException(
  error: Error,
  context?: {
    source?: string;
    pathname?: string;
    userAgent?: string;
    stack?: string;
    context?: Record<string, unknown>;
  }
) {
  if (!ensureSentry()) return;
  Sentry.captureException(error, {
    tags: {
      source: context?.source || "unknown",
    },
    extra: {
      pathname: context?.pathname,
      userAgent: context?.userAgent,
      stack: context?.stack,
      context: context?.context,
    },
  });
  await Sentry.flush(1200);
}

