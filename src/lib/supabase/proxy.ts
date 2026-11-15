import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { authRedirect } from '@/lib/auth/paths';
import { supabaseEnv } from '@/lib/supabase/env';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const env = supabaseEnv();
  if (!env) {
    const signedOut = authRedirect(request.nextUrl.pathname, false, null);
    return signedOut ? NextResponse.redirect(new URL(signedOut, request.url)) : supabaseResponse;
  }

  try {
    const supabase = createServerClient(env.url, env.key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => supabaseResponse.headers.set(key, value));
        }
      }
    });

    // Keep this call immediately after createServerClient so refreshed tokens are written.
    const { data } = await supabase.auth.getClaims();
    const signedIn = Boolean(data?.claims?.sub);
    const destination = authRedirect(request.nextUrl.pathname, signedIn, request.nextUrl.searchParams.get('next'));
    if (!destination) return supabaseResponse;

    const redirect = NextResponse.redirect(new URL(destination, request.url));
    supabaseResponse.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    return redirect;
  } catch {
    return supabaseResponse;
  }
}
