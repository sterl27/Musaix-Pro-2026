import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOut } from '@/lib/auth/actions';
import { GatewayFrame } from '@/components/gateway/shell';
import { ModuleOne } from '@/components/gateway/module-one';
import { createClient } from '@/lib/supabase/server';
import { supabaseEnv } from '@/lib/supabase/env';

export const metadata: Metadata = { title: 'Module One' };
export const dynamic = 'force-dynamic';

export default async function BriefPage() {
  if (!supabaseEnv()) redirect('/sign-in?next=/brief');
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect('/sign-in?next=/brief');
  const email = data.user.email ?? 'Signed in';
  return (
    <GatewayFrame
      account={
        <>
          <span className="gw-email">{email}</span>
          <Link href="/brief">Module One</Link>
          <form action={signOut}>
            <button className="gw-text-btn" type="submit">
              Sign out
            </button>
          </form>
        </>
      }
    >
      <ModuleOne userId={data.user.id} />
    </GatewayFrame>
  );
}
