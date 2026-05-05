# HackKnow.com — Frontend ↔ WordPress ↔ Razorpay Architecture Map

> **Audit date:** May 2026 · branch `main` @ commit `06008a2` (pre-this-commit)
> **Scope:** every wire between the React SPA at `www.hackknow.com` and the WordPress backend at `shop.hackknow.com`, plus the full Razorpay payment + webhook lifecycle.
> **Read-only audit.** No backend code modified to produce this document.

---

## 0. Stack reality check (correcting a common assumption)

The frontend is **NOT Next.js**. It is:

| Layer | Tech | Evidence |
|---|---|---|
| Frontend framework | **React 19.2 + Vite 7.2** | `app/package.json` |
| Routing | `react-router-dom` 7.14 (client-side, BrowserRouter) | `app/package.json`, `app/src/main.tsx` |
| Data fetching | Native `fetch()` only | no `@tanstack/react-query`, no `swr`, no Apollo |
| GraphQL client | **Hand-rolled** (`fetch` → POST `{ query, variables }`) | `app/src/lib/graphql-client.ts` |
| Backend | **Headless WordPress** (WooCommerce + custom mu-plugins) on a Hostinger VPS, IP `145.223.124.144`, hostname `shop.hackknow.com` | nginx configs |
| Reverse proxy | **GCE nginx** at `www.hackknow.com` proxies `/wp-json/*` and `/graphql` to WordPress | `gce/nginx/hackknow.conf`, `gce/nginx-hackknow.conf` |
| Payments | **Razorpay** (UPI / cards / wallets) — INR only | `app/src/lib/razorpay.ts` |
| Build / deploy | Vite static build → committed/pushed → GitHub webhook → GCE auto-pull → `nginx -s reload` | `.github/workflows/*`, `gce/setup_gce.sh` |

There are **zero serverless functions** in the React app: no `pages/api/`, no `app/api/`, no Netlify/Vercel functions. Every dynamic call goes to WordPress over `/wp-json/*` (REST) or `/graphql` (WPGraphQL).

The lone separately-running Node service is `replit-api-server/chat.ts` — a thin OpenAI-proxy used by the **Yahavi AI** chat — and it does **not** sit in the storefront request path.

---

## 1. System topology

```
                      ┌─────────────────────────────┐
   Customer browser ─►│ CloudFlare (CDN, TLS, DDoS) │
                      └──────────────┬──────────────┘
                                     │
                                     ▼
                     ┌──────────────────────────────────┐
                     │   GCE nginx @ www.hackknow.com   │
                     │   (gce/nginx/hackknow.conf)      │
                     └─────────┬────────────┬───────────┘
                               │            │
            static SPA assets  │            │  /wp-json/*  /graphql  /wp-content/*
                               │            │
                               ▼            ▼
                ┌──────────────────┐  ┌────────────────────────────────────┐
                │ /var/www/        │  │  shop.hackknow.com (Hostinger VPS) │
                │ hackknow/dist    │  │  ─ WordPress + WooCommerce         │
                │ (Vite build)     │  │  ─ WPGraphQL plugin                │
                │   ↑              │  │  ─ mu-plugins (hackknow-*.php)     │
                │ pulled via       │  │  ─ MySQL                           │
                │ GitHub webhook   │  └────────────────┬───────────────────┘
                └──────────────────┘                   │
                                                       │ (server-to-server, HMAC-signed)
                                                       ▼
                                          ┌────────────────────────┐
                                          │  Razorpay              │
                                          │  webhook → /wp-json/   │
                                          │  hackknow/v1/          │
                                          │  razorpay-webhook      │
                                          └────────────────────────┘
```

### Key routing rules (from `gce/nginx/hackknow.conf` + `gce/nginx-hackknow.conf`)

