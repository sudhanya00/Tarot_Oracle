// src/lib/authErrors.ts
// Turns Firebase / provider errors into messages people can act on.

const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/user-not-found': 'Incorrect email or password. Please try again.',
  'auth/wrong-password': 'Incorrect email or password. Please try again.',
  'auth/invalid-credential': 'Incorrect email or password. Please try again.',
  'auth/missing-password': 'Please enter your password.',
  'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your internet connection.',
};

const CANCELLED = ['auth/cancelled-popup-request', 'auth/popup-closed-by-user', 'ERR_CANCELED', '12501', 'SIGN_IN_CANCELLED'];

export function isAuthCancelled(err: any): boolean {
  return CANCELLED.includes(String(err?.code)) || /cancel/i.test(String(err?.message || ''));
}

export function friendlyAuthError(err: any): string {
  const code = String(err?.code || '');
  if (MESSAGES[code]) return MESSAGES[code];

  // src/lib/auth.ts already rewrites common failures into readable messages without a code.
  const message = String(err?.message || '');
  const raw = message.match(/auth\/[a-z-]+/)?.[0];
  if (raw && MESSAGES[raw]) return MESSAGES[raw];
  if (message && !raw && !/^Firebase/i.test(message)) return message.replace(/^Auth:\s*/, '');

  return 'Something went wrong. Please try again.';
}
