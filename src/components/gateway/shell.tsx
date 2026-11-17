import Link from 'next/link';
import './gateway.css';

export function GatewayHeader({ account }: { account?: React.ReactNode }) {
  return (
    <header className="gw-header">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <Link href="/" className="gw-brand">
        Musaix <b>Pro</b>
      </Link>
      <nav className="gw-nav" aria-label="Account">
        {account ?? (
          <>
            <Link href="/sign-in">Sign in</Link>
            <Link className="gw-primary" href="/sign-up?next=/brief">
              Get early access
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

export function GatewayFooter() {
  return (
    <footer className="gw-footer">
      <p>Musaix Pro. AI is the instrument, never the hand.</p>
      <nav aria-label="Footer">
        <Link href="/investors#loop">The loop</Link>
        <Link href="/investors#module-one">Module One</Link>
        <Link href="/investors#workbench">Workbench</Link>
        <Link href="/sign-in">Sign in</Link>
        <Link href="/sign-up?next=/brief">Get early access</Link>
        <Link href="/audio">Audio</Link>
        <Link href="/studio">Studio</Link>
        <Link href="/canvas">Canvas</Link>
        <Link href="/research">Research</Link>
        <Link href="/visualizer">Visualizer</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/cockpit">Build status</Link>
      </nav>
    </footer>
  );
}

export function GatewayFrame({ children, account }: { children: React.ReactNode; account?: React.ReactNode }) {
  return (
    <div className="gateway">
      <GatewayHeader account={account} />
      <div className="gw-main" id="content">
        {children}
      </div>
      <GatewayFooter />
    </div>
  );
}