| Path on `www.hackknow.com` | nginx action | Backed by |
|---|---|---|
| `/` (and any unknown) | `try_files $uri /index.html` | React SPA |
| `/assets/*`, `/images/*`, `/fonts/*` | static, `Cache-Control: public, immutable` | dist build |
| `/wp-json/*` | reverse-proxy → `https://145.223.124.144/wp-json/*` (Host header rewritten to `shop.hackknow.com`) | WordPress REST |
| `/graphql` | reverse-proxy → `https://145.223.124.144/graphql` | WPGraphQL |
| `/wp-content/*` | reverse-proxy → `https://145.223.124.144/wp-content/*` (uploads, theme images) | WordPress media |
| `/github-webhook` | proxy → local `127.0.0.1:9000` | deploy listener |
| `/sw.js`, `/service-worker.js` | force `Cache-Control: no-store` | hard-disabled (we killed SW) |
| `/site.webmanifest` | local file, 1-day cache | PWA manifest |

**Consequence:** the browser never sees `shop.hackknow.com`. To the user, everything is one origin. This sidesteps CORS and the Razorpay CSP `connect-src` rules in `gce/nginx.conf`:

```
script-src  'self' https://checkout.razorpay.com 'unsafe-inline'
connect-src 'self' https://lumberjack.razorpay.com https://api.razorpay.com
frame-src   https://api.razorpay.com https://checkout.razorpay.com
```

Razorpay is the only third-party origin allowed in CSP.

### Frontend base resolver (`app/src/lib/api-base.ts`)

```ts
const raw = import.meta.env.VITE_WP_API_BASE;
export const API_BASE      = raw ? raw.replace(/\/+$/, "") : "";
export const WP_REST_BASE  = `${API_BASE}/wp-json/hackknow/v1`;
export const WP_GRAPHQL_URL = `${API_BASE}/graphql`;
```

In production `VITE_WP_API_BASE` is empty → all calls are **relative** → caught by nginx → proxied to WordPress. This is the single point that the entire frontend's WP traffic flows through.

---

## 2. Frontend → WordPress traffic, file-by-file

All paths below are relative to `WP_REST_BASE = /wp-json/hackknow/v1` unless noted.

### 2.1 Auth & session

| Source file | Endpoint | Verb | Triggered by |
|---|---|---|---|
| `app/src/lib/auth.ts` | `/auth/login` | POST | LoginPage submit |
| `app/src/lib/auth.ts` | `/auth/register` | POST | SignupPage submit |
| `app/src/lib/auth.ts` | `/auth/google` | POST | Google SSO callback |
| `app/src/lib/auth.ts` | `/auth/me` | GET | App boot, on token present |
| `app/src/lib/auth.ts` | `/auth/forgot-password` | POST | ForgotPasswordPage |
| `app/src/lib/auth.ts` | `/auth/reset-password` | POST | ResetPasswordPage |
| `app/src/lib/fetch-interceptor.ts` | (singleton wrapper) | n/a | installed once at app boot — auto-logout on `jwt_auth_invalid_token` family of error codes; `SOFT_PATHS = ['/badges/me','/wallet/me','/verify/status','/chat/history','/chat/feedback','/upsell']` are immune so a 401 from one of these widgets cannot kick a logged-in user out |

**Token model:** server returns a JWT-style bearer; stored in `localStorage` via `auth-token.ts`; sent as `Authorization: Bearer <token>` on every authed call.

### 2.2 Catalog & content

| Source file | Endpoint | Verb | Notes |
|---|---|---|---|
| `app/src/lib/hk-content.ts` | `/course-categories`, `/courses`, `/courses/{slug}`, `/roadmaps`, `/roadmaps/{slug}`, `/releases`, `/release-types`, `/news/feed`, `/news/all` | GET | All read-only; `adaptRelease()` defensively normalizes legacy field names (`cta_url`/`cover`/`excerpt` → canonical `source_url`/`image`/`summary`) |
| `app/src/lib/hk-content.ts` | `/wp-json/hk/v1/get-verified` (different namespace!) | POST | MIS / student verification — handled by `zz-hk-get-verified.php`, **not** the main `hackknow/v1` namespace |
| `app/src/lib/hk-rss.ts` | `/news/feed?source=...` | GET | Live RSS bridge (server-side aggregation) |
| `app/src/lib/hk-brainx.ts` | `/brainxercise`, `/brainxercise/{slug}`, `/brainxercise/{slug}/check`, `/brainxercise-cats` | GET / POST | Excel-style spreadsheet exercises |
| `app/src/lib/hk-badges.ts` | `/me/badges`, `/wallet/me`, `/wallet/redeem`, `/community/me`, `/community/join`, `/sponsor/tiers`, `/sponsor/me`, `/sponsor/intent` | GET / POST | Header-badge polling, sponsor dashboard |
| `app/src/lib/yavi-wallet.ts` | `/wp-json/hk/v1/wallet/me`, `/wallet/topup/order`, `/wallet/topup/verify` | GET / POST | YAVI token wallet (1 YAVI = ₹1) — separate namespace from legacy wallet |

