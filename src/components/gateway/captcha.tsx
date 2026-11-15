'use client';

import { useEffect, useRef, useState } from 'react';

type WidgetId = string | number;

type CaptchaApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
    }
  ) => WidgetId;
  reset: (widgetId?: WidgetId) => void;
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
    let cancelled = false;
    let widgetId: WidgetId | undefined;
    const script = document.createElement('script');
    script.src =
      provider === 'turnstile'
        ? 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        : 'https://js.hcaptcha.com/1/api.js?render=explicit';
    script.async = true;
    const api = () => (provider === 'turnstile' ? window.turnstile : window.hcaptcha);
    const clearToken = () => setToken('');
    script.onload = () => {
      const captcha = api();
      if (cancelled || !host.current || !captcha || widgetId != null) return;
      widgetId = captcha.render(host.current, {
        sitekey: siteKey,
        callback: setToken,
        'expired-callback': clearToken,
        'error-callback': clearToken
      });
    };
    const form = host.current.closest('form');
    const onSubmit = () => {
      window.setTimeout(() => {
        clearToken();
        if (widgetId != null) api()?.reset(widgetId);
      }, 0);
    };
    form?.addEventListener('submit', onSubmit);
    document.head.appendChild(script);
    return () => {
      cancelled = true;
      form?.removeEventListener('submit', onSubmit);
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
