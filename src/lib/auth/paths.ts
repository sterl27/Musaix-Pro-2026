const QUIET = new Set([
  '/',
  '/cockpit',
  '/brief',
  '/privacy',
  '/terms',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password'
]);

const PROTECTED = new Set(['/brief']);

const SAFE_ORIGIN = 'https://sterlai.com';

/**
 * Accept only a same-origin path. URL parsers drop tab, CR, and LF before
 * resolving, so `/\t/evil.example` becomes `https://evil.example`. Those
 * characters, backslashes, and any result whose origin is not ours are refused.
 */
export function safeNext(value: string | null | undefined, fallback = '/brief'): string {
  if (!value) return fallback;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.includes('://')) return fallback;
  if (/[\u0000-\u001F\u007F\s]/.test(path)) return fallback;
  try {
    const resolved = new URL(path, SAFE_ORIGIN);
    if (resolved.origin !== SAFE_ORIGIN) return fallback;
    if (!resolved.pathname.startsWith('/') || resolved.pathname.startsWith('//')) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

export function isQuietRoute(pathname: string): boolean {
  if (QUIET.has(pathname)) return true;
  return pathname.startsWith('/auth/');
}

/** Where the proxy should send this request, or null to continue. */
export function authRedirect(pathname: string, signedIn: boolean, nextParam?: string | null): string | null {
  if (!signedIn && PROTECTED.has(pathname)) {
    return `/sign-in?next=${encodeURIComponent(pathname)}`;
  }
  if (signedIn && (pathname === '/sign-in' || pathname === '/sign-up')) {
    return safeNext(nextParam, '/brief');
  }
  return null;
}
