// app/functions/_middleware.js
// Yahavi v2 edge intercept + WP reverse proxy.

import { handleYahaviChat } from './lib/yahavi-chat.js';

const WP_HOST   = 'https://shop.hackknow.com';
const CHAT_PATH = '/wp-json/hackknow/v1/chat';

function shouldProxy(p) {
  return p.startsWith('/wp-json/') || p.startsWith('/wp-admin/') || p.startsWith('/wp-content/') || p.startsWith('/wp-includes/');
}

export const onRequest = async ({ request, env, next }) => {
  const url = new URL(request.url);

  // ---- Yahavi v2 intercept: POST chat → run RAG+Gemini at the edge ----
  // We BUFFER the body once into a fixed ArrayBuffer so both the AI handler
  // AND the fallback WP proxy can consume it independently. Avoids
  // "body already used" errors caused by tee'd streams.
  let bufferedBody = null;
  let v2FallbackReason = null; // diagnostic: surfaced via x-yahavi-v2-fallback-reason header
  if (request.method === "POST" && url.pathname === CHAT_PATH) {
    try {
      bufferedBody = await request.arrayBuffer();
      const aiReq = new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: bufferedBody,
      });
      return await handleYahaviChat(aiReq, env);
    } catch (err) {
      // not_configured (no GCP_SA_JSON) or AI_FAILED → proxy to WP unchanged.
      const code = (err && err.code) || 'UNKNOWN';
      const rawMsg = String((err && err.message) || err || '');
      // RFC 7230: header value must be visible ASCII (no CR/LF/NUL/control chars).
      const msg = rawMsg.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
      v2FallbackReason = `${code}|${msg}`;
      console.warn("yahavi_v2_fallback_to_wp:", code, msg);
      // Fall through; bufferedBody is reused below.
    }
  }

  if (!shouldProxy(url.pathname)) return next();

  const upstream = new URL(url.pathname + url.search, WP_HOST);
  const proxyReq = new Request(upstream.toString(), {
    method: request.method,
    headers: request.headers,
    body: bufferedBody !== null ? bufferedBody : request.body,
    redirect: "manual",
  });
  proxyReq.headers.set("host", "shop.hackknow.com");
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) proxyReq.headers.set("x-forwarded-for", clientIp);
  proxyReq.headers.set("x-forwarded-host", url.hostname);
  proxyReq.headers.set("x-forwarded-proto", "https");

  let upstreamResp;
  try {
    upstreamResp = await fetch(proxyReq);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "upstream_fetch_failed", detail: String(err) }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }

  const respHeaders = new Headers(upstreamResp.headers);
  const setCookies = upstreamResp.headers.getAll
    ? upstreamResp.headers.getAll("set-cookie")
    : (upstreamResp.headers.get("set-cookie") ? [upstreamResp.headers.get("set-cookie")] : []);
  if (setCookies && setCookies.length) {
    respHeaders.delete("set-cookie");
    for (const c of setCookies) {
      const cleaned = c.replace(/;\s*Domain=[^;]+/i, "");
      respHeaders.append("set-cookie", cleaned);
    }
  }
  if (v2FallbackReason) {
    try { respHeaders.set("x-yahavi-v2-fallback-reason", v2FallbackReason); } catch (_) { /* invalid header value, swallow */ }
  }
  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    statusText: upstreamResp.statusText,
    headers: respHeaders,
  });
};
