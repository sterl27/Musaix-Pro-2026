import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/gateway/auth-forms';

export const metadata: Metadata = { title: 'Reset password' };

export default function ForgotPasswordPage() {
  return (
    <section className="auth-card">
      <p className="gw-kicker">Account</p>
      <h1>Reset your password</h1>
      <p>We will email a link if an account exists for that address. The link opens a page where you choose a new password.</p>
      <ForgotPasswordForm />
    </section>
  );
}
