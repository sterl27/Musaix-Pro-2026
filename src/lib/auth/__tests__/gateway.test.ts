import { describe, expect, it } from 'vitest';
import { authErrorMessage, linkErrorMessage, passwordResetError } from '@/lib/auth/errors';
import { originFromHost } from '@/lib/auth/origin';
import { authRedirect, hidesGlobalPlayer, isQuietRoute, safeNext } from '@/lib/auth/paths';

describe('gateway auth helpers', () => {
  it('keeps same-origin next paths and drops open redirects', () => {
    expect(safeNext('/canvas')).toBe('/canvas');
    expect(safeNext('/brief?saved=1')).toBe('/brief?saved=1');
    expect(safeNext('https://evil.example/brief')).toBe('/brief');
    expect(safeNext('//evil.example')).toBe('/brief');
    expect(safeNext('/\\evil')).toBe('/brief');
    expect(safeNext('/\t/evil.example')).toBe('/brief');
    expect(safeNext('/\n/evil.example')).toBe('/brief');
    expect(safeNext('/\r/evil.example')).toBe('/brief');
    expect(safeNext(null, '/sign-in')).toBe('/sign-in');
    for (const attack of ['/\t/evil.example', '/\n/evil.example', '//evil.example', 'https://evil.example']) {
      const next = safeNext(attack);
      expect(new URL(next, 'https://sterlai.com').origin).toBe('https://sterlai.com');
    }
  });

  it('protects Module One and sends signed-in people past the auth pages', () => {
    expect(authRedirect('/brief', false)).toBe('/sign-in?next=%2Fbrief');
    expect(authRedirect('/audio', false)).toBeNull();
    expect(authRedirect('/research', false)).toBeNull();
    expect(authRedirect('/visualizer', false)).toBeNull();
    expect(authRedirect('/sign-in', true, '/canvas')).toBe('/canvas');
    expect(authRedirect('/sign-up', true, 'https://evil.example')).toBe('/brief');
    expect(authRedirect('/studio', true)).toBeNull();
  });

  it('hides the player on the investor page and auth pages', () => {
    expect(isQuietRoute('/')).toBe(false);
    expect(isQuietRoute('/investors')).toBe(true);
    expect(isQuietRoute('/sign-in')).toBe(true);
    expect(isQuietRoute('/auth/callback')).toBe(true);
    expect(isQuietRoute('/audio')).toBe(false);
    expect(isQuietRoute('/studio')).toBe(false);
    expect(isQuietRoute('/visualizer')).toBe(false);
    expect(hidesGlobalPlayer('/visualizer')).toBe(true);
    expect(hidesGlobalPlayer('/audio')).toBe(false);
    expect(hidesGlobalPlayer('/research')).toBe(false);
  });

  it('maps auth failures to plain language', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('That email and password do not match.');
    expect(authErrorMessage({ code: 'email_not_confirmed', message: 'Email not confirmed' })).toMatch(/Confirm your email/);
    expect(authErrorMessage({ code: 'over_request_rate_limit', message: 'rate limit' })).toMatch(/Wait a minute/);
    expect(authErrorMessage({ code: 'captcha_failed', message: 'captcha protection: request disallowed' })).toMatch(/captcha/);
    expect(authErrorMessage(new Error('database blew up'))).toBe('Something went wrong. Try again in a moment.');
    expect(passwordResetError({ code: 'captcha_failed', message: 'captcha protection' })).toMatch(/captcha/);
    expect(passwordResetError({ code: 'unexpected_failure', message: 'Error sending recovery email' })).toMatch(/could not send/i);
    expect(passwordResetError({ code: 'user_not_found', message: 'User not found' })).toBeNull();
    expect(linkErrorMessage('link')).toMatch(/expired/);
    expect(linkErrorMessage('nope')).toBeUndefined();
  });

  it('only builds email links for known hosts', () => {
    expect(originFromHost('sterlai.com', 'https')).toBe('https://sterlai.com');
    expect(originFromHost('musaix-pro-2026-git-preview-sterl27.vercel.app', 'https')).toBe('https://musaix-pro-2026-git-preview-sterl27.vercel.app');
    expect(originFromHost('localhost:3000', 'http')).toBe('http://localhost:3000');
    expect(originFromHost('evil.example', 'https')).toBe('https://sterlai.com');
  });
});
