import { afterEach, describe, expect, it } from 'vitest';
import { getSentryDsn, getSentryInitOptions, getSentryRelease } from '../options';

const keys = [
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_DSN',
  'SENTRY_RELEASE',
  'NEXT_PUBLIC_SENTRY_RELEASE',
  'VERCEL_GIT_COMMIT_SHA',
  'NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA',
  'GITHUB_SHA'
];

afterEach(() => {
  for (const key of keys) {
    delete process.env[key];
  }
});

describe('sentry options', () => {
  it('is disabled when no DSN is set', () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    expect(getSentryDsn()).toBeUndefined();
    expect(getSentryInitOptions().enabled).toBe(false);
  });

  it('prefers the public DSN and trims whitespace', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = '  https://examplePublicKey@o0.ingest.sentry.io/1  ';
    process.env.SENTRY_DSN = 'https://exampleServerKey@o0.ingest.sentry.io/1';
    expect(getSentryDsn()).toBe('https://examplePublicKey@o0.ingest.sentry.io/1');
    expect(getSentryInitOptions().enabled).toBe(true);
  });

  it('uses VERCEL_GIT_COMMIT_SHA as the release when SENTRY_RELEASE is unset', () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'abc123def';
    expect(getSentryRelease()).toBe('abc123def');
  });
});
