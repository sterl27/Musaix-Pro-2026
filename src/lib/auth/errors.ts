const LINK_ERRORS: Record<string, string> = {
  link: 'That link expired or was already used. Request a new one.',
  confirm: 'We could not confirm that email. Request a new link and try again.'
};

/** Null means the reset form should show the generic "link is on the way" state. */
export function passwordResetError(error: unknown): string | null {
  const code = typeof error === 'object' && error && 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error && typeof error.message === 'string'
        ? error.message
        : typeof error === 'string'
          ? error
          : '';
  if (code === 'user_not_found' || message.toLowerCase().includes('user not found')) return null;
  return authErrorMessage(error);
}

export function linkErrorMessage(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return LINK_ERRORS[code];
}

export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const text = message.toLowerCase();

  if (code === 'invalid_credentials' || text.includes('invalid login credentials') || text.includes('invalid credentials')) {
    return 'That email and password do not match.';
  }
  if (code === 'email_not_confirmed' || text.includes('email not confirmed')) {
    return 'Confirm your email first, then sign in. The link is in the inbox for the address you used.';
  }
  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    text.includes('rate limit') ||
    text.includes('too many requests')
  ) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (code === 'user_already_exists' || text.includes('already registered') || text.includes('user already')) {
    return 'An account with that email already exists. Sign in instead.';
  }
  if (code === 'weak_password' || text.includes('password should') || text.includes('weak password')) {
    return 'Choose a stronger password. Use at least 8 characters.';
  }
  if (code === 'same_password' || text.includes('should be different from the old password')) {
    return 'Choose a password you have not used here before.';
  }
  if (code === 'captcha_failed' || text.includes('captcha')) {
    return 'A captcha is required before this can go through, and this page does not have one yet.';
  }
  if (code === 'unexpected_failure' || text.includes('error sending') || text.includes('unable to send')) {
    return 'We could not send that email. Try again in a moment.';
  }
  if (code === 'signup_disabled' || text.includes('signups not allowed')) {
    return 'New accounts are paused right now. Sign in if you already have one.';
  }
  if (text.includes('not configured') || text.includes('missing supabase')) {
    return 'Accounts are not configured on this deployment yet.';
  }
  return 'Something went wrong. Try again in a moment.';
}
