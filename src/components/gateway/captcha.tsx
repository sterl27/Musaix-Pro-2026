'use client';

import { useEffect, useRef, useState } from 'react';

type CaptchaApi = {
  render: (el: HTMLElement, options: { sitekey: string; callback: (token: string) => void }) => void;
};

declare global {
  interface Window {
    hcaptcha?: CaptchaApi;
    turnstile?: CaptchaApi;
  }
}

/** Renders only when a public site key is configured. Supabase bot protection rejects auth without a token. */
export function CaptchaField() {
  const siteKey = process.env.NEXT_PUBLIC_SUPABASE_CAPTCHA_SITE_KEY;
  const provider = process.env.NEXT_PUBLIC_SUPABASE_CAPTCHA_PROVIDER === 'turnstile' ? 'turnstile' : 'hcaptcha';
  const host = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    if (!siteKey || !host.current) return;
    const script = document.createElement('script');
    script.src =
      provider === 'turnstile'
        ? 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        : 'https://js.hcaptcha.com/1/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      const api = provider === 'turnstile' ? window.turnstile : window.hcaptcha;
      if (!host.current || !api) return;
      api.render(host.current, { sitekey: siteKey, callback: setToken });
    };
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [provider, siteKey]);

  if (!siteKey) return null;
  return (
    <div>
      <div ref={host} />
      <input type="hidden" name="captcha_token" value={token} />
    </div>
  );
}
