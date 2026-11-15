import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { safeNext } from '@/lib/auth/paths';
import { createClient } from '@/lib/supabase/server';
import { supabaseEnv } from '@/lib/supabase/env';

const OTP_TYPES = new Set<EmailOtpType>(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const fallback = type === 'recovery' ? '/reset-password' : '/brief';
  const next = safeNext(url.searchParams.get('next'), fallback);
  const failed = new URL('/sign-in', url.origin);
  failed.searchParams.set('error', 'confirm');
  failed.searchParams.set('next', next);

  const tokenHash = url.searchParams.get('token_hash');
  if (!supabaseEnv() || !tokenHash || !type || !OTP_TYPES.has(type as EmailOtpType)) {
    return NextResponse.redirect(failed);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });
  if (error) return NextResponse.redirect(failed);
  return NextResponse.redirect(new URL(next, url.origin));
}
