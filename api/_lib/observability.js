import * as Sentry from "@sentry/node";

let initialised = false;

function initialise() {
  if (initialised || !process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.05),
  });
  initialised = true;
}

export function captureServerError(error, context = {}) {
  if (!process.env.SENTRY_DSN) return;
  initialise();
  Sentry.withScope(scope => {
    for (const [key, value] of Object.entries(context)) scope.setExtra(key, value);
    Sentry.captureException(error);
  });
}