### 2.3 Storefront pages that fetch directly

| Page / component | Calls |
|---|---|
| `pages/BlogPage.tsx`, `pages/BlogPostPage.tsx` | `/wp-json/wp/v2/posts`, `/wp-json/wp/v2/categories` (vanilla WP REST) |
| `pages/ContactPage.tsx` | `/wp-json/wp/v2/contact-form` (custom CF7-bridge) |
| `pages/SitemapPage.tsx` | aggregates `/wp-json/wp/v2/posts`, `/wp-json/wp/v2/pages`, products via WPGraphQL |
| `components/CategorySidebar.tsx` | `/wp-json/wp/v2/product_cat` |
| `components/SocialProofToast.tsx`, `components/SocialFeedStrip.tsx` | `/wp-json/hackknow/v1/recent-orders` (anonymized first names + city) |
| `components/Footer.tsx` | `/wp-json/hackknow/v1/newsletter/subscribe` (POST) |
| `components/ExitIntentModal.tsx` | `/wp-json/hackknow/v1/coupon/exit-intent` (POST) |

### 2.4 GraphQL footprint (small but real)

`app/src/lib/graphql-client.ts` is a 90-line hand-written client. Two queries are exported:

| Query | Used by | Purpose |
|---|---|---|
| `GET_PRODUCTS_QUERY` (paginates 100/page, max 20 pages = 2000 products) | `context/StoreContext.tsx` (boot) | Hydrate the entire WooCommerce catalog into client state once |
| `GET_PRODUCT_BY_SLUG_QUERY` | `pages/ProductPage.tsx` | Fast path for a single product detail without waiting for full pagination |

**WPGraphQL is the only place WPGraphQL is used.** `auth.ts` references `WP_GRAPHQL_URL` for legacy reasons but does not currently issue any GraphQL mutations. Everything else is REST.

### 2.5 What's NOT in the codebase (intentional)

- ❌ **No Apollo Client / urql / @tanstack/react-query** — keeps bundle small; relies on React state
- ❌ **No service worker** (deliberately killed in commit `1020b95a` to fix the "needs reload" first-load bug — `index.html` actively unregisters any prior SW)
- ❌ **No serverless API routes** — purely SPA + WP backend
- ❌ **No SSR / hydration** — Vite outputs a static `index.html` shell

---

## 3. WordPress REST routes (the backend half)

All custom routes live under the `hackknow/v1` namespace and are registered by mu-plugins. Three plugins matter:

### 3.1 `hostinger/mu-plugins/hackknow-checkout.php` (2,855 lines — the core)

Registers the bulk of the custom REST API. From `register_rest_route` calls (lines 169–197, 2319+):

