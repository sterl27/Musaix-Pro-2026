import { execSync } from 'node:child_process';
import { withSentryConfig } from '@sentry/nextjs/config';

function resolveRelease() {
  const fromEnv = process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv;
  try {
    return execSync('git rev-parse HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}

const release = resolveRelease();
const sentryUploadEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  env: {
    NEXT_PUBLIC_SENTRY_RELEASE: release
  }
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI || !sentryUploadEnabled,
  telemetry: false,
  widenClientFileUpload: sentryUploadEnabled,
  release: {
    name: release || undefined,
    create: sentryUploadEnabled,
    finalize: sentryUploadEnabled
  },
  sourcemaps: {
    disable: !sentryUploadEnabled,
    deleteSourcemapsAfterUpload: true
  }
});
