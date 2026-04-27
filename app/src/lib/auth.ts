export interface AuthUser {
  name: string;
  email: string;
  phone?: string;
  joinedDate?: string;
  isVerified?: boolean;
}

const AUTH_TOKEN_KEY = "hackknow-auth-token";
const LEGACY_TOKEN_KEY = "hackknow_jwt";
const AUTH_USER_KEY = "hackknow-user";

export const isAuthenticated = (): boolean => {
  const token =
    localStorage.getItem(AUTH_TOKEN_KEY) ?? localStorage.getItem(LEGACY_TOKEN_KEY);
  const user = localStorage.getItem(AUTH_USER_KEY);
  return Boolean(token && user);
};

export const login = (token: string, user: AuthUser) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const logout = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem("hackknow-cart");
};

export const getCurrentUser = (): AuthUser | null => {
  try {
    const user = localStorage.getItem(AUTH_USER_KEY);
    return user ? (JSON.parse(user) as AuthUser) : null;
  } catch {
    return null;
  }
};