| Route | Method | Callback | Auth |
|---|---|---|---|
| `/auth/register` | POST | `hackknow_auth_register` | open |
| `/auth/login` | POST | `hackknow_auth_login` | open |
| `/auth/google` | POST | `hackknow_auth_google` | open |
| `/auth/me` | GET | `hackknow_auth_me` | bearer |
| `/auth/forgot-password` | POST | `hackknow_forgot_password` | open |
| `/auth/reset-password` | POST | `hackknow_reset_password` | open |
| `/admin/analytics` | GET | `hackknow_analytics` | admin |
| `/my-orders` | GET | `hackknow_my_orders` | bearer (overridden by `zz-hackknow-payment-fix.php` — see §3.2) |
| `/my-downloads` | GET | `hackknow_my_downloads` | bearer (overridden) |
| `/order` | POST | `hackknow_create_order` | bearer (logged-in checkout) |
| `/verify` | POST | `hackknow_verify_payment` | bearer (Razorpay client-side signature verify) |
| `/wishlist`, `/wishlist/toggle` | GET / POST | `hackknow_wishlist_*` | bearer |
| `/products/{id}/reviews` | GET / POST | `hackknow_reviews_*` | open / bearer |
| `/admin/reviews/*` | GET / POST / DELETE | `hackknow_admin_review_*` | admin |
| `/chat` | POST | `hackknow_chat` | open (rate-limited) |
| `/chat/history` | GET / POST / DELETE | `hackknow_chat_history_*` | bearer (soft) |
| `/chat/feedback` | POST | `hackknow_chat_feedback` | open |
| `/coupon/validate` | POST | `hackknow_coupon_validate` | open |
| `/upsell` | GET | `hackknow_upsell_get` | open |
| `/newsletter/subscribe` | POST | `hackknow_newsletter_subscribe` | open |

A `rest_api_init` filter forces `Cache-Control: no-store` and `X-LiteSpeed-Cache-Control: no-cache` on every `/hackknow/v1/*` and `/wc/*` response — critical for payment/order endpoints where stale caching is catastrophic.

### 3.2 `hostinger/mu-plugins/zz-hackknow-payment-fix.php` (1,555 lines — payments)

> **Standing rule: do not modify this file.** Read-only audit only.

The `zz-` prefix means it loads **after** `hackknow-checkout.php` (alphabetical ordering of mu-plugins), which lets it **override** earlier route handlers and add the Razorpay webhook receiver.

| Route | Method | Callback | Purpose |
|---|---|---|---|
| `/razorpay-webhook` | POST | `hk2_razorpay_webhook` | **The webhook receiver — see §4** |
| `/my-downloads` | GET | `hk2_my_downloads` | **Overrides** the earlier handler — does an email-scoped lookup so guest checkouts and pre-account history both surface, with NO download expiry |
| `/my-orders` | GET | `hk2_my_orders` | Same email-scoped override |
| `/downloads-by-email` | POST | `hk2_downloads_by_email_request` | Guest-friendly: emails a 24h magic link with download list |
| `/downloads-by-token` | GET | `hk2_downloads_by_token` | Resolves the magic-link token |
| `/product-availability` | GET | `hk2_product_availability` | Public map `{product_id: {has_file, file_count}}` — drives the "Hide NO-FILE products" feature on the storefront |
| `/bootstrap-secret` | POST | (anon, single-use) | One-shot helper to set the webhook secret without SSH access; auto-locks after first use |
| `/webhook-self-test` | POST | admin-only | Posts a synthetic HMAC-signed payload to its own webhook endpoint to verify the secret + signature pipeline end-to-end |
| `/request-product` | POST | open | "Request a product" form (lives here for proximity to availability data) |

The plugin also hooks `woocommerce_order_status_completed` to fire its own branded HTML email with direct file URLs to the billing email — runs whether the order completed via `/verify`, the webhook, or admin manual.

### 3.3 `hostinger/mu-plugins/hackknow-extras.php` (828 lines — wallet/badges/sponsors REST)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/wallet/me` | GET | logged-in | Coin balance + recent ledger |
| `/wallet/transactions` | GET | logged-in | Full ledger (paginated) |
| `/wallet/recharge` | POST | logged-in | Razorpay order for wallet topup |
| `/wallet/bonus-quote` | GET | open | "Spend ₹X, get Y bonus coins" calculator |
| `/badges/me` | GET | logged-in | All badges earned |
| `/badges/tiers` | GET | open | All possible badge tiers |
| `/coupons/me` | GET | logged-in | Personal coupon inventory |
| `/sponsors/top` | GET | open | Wall-of-sponsors leaderboard |

### 3.4 Other mu-plugins (used but not extended in this map)

