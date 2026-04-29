/**
 * Auth helpers — talk to our own /wp-json/hackknow/v1/auth/* REST endpoints
 * (registered by wp-content/mu-plugins/hackknow-checkout.php), so we do NOT
 * depend on the WPGraphQL JWT plugin being installed on WordPress.
 */
import { getAuthToken, setAuthToken, clearAuthToken } from "./auth-token";
import { WP_REST_BASE } from "./api-base";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  joinedDate?: string;
  isVerified?: boolean;
}

const AUTH_USER_KEY = "hackknow-user";
const AUTH_TIMEOUT_MS = 15_000;

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    const r = await fetch(`${WP_REST_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await r.json().catch(() => ({} as Record<string, unknown>));
    if (!r.ok) {
      const msg =
        (data && typeof data === "object" && "message" in data && typeof (data as { message?: unknown }).message === "string"
          ? ((data as { message: string }).message)
          : null) || `Request failed (${r.status})`;
      throw new Error(msg);
    }
    return data as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("The server took too long to respond. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

function persist(res: AuthResponse): AuthUser {
  setAuthToken(res.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
  return res.user;
}

export const isAuthenticated = (): boolean =>
  Boolean(getAuthToken() && localStorage.getItem(AUTH_USER_KEY));

export const getCurrentUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

export const updateCurrentUser = (updates: Partial<AuthUser>): void => {
  const current = getCurrentUser();
  if (!current) return;
  const updated = { ...current, ...updates };
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
};

export async function loginWithWordPress(email: string, password: string): Promise<AuthUser> {
  const res = await postJson<AuthResponse>("/auth/login", { email, password });
  return persist(res);
}

export async function registerWithWordPress(
  fullName: string,
  email: string,
  password: string,
  phone?: string
): Promise<AuthUser> {
  const res = await postJson<AuthResponse>("/auth/register", {
    full_name: fullName,
    email,
    password,
    phone,
  });
  return persist(res);
}

export const logout = (): void => {
  const user = getCurrentUser();
  const cartScopedKey = user?.id ? `hackknow-cart-${user.id}` : "hackknow-cart";
  const wishlistScopedKey = user?.id ? `hackknow-wishlist-${user.id}` : "hackknow-wishlist";
  clearAuthToken();
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(cartScopedKey);
  localStorage.removeItem(wishlistScopedKey);
  localStorage.removeItem("hackknow-cart");
};

export async function loginWithGoogle(idToken: string): Promise<AuthUser> {
  const res = await postJson<AuthResponse>("/auth/google", { id_token: idToken });
  return persist(res);
}

export async function loginWithGoogleToken(accessToken: string): Promise<AuthUser> {
  const res = await postJson<AuthResponse>("/auth/google", { access_token: accessToken });
  return persist(res);
}

export { getAuthToken };
