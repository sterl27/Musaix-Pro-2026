import type { Metadata } from 'next';
import { GatewayFrame } from '@/components/gateway/shell';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <GatewayFrame>
      <article className="brief-head">
        <p className="gw-kicker">Early access</p>
        <h1>Privacy</h1>
        <p>Accounts are email and password, stored by the Supabase project this site already uses. We use that session to know who is signed in.</p>
        <p>Module One stays in this browser. The brief is not uploaded, and this page does not send it to a model.</p>
        <p>Audio you choose to save goes to your private library. Tracks you only open locally stay on the device.</p>
      </article>
    </GatewayFrame>
  );
}