- `hackknow-content.php` — courses, roadmaps, releases content endpoints (the GETs `hk-content.ts` consumes)
- `hackknow-brainx.php` — Brainxercise spreadsheet endpoints
- `hackknow-wallet.php` — older wallet (legacy, partially superseded by `hackknow-extras.php`)
- `hackknow-content-seed.php` — one-shot seed data for fresh installs
- `zz-hk-dbtools.php` — admin-only DB inspection helpers

---

## 4. Razorpay end-to-end lifecycle

This is the most critical path in the system. Here is exactly how a sponsor donation or product purchase travels from button click to "order complete" — including the **webhook back-channel** that closes the loop independent of the browser.

### 4.1 The two completion channels

A Razorpay order has **two independent ways to be marked completed in WordPress** — and both must work:

| Channel | Trigger | Path |
|---|---|---|
| **A. Client-side verify** | Razorpay popup `handler` fires after payment | Browser → `POST /verify` → WordPress verifies HMAC signature → marks order complete |
| **B. Server-side webhook** | Razorpay servers POST after capture | Razorpay → `POST /razorpay-webhook` (server-to-server) → WordPress verifies HMAC → marks order complete (idempotent) |

Channel B is the safety net. If the user closes the browser before `handler` fires, channel A never runs. The webhook eventually delivers anyway, and the customer gets their email + downloads.

### 4.2 Front-end flow (logged-in product checkout)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ pages/CheckoutPage.tsx                                                      │
│                                                                             │
│ 1. User clicks "Pay ₹X"                                                     │
│                                                                             │
│ 2. createServerOrder()                  → POST /wp-json/hackknow/v1/order   │
│    (lib/checkout-api.ts, 25s timeout)                                       │
│    body: { items, email, phone, first_name, last_name }                     │
│    response: { wc_order_id, razorpay_order, amount, currency, key_id }      │
│                                                                             │
│ 3. loadRazorpay()                       → injects checkout.razorpay.com/v1  │
│    (lib/razorpay.ts)                      /checkout.js if not already       │
│                                                                             │
│ 4. new window.Razorpay({                                                    │
│      key: response.key_id,              ← ALWAYS use server-issued key      │
│      order_id: response.razorpay_order,                                     │
│      amount, currency,                                                      │
│      handler: callback                                                      │
│    }).open()                                                                │
│                                                                             │
│ 5. ─── User completes payment in Razorpay popup ───                         │
│                                                                             │
│ 6. handler({ razorpay_order_id, razorpay_payment_id, razorpay_signature })  │
│    fires in browser                                                         │
│                                                                             │
│ 7. verifyServerPayment()                → POST /wp-json/hackknow/v1/verify  │
│    (lib/checkout-api.ts, NO timeout)      body: signature triple +          │
│                                           wc_order_id                       │
│                                           response: { downloads: [...] }    │
│                                                                             │
│ 8. On success → /thank-you with downloads                                   │
│    On failure / timeout → /order-pending?orderId=…                          │
│                          (polls webhook completion)                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key safety details from `app/src/lib/razorpay.ts`:**

- The Razorpay key is **resolved server-side first**, env var only as a dev fallback. If neither is a real `rzp_live_*` / `rzp_test_*` key the call is rejected with a user-visible toast (no silent drops).
- `escape: false, backdropclose: false` on the modal — the user must explicitly click X or pay, can't accidentally dismiss.
- `payment.failed` is wired to a separate handler so failures get a toast and a clean callback; they don't masquerade as success.
- `verifyServerPayment` deliberately uses **no timeout** — the payment is already captured; aborting verify would put the order in a limbo state. The UI compensates by surfacing `/order-pending` if `verify` doesn't resolve quickly.

### 4.3 Front-end flow (guest sponsor donation)

`pages/SponsorPage.tsx` is the only fully-anonymous payment path. It uses a different namespace pair — `/sponsor-guest/order` + `/sponsor-guest/verify` — that requires no JWT. Apart from that, the choreography is identical to §4.2.

### 4.4 Front-end flow (YAVI wallet topup)

