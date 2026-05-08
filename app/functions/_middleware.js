// Cloudflare Pages middleware — reverse-proxy WordPress backend paths.
// Replaces the role GCE nginx played: same-origin proxy from the SPA at
// hackknow.com to WP REST/GraphQL on shop.hackknow.com.
//
// Why a Function (not _redirects)? CF Pages _redirects with status 200 rewrites
// silently drop POST/PUT/DELETE — they only work for GET. The login form does
// POST /wp-json/hackknow/v1/auth/login → 405 without this proxy.

const WP_HOST = "https://shop.hackknow.com";

// Paths that must be proxied to WordPress (everything else falls through to SPA).
const PROXY_PREFIXES = [
  "/wp-json/",
  "/wp-admin",      // covers /wp-admin and /wp-admin/*
  "/wp-content/",
  "/wp-includes/",
  "/wp-login.php",
  "/graphql",       // covers /graphql and /graphql/*
  "/xmlrpc.php",
];

function shouldProxy(pathname) {
  for (const p of PROXY_PREFIXES) {
    if (pathname === p) return true;
    if (pathname.startsWith(p)) return true;
    // trailing-slash-tolerant match
    if (p.endsWith("/") && pathname === p.slice(0, -1)) return true;
  }
  return false;
}

export const onRequest = async (context) => {
  const { request, next } = context;
  const url = new URL(request.url);

  if (!shouldProxy(url.pathname)) {
    // Not a WordPress path — let CF Pages serve the static SPA (or _redirects rules).
    return next();
  }

  // Build the upstream URL — preserve path + query verbatim.
  const upstream = new URL(url.pathname + url.search, WP_HOST);

  // Clone request with new URL. The Headers from the original request are
  // preserved (Authorization, Content-Type, Cookie, etc).
  const proxyReq = new Request(upstream.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "manual",
  });

  // Override Host so WordPress / LiteSpeed receive the right vhost.
  proxyReq.headers.set("host", "shop.hackknow.com");
  // Pass real client IP (CF already sets cf-connecting-ip; mirror for WP plugins).
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

  // Pass response through. Mutate headers to keep cookies usable on hackknow.com.
  const respHeaders = new Headers(upstreamResp.headers);
  // Strip any Set-Cookie Domain= attribute targeting shop.hackknow.com so the
  // cookie is set on hackknow.com (current visited host) instead.
  const setCookies = upstreamResp.headers.getAll
    ? upstreamResp.headers.getAll("set-cookie")
    : (upstreamResp.headers.get("set-cookie") ? [upstreamResp.headers.get("set-cookie")] : []);
  if (setCookies && setCookies.length) {
    respHeaders.delete("set-cookie");
    for (const c of setCookies) {
      // Drop "Domain=shop.hackknow.com" so it falls back to current host.
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
