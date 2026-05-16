# FOUNDER.md — HackKnow System Overview

> **Founder's guide:** This file explains how the entire system works,
> what to touch, what to never touch, and which credentials are needed for the build.
> Make sure any developer or AI reads this file before being given access.

---

## How the System Works

### In Simple Terms

```
User (browser)
  ↓  goes to www.hackknow.com
Cloudflare Pages
  ↓  serves React website (static files)
  ↓  If request is for /wp-json/* or /graphql...
Cloudflare Workers (_middleware.js)
  ↓  silently forwards the request
WordPress (shop.hackknow.com — Hostinger)
  ↓  returns products, orders, auth data
User receives the response
  (shop.hackknow.com is never visible in the browser)
```

### Connections — What Talks to What

| From | To | Path | Purpose |
|------|----|------|---------|
| Browser | Cloudflare Pages | `www.hackknow.com/*` | React frontend serve |
| Browser | Cloudflare Workers | `www.hackknow.com/graphql` | Product catalog (WPGraphQL) |
| Browser | Cloudflare Workers | `www.hackknow.com/wp-json/*` | Auth, Orders, Checkout |
| Browser | Cloudflare Workers | `www.hackknow.com/wp-content/*` | Product images |
| Cloudflare Workers | WordPress (Hostinger) | `shop.hackknow.com/graphql` | Actual GraphQL data |
| Cloudflare Workers | WordPress (Hostinger) | `shop.hackknow.com/wp-json/*` | Actual REST data |
| Browser | Razorpay CDN | `checkout.razorpay.com` | Payment popup |
| WordPress | Razorpay API | Server-side | Payment verify + webhook |

---

## What to Set in the Cloudflare Dashboard

**Cloudflare → Pages → hackknow → Settings → Environment Variables:**

| Variable | What It Is |
|----------|---------|
| `VITE_RAZORPAY_KEY_ID` | Razorpay live key (rzp_live_...) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `VITE_WP_API_BASE` | **Leave empty** — the proxy handles it |

---

## DO NOT TOUCH

| Item | Why Not |
|-------|-----------|
| `app/functions/_middleware.js` proxy logic | This is the entire bridge — if broken, the site goes dark |
| Setting any value for `VITE_WP_API_BASE` | Must remain empty — otherwise the backend gets exposed |
| Putting `shop.hackknow.com` in public links | The backend must never be visible to users |
| Desktop PageSpeed settings | Desktop is at 95/100 — do not change anything |
| `app/public/_redirects`'s `/* /index.html 200` | This is SPA routing — removing it causes 404s |
| `app/public/fonts/` folder | These are self-hosted fonts — removing them causes Google Fonts to load (1700ms penalty) |
| WordPress mu-plugins folder on Hostinger | `hackknow-checkout.php` handles orders and downloads |

---

## Credentials Needed for the Build

### Cloudflare Pages Build (Automatic when you push to GitHub)

| Credential | Where to Set | What It Is |
|-----------|----------------|---------|
| `VITE_RAZORPAY_KEY_ID` | CF Pages → Environment Variables | Razorpay public key (rzp_live_...) |
| `VITE_GOOGLE_CLIENT_ID` | CF Pages → Environment Variables | Google OAuth Client ID |
| `VITE_WP_API_BASE` | CF Pages → Environment Variables | **Keep empty** |

### Replit (For deploy automation)

| Credential | Purpose |
|-----------|---------|
| `GITHUB_TOKEN` | For pushing code to the GitHub repo (Contents read+write required) |
| `HOSTINGER_SFTP_HOST` | For uploading WordPress files via SFTP |
| `HOSTINGER_SFTP_USER` | Hostinger SFTP username |
| `HOSTINGER_SFTP_PASSWORD` | Hostinger SFTP password |
| `RAZORPAY_KEY_ID` | Razorpay live key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret (for webhook verification) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID |

### WordPress (Already set on Hostinger)
- WooCommerce must be active
- WPGraphQL plugin must be active
- `hackknow-checkout.php` must be deployed in mu-plugins
- Razorpay WordPress plugin must be configured

---

## Key Files — What Lives Where

```
app/
├── functions/
│   ├── _middleware.js          ← MOST CRITICAL — Cloudflare Workers proxy
│   └── lib/
│       ├── yahavi-chat.js      ← Yahavi AI chatbot (Cloudflare Workers AI)
│       └── yahavi-prompt.js    ← AI system prompt
├── public/
│   ├── _headers                ← Cache + security headers
│   ├── _redirects              ← SPA fallback routing
│   └── fonts/                  ← Self-hosted woff2 fonts (DO NOT DELETE)
└── src/
    ├── App.tsx                 ← Routes (lazy loading)
    ├── lib/
    │   ├── api-base.ts         ← API URL resolver (VITE_WP_API_BASE)
    │   ├── graphql-client.ts   ← GraphQL client → /graphql
    │   ├── auth.ts             ← Login/register/Google auth
    │   ├── checkout-api.ts     ← Order creation + payment verify
    │   └── razorpay.ts         ← Razorpay popup
    └── pages/                  ← All page components
```

---

## Deployment Flow

```
Founder pushes code to GitHub (main branch)
       ↓
Cloudflare Pages auto-detects push
       ↓
Build runs: npm run build (inside app/)
   - Uses VITE_RAZORPAY_KEY_ID from CF env vars
   - Uses VITE_GOOGLE_CLIENT_ID from CF env vars
   - VITE_WP_API_BASE = empty (no hardcoded URLs)
       ↓
dist/ folder is deployed to Cloudflare edge
       ↓
functions/_middleware.js is also deployed as Cloudflare Workers
       ↓
www.hackknow.com goes live (within 1-2 minutes)
```

---

## If Something Breaks — Quick Debug

| Problem | Check |
|---------|-----------|
| Products not showing | Check if `/graphql` proxy exists in `_middleware.js` |
| Login not working | Check if `/wp-json/hackknow/v1/auth/*` is accessible on WordPress |
| Payments failing | Check if `VITE_RAZORPAY_KEY_ID` is set in CF Pages env vars |
| Images not loading | Check if `/wp-content/*` proxy is in `_middleware.js` |
| Build failing on Cloudflare | Check if build env vars are set (check CF Dashboard) |
| 404 errors everywhere | Check if `/* /index.html 200` is in the `_redirects` file |

---

*Last updated: May 2026 — Cloudflare-only architecture (GCE removed)*
