/**
 * Cross-subdomain SSO with www.hackknow.com.
 * Strategy:
 *  1. On load, check localStorage for cached user.
 *  2. If absent and URL has #sso= fragment, decode + persist + strip.
 *  3. Else redirect to https://www.hackknow.com/auth/sso-bridge?return=<here>
 *     (a tiny route on the main app that base64-encodes the user JSON
 *      from its own localStorage and bounces back with #sso=...)
 */

import { resetLaunch } from './keys';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isVerified?: boolean;
}

const KEY_USER = 'dmwt-user';
const SSO_BRIDGE = 'https://www.hackknow.com/auth/sso-bridge';

function decodeFragment(): AuthUser | null {
  if (!window.location.hash) return null;
  const m = /[#&]sso=([^&]+)/.exec(window.location.hash);
  if (!m) return null;
  try {
    const json = atob(decodeURIComponent(m[1]));
    const u = JSON.parse(json) as AuthUser;
    if (u && u.id && u.email) return u;
  } catch {}
  return null;
}

function stripFragment() {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

export function getCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(KEY_USER);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function persistUser(u: AuthUser): void {
  localStorage.setItem(KEY_USER, JSON.stringify(u));
}

export function clearUser(): void {
  localStorage.removeItem(KEY_USER);
}

export function logout(): void {
  clearUser();
  // Reset cinematic flag so the next successful login replays the Dead Man intro.
  resetLaunch();
  window.location.href = `${SSO_BRIDGE}?logout=1&return=${encodeURIComponent(window.location.origin)}`;
}

/** Resolve current user — handles fragment + redirect. Call once at app boot. */
export function resolveAuth(): AuthUser | null {
  // 1. Fragment incoming from SSO bridge — this is a FRESH login, replay cinematic.
  const fromFrag = decodeFragment();
  if (fromFrag) {
    persistUser(fromFrag);
    stripFragment();
    resetLaunch();
    return fromFrag;
  }
  // 2. Cached — already logged in this browser, no replay.
  const cached = getCachedUser();
  if (cached) return cached;
  return null;
}

export function redirectToLogin(): void {
  const ret = encodeURIComponent(window.location.origin + '/');
  window.location.href = `${SSO_BRIDGE}?return=${ret}`;
}
