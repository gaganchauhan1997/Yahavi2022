// Cloudflare Pages middleware — reverse-proxy WordPress backend paths,
// AND intercept POST /wp-json/hackknow/v1/chat to serve Yahavi AI v2 from the
// edge (Vertex AI Search RAG + Gemini 2.5). When GCP_SA_JSON secret is unset
// or the AI call fails, transparently falls back to the WP chat endpoint.
//
// Why a Function (not _redirects)? CF Pages _redirects with status 200 rewrites
// silently drop POST/PUT/DELETE — they only work for GET. The login form does
// POST /wp-json/hackknow/v1/auth/login → 405 without this proxy.

import { handleYahaviChat } from './lib/yahavi-chat.js';

const WP_HOST   = "https://shop.hackknow.com";
const CHAT_PATH = "/wp-json/hackknow/v1/chat";

const PROXY_PREFIXES = [
  "/wp-json/", "/wp-admin", "/wp-content/", "/wp-includes/",
  "/wp-login.php", "/graphql", "/xmlrpc.php",
];

function shouldProxy(pathname) {
  for (const p of PROXY_PREFIXES) {
    if (pathname === p || pathname.startsWith(p)) return true;
    if (p.endsWith("/") && pathname === p.slice(0, -1)) return true;
  }
  return false;
}

export const onRequest = async (context) => {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // ---- Yahavi v2 intercept: POST chat → run RAG+Gemini at the edge ----
  // We BUFFER the body once into a fixed ArrayBuffer so both the AI handler
  // AND the fallback WP proxy can consume it independently. Avoids
  // "body already used" errors caused by tee'd streams.
  let bufferedBody = null;
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
      console.warn("yahavi_v2_fallback_to_wp:", err && err.code, err && err.message);
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
  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    statusText: upstreamResp.statusText,
    headers: respHeaders,
  });
};
