/* HackKnow service worker — v4 (2026-04-29)
 * - Network-first for navigation/HTML (so deploys are instant)
 * - Cache-first for hashed /assets/ (immutable)
 * - Stale-while-revalidate for /images/ and /fonts/
 * - Never caches /wp-json/, /graphql, /api/
 */
const VERSION = 'hackknow-v4-2026-04-29';
const ASSETS_CACHE = `${VERSION}-assets`;
const IMG_CACHE    = `${VERSION}-images`;
const HTML_CACHE   = `${VERSION}-html`;

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(HTML_CACHE).then((c) =>
      c.addAll(["/", "/offline.html"]).catch(() => undefined)
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

const isApi = (url) =>
  url.pathname.startsWith("/wp-json/") ||
  url.pathname.startsWith("/graphql") ||
  url.pathname.startsWith("/api/");

const isAsset = (url) => url.pathname.startsWith("/assets/");
const isImage = (url) =>
  url.pathname.startsWith("/images/") ||
  url.pathname.startsWith("/wp-content/") ||
  /\.(?:png|jpg|jpeg|webp|svg|ico)$/i.test(url.pathname);
const isFont  = (url) =>
  url.pathname.startsWith("/fonts/") ||
  /\.(?:woff2?|ttf|otf)$/i.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Only same-origin
  if (url.origin !== self.location.origin) return;
  // Never cache APIs
  if (isApi(url)) return;

  // 1) Hashed assets: cache-first, immutable
  if (isAsset(url)) {
    event.respondWith(cacheFirst(req, ASSETS_CACHE));
    return;
  }

  // 2) Images & fonts: stale-while-revalidate
  if (isImage(url) || isFont(url)) {
    event.respondWith(staleWhileRevalidate(req, IMG_CACHE));
    return;
  }

  // 3) Navigations / HTML: network-first with fallback
  if (req.mode === "navigate" ||
      (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(networkFirstHTML(req));
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

async function networkFirstHTML(req) {
  const cache = await caches.open(HTML_CACHE);
  const url = new URL(req.url);
  // Never let /offline.html (or any non-HTML response) overwrite the "/" shell cache.
  const isOfflinePage = url.pathname === "/offline.html";
  try {
    const res = await fetch(req, { cache: "no-store" });
    if (res && res.ok && !isOfflinePage) {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("text/html")) cache.put("/", res.clone());
    }
    return res;
  } catch {
    const cached = await cache.match("/");
    if (cached) return cached;
    const offline = await cache.match("/offline.html");
    if (offline) return offline;
    return new Response(
      "<!doctype html><meta charset='utf-8'><title>Offline</title>" +
      "<style>body{font:16px system-ui;padding:40px;text-align:center}</style>" +
      "<h1>You're offline</h1><p>Please reconnect and refresh to keep shopping HackKnow.</p>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