`components/WalletPanel.tsx` calls `yaviWallet.createOrder(inr)` → opens Razorpay → on success calls `yaviWallet.verify(...)`. Its REST endpoints live under `/wp-json/hk/v1/wallet/topup/*` (registered by `zz-hk-wallet.php`, separate from the main checkout flow).

### 4.5 Server-side: `/order` handler (`hackknow_create_order` in `hackknow-checkout.php`)

1. Validates JWT + cart payload
2. Creates a WooCommerce order in `pending` state
3. Creates a Razorpay order via Razorpay API (server-side, using secret key) — amount in paise
4. Returns `{ wc_order_id, razorpay_order, key_id }` to the browser

### 4.6 Server-side: `/verify` handler (`hackknow_verify_payment` in `hackknow-checkout.php`)

1. Receives `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, wc_order_id }`
2. Computes `hash_hmac('sha256', razorpay_order_id + '|' + razorpay_payment_id, RAZORPAY_KEY_SECRET)`
3. Constant-time-compares against `razorpay_signature`
4. If match → marks WC order `completed`, fires `woocommerce_order_status_completed` action, returns `{ downloads: [...] }`
5. If mismatch → 400 with code `signature_mismatch`

### 4.7 Server-side: `/razorpay-webhook` handler (`hk2_razorpay_webhook` in `zz-hackknow-payment-fix.php`)

This is the back-channel that runs whether or not the browser ever made it back to your site.

```
Razorpay's servers
   │
   │  POST https://www.hackknow.com/wp-json/hackknow/v1/razorpay-webhook
   │  Headers: X-Razorpay-Signature: <hmac>
   │  Body:    { event: "payment.captured", payload: { payment: { entity: {...} } } }
   │
   ▼
GCE nginx ─── proxy_pass ───► shop.hackknow.com (WordPress)
   │
   ▼
hk2_razorpay_webhook() in zz-hackknow-payment-fix.php (line 291)
   │
   ├─ 1. Look up shared secret from option 'hk_rzp_webhook_secret'
   │     (set via /wp-admin "HackKnow Webhook Settings" page, or
   │      one-shot /bootstrap-secret REST call, or
   │      HACKKNOW_RAZORPAY_WEBHOOK_SECRET constant)
   │
   ├─ 2. raw body  = file_get_contents('php://input')
   │     given_sig = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE']
   │     expected  = hash_hmac('sha256', raw_body, $secret)
   │     hash_equals(expected, given_sig)  ← constant-time
   │     ✗ → return 401, log audit row
   │     ✓ → continue
   │
   ├─ 3. Decode JSON. Filter to event = 'payment.captured'.
   │     Other events (subscription.*, refund.*) are accepted but no-op.
   │
   ├─ 4. Idempotency check: have we already processed this payment_id?
   │     SELECT 1 FROM {wp_}postmeta WHERE meta_value = $payment_id
   │     ✓ already done → return 200 { duplicate: true }, do nothing
   │     ✗ → continue
   │
   ├─ 5. Resolve the WooCommerce order:
   │     by Razorpay notes.wc_order_id (set when /order created the order)
   │     fallback: by Razorpay notes.email + amount + recent timestamp
   │
   ├─ 6. wc_order->update_status('completed', 'Razorpay webhook ✓')
   │     This fires the woocommerce_order_status_completed action ─┐
   │                                                               │
   ├─ 7. Stamp postmeta:                                           │
   │       _razorpay_payment_id, _razorpay_order_id,               │
   │       _hk_webhook_processed_at                                │
   │                                                               │
   └─ 8. Return 200 { ok: true }                                   │
                                                                   │
                       ┌───────────────────────────────────────────┘
                       ▼
   woocommerce_order_status_completed hook fires
   ├─ WC core: triggers customer "order completed" email
   └─ Our hook (hackknow-checkout.php): sends our own branded HTML
      email with direct file URLs to the billing email
```

### 4.8 Webhook secret management

