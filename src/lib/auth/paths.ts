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

/** Accept only same-origin paths. Blocks protocol-relative and absolute URLs. */
export function safeNext(value: string | null | undefined, fallback = '/brief'): string {
  if (!value) return fallback;
  const path = value.trim();
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('\\') ||
    path.includes('://') ||
    path.includes('\0') ||
    /[\r\n]/.test(path)
  ) {
    return fallback;
  }
  return path;
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
