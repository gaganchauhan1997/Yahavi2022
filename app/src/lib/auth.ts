import { fetchGraphQL } from './graphql-client';
import { getAuthToken, setAuthToken, clearAuthToken } from './auth-token';

export interface AuthUser { id: string; name: string; email: string; }
const AUTH_USER_KEY = 'hackknow-user';

const LOGIN_MUTATION = `
  mutation Login($username: String!, $password: String!) {
    login(input: { username: $username, password: $password }) {
      authToken
      user { id name email }
    }
  }`;

const REGISTER_MUTATION = `
  mutation Register($username: String!, $email: String!, $password: String!) {
    registerUser(input: { username: $username, email: $email, password: $password }) {
      user { id name email }
    }
  }`;

export const isAuthenticated = (): boolean =>
  Boolean(getAuthToken() && localStorage.getItem(AUTH_USER_KEY));

export const getCurrentUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch { return null; }
};

export const loginWithWordPress = async (email: string, password: string): Promise<AuthUser> => {
  const data = await fetchGraphQL(LOGIN_MUTATION, { username: email, password });
  const token = data?.login?.authToken;
  const user  = data?.login?.user;
  if (!token || !user) throw new Error('Invalid credentials');
  setAuthToken(token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  return user;
};

export const registerWithWordPress = async (
  fullName: string, email: string, password: string
): Promise<AuthUser> => {
  const username = fullName.trim().replace(/\s+/g, '_').toLowerCase() || email.split('@')[0];
  await fetchGraphQL(REGISTER_MUTATION, { username, email, password });
  return loginWithWordPress(email, password);
};

export const logout = () => {
  clearAuthToken();
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem('hackknow-cart');
};

export { getAuthToken };
