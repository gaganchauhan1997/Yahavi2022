/**
 * Central place to resolve the WordPress backend URL.
 *
 * Production:  VITE_WP_API_BASE is empty — all /wp-json/* requests go to
 *              https://www.hackknow.com which nginx-proxies to shop.hackknow.com.
 *              shop.hackknow.com is NEVER exposed to the browser.
 *
 * Development: set VITE_WP_API_BASE=https://shop.hackknow.com in .env.local
 */
const raw = (import.meta.env.VITE_WP_API_BASE as string | undefined);
export const API_BASE: string =
  (raw === undefined || raw === "") ? "" : raw.replace(/\/+$/, "");

export const WP_REST_BASE  = `${API_BASE}/wp-json/hackknow/v1`;
export const WP_GRAPHQL_URL = `${API_BASE}/graphql`;
