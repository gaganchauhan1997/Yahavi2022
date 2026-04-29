/**
 * Global fetch interceptor.
 * Catches 401/403 responses from our own WP API and auto-logs the user out,
 * then redirects to /login. Runs once per app session (singleton guard).
 */
import { toast } from 'sonner';
import { getAuthToken } from './auth-token';
import { logout } from './auth';

let installed = false;

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

    if (
      (response.status === 401 || response.status === 403) &&
      isOurApi &&
      !isAuthEndpoint &&
      getAuthToken()
    ) {
      logout();
      toast.error('Your session has expired. Please sign in again.', {
        id: 'session-expired',
        duration: 3000,
      });
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }

    return response;
  };
}
