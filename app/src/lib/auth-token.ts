const AUTH_TOKEN_KEY = 'hackknow-auth-token';
export const getAuthToken = (): string | null => localStorage.getItem(AUTH_TOKEN_KEY);
export const setAuthToken = (t: string) => localStorage.setItem(AUTH_TOKEN_KEY, t);
export const clearAuthToken = () => localStorage.removeItem(AUTH_TOKEN_KEY);
