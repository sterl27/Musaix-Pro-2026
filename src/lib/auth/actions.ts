'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { authErrorMessage } from '@/lib/auth/errors';
import { originFromHost } from '@/lib/auth/origin';
import { safeNext } from '@/lib/auth/paths';
import { createClient } from '@/lib/supabase/server';
import { supabaseEnv } from '@/lib/supabase/env';

export type AuthFormState = {
  status?: 'error' | 'check-email' | 'sent';
  error?: string;
  message?: string;
  email?: string;
} | null;

async function requestOrigin() {
  const headerList = await headers();
  return originFromHost(headerList.get('x-forwarded-host') ?? headerList.get('host'), headerList.get('x-forwarded-proto'));
}

function configured(): AuthFormState | null {
  if (supabaseEnv()) return null;
  return { status: 'error', error: 'Accounts are not configured on this deployment yet.' };
}

function emailOf(formData: FormData) {
  return String(formData.get('email') ?? '').trim().toLowerCase();
}

function captchaFrom(formData: FormData) {
  const captchaToken = String(formData.get('captcha_token') ?? '').trim();
  return captchaToken ? { captchaToken } : {};
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const blocked = configured();
  if (blocked) return blocked;
  const email = emailOf(formData);
  const password = String(formData.get('password') ?? '');
  const next = safeNext(String(formData.get('next') ?? ''), '/brief');
  if (!email || !password) return { status: 'error', error: 'Enter your email and password.', email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password, options: captchaFrom(formData) });
  if (error) return { status: 'error', error: authErrorMessage(error), email };
  redirect(next);
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const blocked = configured();
  if (blocked) return blocked;
  const email = emailOf(formData);
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  const next = safeNext(String(formData.get('next') ?? ''), '/brief');
  if (!email || !email.includes('@')) return { status: 'error', error: 'Enter a valid email address.', email };
  if (password.length < 8) return { status: 'error', error: 'Use at least 8 characters.', email };
  if (password !== confirm) return { status: 'error', error: 'Those passwords do not match.', email };

  const origin = await requestOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      ...captchaFrom(formData)
    }
  });
  if (error) return { status: 'error', error: authErrorMessage(error), email };
  if (data.session) redirect(next);
  return {
    status: 'check-email',
    email,
    message: 'Check your inbox for a confirmation link. It brings you back to your brief. Look in spam if it is not there in a minute.'
  };
}

export async function resendConfirmation(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const blocked = configured();
  if (blocked) return blocked;
  const email = emailOf(formData);
  if (!email) return { status: 'error', error: 'Enter the email you used to sign up.' };
  const origin = await requestOrigin();
  const next = safeNext(String(formData.get('next') ?? ''), '/brief');
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      ...captchaFrom(formData)
    }
  });
  if (error) return { status: 'check-email', email, error: authErrorMessage(error) };
  return { status: 'check-email', email, message: 'Sent again. Use the newest link in your inbox.' };
}

export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const blocked = configured();
  if (blocked) return blocked;
  const email = emailOf(formData);
  if (!email || !email.includes('@')) return { status: 'error', error: 'Enter the email on your account.' };

  const origin = await requestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/reset-password')}`,
    ...captchaFrom(formData)
  });
  if (error) {
    const message = authErrorMessage(error);
    if (message.startsWith('Too many')) return { status: 'error', error: message, email };
  }
  return {
    status: 'sent',
    email,
    message: 'If an account exists for that email, a reset link is on the way. It opens a page where you choose a new password.'
  };
}

export async function updatePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const blocked = configured();
  if (blocked) return blocked;
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8) return { status: 'error', error: 'Use at least 8 characters.' };
  if (password !== confirm) return { status: 'error', error: 'Those passwords do not match.' };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return { status: 'error', error: 'Open the reset link from your email, then choose a new password.' };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: 'error', error: authErrorMessage(error) };
  redirect('/brief');
}

export async function signOut() {
  if (supabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect('/');
}
