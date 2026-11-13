export const SENTRY_TRACES_SAMPLE_RATE = 0.1;

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

export function getSentryDsn(): string | undefined {
  return firstNonEmpty(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.SENTRY_DSN);
}

export function getSentryRelease(): string | undefined {
  return firstNonEmpty(
    process.env.SENTRY_RELEASE,
    process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    process.env.GITHUB_SHA
  );
}

export function getSentryEnvironment(): string {
  return (
    firstNonEmpty(
      process.env.SENTRY_ENVIRONMENT,
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
      process.env.VERCEL_ENV,
      process.env.NEXT_PUBLIC_VERCEL_ENV,
      process.env.NODE_ENV
    ) ?? 'development'
  );
}

export function getSentryInitOptions() {
  const dsn = getSentryDsn();
  return {
    dsn,
    enabled: Boolean(dsn),
    release: getSentryRelease(),
    environment: getSentryEnvironment(),
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    sendDefaultPii: false,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0
  };
}
