// Same-origin WordPress proxy. Never put browser credentials in a shared cache.
import { handleYahaviChat } from './lib/yahavi-chat.js';
import { jsonError, readBoundedBody, secureHeaders, validChatPayload } from './lib/http-security.js';

const WP_HOST = 'https://shop.hackknow.com';
const CHAT_PATH = '/wp-json/hackknow/v1/chat';
export function shouldProxy(path) {
  return ['/wp-json/', '/wp-admin/', '/wp-content/', '/wp-includes/'].some(p => path.startsWith(p))
    || ['/graphql', '/wp-admin', '/wp-login.php'].includes(path)
    || path.startsWith('/graphql/');
}

export const onRequest = async ({ request, env, next }) => {
  const url = new URL(request.url);
  if (!shouldProxy(url.pathname)) return next();
  let bufferedBody = null;
  let fallback = false;
  if (request.method === 'POST' && url.pathname === CHAT_PATH) {
    try { bufferedBody = await readBoundedBody(request); }
    catch (err) { return jsonError(err instanceof RangeError ? 413 : 400, err instanceof RangeError ? 'payload_too_large' : 'invalid_body'); }
    let body;
    try { body = JSON.parse(new TextDecoder().decode(bufferedBody)); }
    catch { return jsonError(400, 'invalid_json'); }
    if (!validChatPayload(body)) return jsonError(400, 'invalid_chat_payload');
    // Optional platform binding: provision only on a plan supporting this binding.
    // Session IDs are user-controlled and are never used as the sole rate-limit key.
    if (env.CHAT_RATE_LIMITER) {
      const ip = request.headers.get('cf-connecting-ip');
      if (!ip) return jsonError(400, 'client_address_required');
      const result = await env.CHAT_RATE_LIMITER.limit({ key: ip });
      if (!result.success) return jsonError(429, 'rate_limited');
    }
    try {
      const response = await handleYahaviChat(new Request(request.url, {
        method: 'POST', headers: request.headers, body: bufferedBody,
      }), env);
      return new Response(response.body, { status: response.status, headers: secureHeaders(response.headers) });
    } catch {
      fallback = true;
      console.warn('yahavi_edge_fallback'); // No provider response/credentials in public headers.
    }
  }

  const headers = new Headers(request.headers);
  headers.set('host', new URL(WP_HOST).hostname);
  headers.delete('x-forwarded-for');
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) headers.set('x-forwarded-for', ip);
  headers.set('x-forwarded-host', url.hostname);
  headers.set('x-forwarded-proto', 'https');
  const upstream = new URL(url.pathname + url.search, WP_HOST);
  let response;
  try {
    response = await fetch(upstream, {
      method: request.method, headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : (bufferedBody ?? request.body),
      redirect: 'manual', signal: AbortSignal.timeout(45_000),
    });
  } catch { return jsonError(502, 'upstream_unavailable'); }

  const privateResponse = url.pathname.startsWith('/wp-json') || url.pathname.startsWith('/graphql')
    || url.pathname.startsWith('/wp-admin') || url.pathname === '/wp-login.php'
    || headers.has('authorization') || headers.has('cookie') || response.headers.has('set-cookie');
  const out = secureHeaders(response.headers, privateResponse);
  const cookies = response.headers.getSetCookie?.() || response.headers.getAll?.('set-cookie') || [];
  if (cookies.length) {
    out.delete('set-cookie');
    for (const cookie of cookies) out.append('set-cookie', cookie.replace(/;\s*Domain=[^;]+/i, ''));
  }
  const location = out.get('location');
  if (location) {
    try {
      const target = new URL(location, upstream);
      if (target.origin === WP_HOST) out.set('location', `${url.origin}${target.pathname}${target.search}${target.hash}`);
    } catch { out.delete('location'); }
  }
  if (fallback) out.set('x-yahavi-fallback', 'wordpress');
  out.delete('x-yahavi-v2-fallback-reason');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: out });
};
