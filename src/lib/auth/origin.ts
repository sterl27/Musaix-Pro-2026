/** Public origin for auth email links. Unknown hosts fall back to production. */
export function originFromHost(host: string | null, proto: string | null): string {
  const value = (host ?? '').split(',')[0]?.trim().toLowerCase() ?? '';
  const local = value.startsWith('localhost') || value.startsWith('127.0.0.1');
  const preview = value.endsWith('.vercel.app');
  const production = value === 'sterlai.com' || value === 'www.sterlai.com';
  if (!local && !preview && !production) return 'https://sterlai.com';
  const scheme = local ? 'http' : proto === 'http' ? 'http' : 'https';
  return `${scheme}://${value}`;
}
