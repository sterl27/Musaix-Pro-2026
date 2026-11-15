import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/gateway/auth-forms';
import { createClient } from '@/lib/supabase/server';
import { supabaseEnv } from '@/lib/supabase/env';

export const metadata: Metadata = { title: 'Choose a new password' };
export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage() {
  let signedIn = false;
  if (supabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  }

  return (
    <section className="auth-card">
      <p className="gw-kicker">Account</p>
      <h1>Choose a new password</h1>
      {signedIn ? (
        <>
          <p>This replaces the password on the account you just verified.</p>
          <ResetPasswordForm />
        </>
      ) : (
        <>
          <p>Open the reset link from your email on this device. If it expired, request a new one.</p>
          <div className="auth-links">
            <Link href="/forgot-password">Request a reset link</Link>
          </div>
        </>
      )}
    </section>
  );
}
