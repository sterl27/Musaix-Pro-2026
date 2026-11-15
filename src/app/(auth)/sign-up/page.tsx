import type { Metadata } from 'next';
import { SignUpForm } from '@/components/gateway/auth-forms';
import { safeNext } from '@/lib/auth/paths';

export const metadata: Metadata = { title: 'Get early access' };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next, '/brief');
  return (
    <section className="auth-card">
      <p className="gw-kicker">Early access</p>
      <h1>Create your account</h1>
      <p>Email and password. After you confirm the address, Module One is waiting. You write it. Nothing generates it.</p>
      <SignUpForm next={next} />
    </section>
  );
}
