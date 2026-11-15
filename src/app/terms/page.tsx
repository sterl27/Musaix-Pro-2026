import type { Metadata } from 'next';
import { GatewayFrame } from '@/components/gateway/shell';

export const metadata: Metadata = { title: 'Terms' };

export default function TermsPage() {
  return (
    <GatewayFrame>
      <article className="brief-head">
        <p className="gw-kicker">Early access</p>
        <h1>Terms</h1>
        <p>Musaix Pro is in early access. You keep what you write. Module One is your brief, and the product does not generate it for you.</p>
        <p>Only upload music you have the rights to keep. The workbench tools can stay local. Saving to the library is a choice.</p>
        <p>These notes describe how the current build behaves. They are not a full legal policy.</p>
      </article>
    </GatewayFrame>
  );
}
