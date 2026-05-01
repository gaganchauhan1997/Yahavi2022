/**
 * Global fetch interceptor.
 *
 * Catches 401/403 responses from our own WP API and auto-logs the user out,
 * then redirects to /login. Runs once per app session (singleton guard).
 *
 * IMPORTANT: many endpoints (badges/me, wallet/me, verify/status, chat/history)
 * are *soft* — they're called automatically by widgets that mount everywhere
 * (WalletBadge, VerifiedBadge, YahaviAI). For guests these will obviously
 * return 401, and we MUST NOT treat that as a session expiry. Only logouts
 * triggered by token-rejection codes from auth-guarded routes count.
 */
import { toast } from 'sonner';
import { getAuthToken } from './auth-token';
import { logout } from './auth';

let installed = false;

// Endpoints that authed widgets poll silently. A 401/403 here means
// "you're not signed in / token unknown to this resource" but should NEVER
// boot an already-authed user (e.g. stale soft-cache returning 401 for one
// resource shouldn't kill the whole session).
const SOFT_PATHS = [
  '/badges/me',
  '/wallet/me',
  '/verify/status',
  '/chat/history',
  '/chat/feedback',
  '/upsell',
];

// WP REST error codes that unambiguously mean "your token is invalid". Only
// these trigger an auto-logout. Anything else (e.g. rest_forbidden,
// woocommerce_rest_authentication_error) is per-resource and ignored.
const HARD_LOGOUT_CODES = new Set([
  'jwt_auth_invalid_token',
  'jwt_auth_no_auth_header',
  'rest_jwt_invalid',
  'rest_jwt_invalid_token',
  'rest_jwt_expired',
  'invalid_user_token',
  'rest_token_expired',
]);

export function installFetchInterceptor(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
    const response = await originalFetch(...args);

    const url = String(
      typeof args[0] === 'string'
        ? args[0]
        : args[0] instanceof Request
        ? args[0].url
        : String(args[0])
    );

    const isOurApi = url.includes('/wp-json/hackknow/v1/');
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/google') ||
      url.includes('/auth/forgot-password');
    const isSoftPath = SOFT_PATHS.some((p) => url.includes(p));

    if (
      (response.status === 401 || response.status === 403) &&
      isOurApi &&
      !isAuthEndpoint &&
      !isSoftPath &&
      getAuthToken()
    ) {
      // Only auto-logout if the server explicitly says the token is bad.
      // Clone first because the caller still wants to read the body.
      let isHardTokenError = false;
      try {
        const cloned = response.clone();
        const ct = cloned.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const body = await cloned.json().catch(() => null);
          if (body && typeof body === 'object' && typeof body.code === 'string') {
            isHardTokenError = HARD_LOGOUT_CODES.has(body.code);
          }
        }
      } catch {
        /* swallow — defensive */
      }

      if (isHardTokenError) {
        logout();
        toast.error('Your session has expired. Please sign in again.', {
          id: 'session-expired',
          duration: 3000,
        });
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    }

    return response;
  };
}