| Mechanism | Where | When to use |
|---|---|---|
| `define('HACKKNOW_RAZORPAY_WEBHOOK_SECRET', '...')` in `wp-config.php` | Highest precedence | Production (recommended) |
| WP option `hk_rzp_webhook_secret` set via `/wp-admin` → "HackKnow Webhook Settings" page | Persisted in `{wp_}options` | Owner-set via UI |
| `POST /wp-json/hackknow/v1/bootstrap-secret` (one-shot, auto-locks after first use) | Anon, fires once | Initial setup without SSH |

After any change, the admin can run **`POST /wp-json/hackknow/v1/webhook-self-test`** which crafts a signed dummy payload, posts it back to `/razorpay-webhook`, and reports whether the round-trip verified — confirming the secret matches before going live.

### 4.9 Failure modes & fail-safes observed

| Scenario | What saves the customer |
|---|---|
| Razorpay popup closes before `handler` fires | Webhook completes the order asynchronously |
| Browser → `/verify` fails with network error | UI redirects to `/order-pending?id=…` which polls for webhook completion every 3s |
| Webhook fires twice (Razorpay retry) | Idempotency check on `payment_id` returns `{ duplicate: true }` — no double email, no double credit |
| Webhook fires before `/verify` | `/verify` later finds the order already `completed`, treats as success |
| Email delivery fails | `/my-downloads` (email-scoped, no expiry) lets the customer self-serve forever |
| User checked out as guest, never made an account | `/downloads-by-email` mails a 24h magic link to the billing email |

---

## 5. Quick lookup — "Where do I touch this?"

| If you want to change… | Edit this file | Restart needed? |
|---|---|---|
| Where the SPA points its API requests | `app/src/lib/api-base.ts` (env var `VITE_WP_API_BASE`) | rebuild + redeploy SPA |
| How JWT logout-on-401 behaves | `app/src/lib/fetch-interceptor.ts` (especially the `SOFT_PATHS` allowlist) | rebuild + redeploy SPA |
| How the Razorpay popup is opened | `app/src/lib/razorpay.ts` | rebuild + redeploy SPA |
| Add a new custom REST route | `hostinger/mu-plugins/hackknow-extras.php` (or a new `hackknow-*.php`) | upload via SFTP — WP picks up mu-plugins automatically |
| The Razorpay webhook receiver itself | `hostinger/mu-plugins/zz-hackknow-payment-fix.php` ⚠ **STANDING RULE: do not modify** | n/a |
| nginx proxy / cache rules | `gce/nginx/hackknow.conf` (active) — keep `gce/nginx-hackknow.conf` and `gce/nginx.conf` in sync as backups | `nginx -s reload` on GCE |
| GraphQL schema consumed by storefront | `app/src/lib/graphql-client.ts` (queries) + WPGraphQL plugin in WP admin | rebuild + redeploy SPA |
| Yahavi AI chat backend | `replit-api-server/chat.ts` (Replit) **and** `/wp-json/hackknow/v1/chat` handler in `hackknow-checkout.php` | depends on which side |

---

## 6. Audit trail

Files read to produce this document (no edits):

```
app/package.json
app/src/main.tsx
app/src/lib/api-base.ts
app/src/lib/auth.ts
app/src/lib/fetch-interceptor.ts
app/src/lib/hk-content.ts
app/src/lib/hk-rss.ts
app/src/lib/hk-brainx.ts
app/src/lib/hk-badges.ts
app/src/lib/yavi-wallet.ts
app/src/lib/checkout-api.ts
app/src/lib/razorpay.ts
app/src/lib/graphql-client.ts
app/src/types/razorpay.ts
app/src/data/products.ts
app/src/context/StoreContext.tsx
app/src/components/WalletPanel.tsx
app/src/pages/CheckoutPage.tsx
app/src/pages/OrderPendingPage.tsx
app/src/pages/SponsorPage.tsx
hostinger/mu-plugins/hackknow-checkout.php       (read register_rest_route + webhook context only)
hostinger/mu-plugins/zz-hackknow-payment-fix.php (read register_rest_route + webhook context only — NOT MODIFIED)
hostinger/mu-plugins/hackknow-extras.php
hostinger/mu-plugins/hackknow-content.php
gce/nginx/hackknow.conf
gce/nginx-hackknow.conf
gce/nginx.conf
```

End of map.
