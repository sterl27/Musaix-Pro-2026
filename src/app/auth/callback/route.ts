import { NextResponse } from 'next/server';
import { safeNext } from '@/lib/auth/paths';
import { createClient } from '@/lib/supabase/server';
import { supabaseEnv } from '@/lib/supabase/env';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'), '/brief');
  const failed = new URL('/sign-in', url.origin);
  failed.searchParams.set('error', 'link');
  failed.searchParams.set('next', next);

  if (!supabaseEnv()) {
    failed.searchParams.set('error', 'confirm');
    return NextResponse.redirect(failed);
  }

  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(failed);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(failed);
  return NextResponse.redirect(new URL(next, url.origin));
}
