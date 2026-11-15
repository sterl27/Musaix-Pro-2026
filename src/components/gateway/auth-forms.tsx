'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { requestPasswordReset, resendConfirmation, signIn, signUp, updatePassword } from '@/lib/auth/actions';
import { CaptchaField } from '@/components/gateway/captcha';

function PendingSubmit({ idle, pendingLabel, pending }: { idle: string; pendingLabel: string; pending: boolean }) {
  return (
    <button className="gw-primary" type="submit" disabled={pending}>
      {pending ? pendingLabel : idle}
    </button>
  );
}

export function SignInForm({ next, initialError }: { next: string; initialError?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  const error = state?.error ?? initialError;
  return (
    <form className="auth-form" action={action}>
      <input type="hidden" name="next" value={next} />
      {error ? (
        <p className="auth-alert" role="alert">
          {error}
        </p>
      ) : null}
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required defaultValue={state?.email ?? ''} />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <CaptchaField />
      <PendingSubmit idle="Sign in" pendingLabel="Signing in…" pending={pending} />
      <div className="auth-links">
        <Link href="/forgot-password">Forgot password</Link>
        <Link href={`/sign-up?next=${encodeURIComponent(next)}`}>Create an account</Link>
      </div>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUp, null);
  const [resendState, resendAction, resendPending] = useActionState(resendConfirmation, null);
  const view = resendState?.status === 'check-email' ? resendState : state;
  if (view?.status === 'check-email') {
    return (
      <div className="auth-form">
        <p className="auth-ok" role="status">
          {view.message}
        </p>
        {view.error ? (
          <p className="auth-alert" role="alert">
            {view.error}
          </p>
        ) : null}
        <form action={resendAction}>
          <input type="hidden" name="email" value={view.email ?? ''} />
          <input type="hidden" name="next" value={next} />
          <CaptchaField />
          <PendingSubmit idle="Resend confirmation" pendingLabel="Sending…" pending={resendPending} />
        </form>
        <div className="auth-links">
          <Link href={`/sign-in?next=${encodeURIComponent(next)}`}>Back to sign in</Link>
        </div>
      </div>
    );
  }
  return (
    <form className="auth-form" action={action}>
      <input type="hidden" name="next" value={next} />
      {state?.error ? (
        <p className="auth-alert" role="alert">
          {state.error}
        </p>
      ) : null}
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required defaultValue={state?.email ?? ''} />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="new-password" required minLength={8} />
      </label>
      <label>
        Confirm password
        <input name="confirm" type="password" autoComplete="new-password" required minLength={8} />
      </label>
      <CaptchaField />
      <PendingSubmit idle="Create account" pendingLabel="Creating account…" pending={pending} />
      <p className="auth-note">You will confirm the address by email before Module One opens.</p>
      <div className="auth-links">
        <Link href={`/sign-in?next=${encodeURIComponent(next)}`}>Already have an account</Link>
      </div>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  if (state?.status === 'sent') {
    return (
      <p className="auth-ok" role="status">
        {state.message}
      </p>
    );
  }
  return (
    <form className="auth-form" action={action}>
      {state?.error ? (
        <p className="auth-alert" role="alert">
          {state.error}
        </p>
      ) : null}
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required defaultValue={state?.email ?? ''} />
      </label>
      <CaptchaField />
      <PendingSubmit idle="Send reset link" pendingLabel="Sending…" pending={pending} />
      <div className="auth-links">
        <Link href="/sign-in">Back to sign in</Link>
      </div>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);
  return (
    <form className="auth-form" action={action}>
      {state?.error ? (
        <p className="auth-alert" role="alert">
          {state.error}
        </p>
      ) : null}
      <label>
        New password
        <input name="password" type="password" autoComplete="new-password" required minLength={8} />
      </label>
      <label>
        Confirm new password
        <input name="confirm" type="password" autoComplete="new-password" required minLength={8} />
      </label>
      <PendingSubmit idle="Update password" pendingLabel="Updating…" pending={pending} />
    </form>
  );
}
