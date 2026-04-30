/**
 * SSO bridge for HackKnow's first-party tools (e.g. ai.hackknow.com).
 * Allowed return origins only — never accept arbitrary URLs.
 *
 * Flow:
 *   - tool   → /auth/sso-bridge?return=https://ai.hackknow.com/
 *   - bridge → if logged in: window.location = return + #sso=<b64(userJson)>&token=<jwt>
 *              else: navigate('/login?redirect=' + encodeURIComponent(thisPathWithQuery))
 *   - tool   → reads fragment, persists, strips, signed in.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import { getAuthToken } from '@/lib/auth-token';

const ALLOWED_RETURN_ORIGINS = [
  'https://tdm.hackknow.com',
  'https://ai.hackknow.com',
  'http://localhost:5174',
];

export default function SSOBridgePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get('return') || '';
    const isLogout = params.get('logout') === '1';

    // Validate return URL
    let returnOrigin = '';
    try {
      const u = new URL(returnUrl);
      returnOrigin = u.origin;
    } catch {
      setError('Invalid return URL — bridge can only send you back to allowed HackKnow tools.');
      return;
    }
    if (!ALLOWED_RETURN_ORIGINS.includes(returnOrigin)) {
      setError(`Return origin "${returnOrigin}" is not on the allow-list.`);
      return;
    }

    // Logout intent — clear local session and bounce back to tool
    if (isLogout) {
      try { localStorage.removeItem('hackknow-user'); } catch {}
      try { localStorage.removeItem('hackknow-auth-token'); } catch {}
      window.location.replace(returnUrl);
      return;
    }

    // Need to be logged in
    if (!isAuthenticated()) {
      const here = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(here)}`, { replace: true });
      return;
    }

    const user = getCurrentUser();
    const token = getAuthToken();
    if (!user) {
      const here = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(here)}`, { replace: true });
      return;
    }

    // Encode user (and token if available) as base64 fragment
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
    };
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const sep = returnUrl.includes('#') ? '&' : '#';
    const tokenPart = token ? `&token=${encodeURIComponent(token)}` : '';
    window.location.replace(`${returnUrl}${sep}sso=${b64}${tokenPart}`);
  }, [navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {error ? (
          <>
            <div className="text-2xl font-bold text-red-500 mb-3">Bridge blocked</div>
            <p className="text-gray-300">{error}</p>
            <a href="/" className="inline-block mt-4 text-hack-yellow underline">Go home</a>
          </>
        ) : (
          <>
            <div className="w-10 h-10 border-2 border-hack-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-gray-300 font-mono text-sm">Signing you in to the tool…</div>
          </>
        )}
      </div>
    </div>
  );
}
