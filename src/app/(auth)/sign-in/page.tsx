import type { Metadata } from 'next';
import { SignInForm } from '@/components/gateway/auth-forms';
import { linkErrorMessage } from '@/lib/auth/errors';
import { safeNext } from '@/lib/auth/paths';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next, '/brief');
  return (
    <section className="auth-card">
      <p className="gw-kicker">Welcome back</p>
      <h1>Sign in</h1>
      <p>Use the email and password on your Musaix Pro account. Module One is the first room after you are in.</p>
      <SignInForm next={next} initialError={linkErrorMessage(params.error)} />
    </section>
  );
}
