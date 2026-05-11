# HackKnow Digital Marketplace — Project Context

> For any AI resuming this project: read this file fully before touching anything.

---

## Project Overview

**HackKnow** is a digital product marketplace for Indian creators.
- Sells: Excel templates, PowerPoint decks, dashboards, social media kits, etc.
- Payments: Razorpay (live, INR)
- Auth: Google Sign-In (one-tap popup, JWT-based) + WordPress email/password
- Stack: React 19 + Vite (frontend) + WordPress + WooCommerce (backend)
- Live URL: **https://www.hackknow.com** (all traffic via www only)

---

## Infrastructure (Cloudflare-Only — No GCE)

### Frontend (React + Vite)
- Hosted on **Cloudflare Pages** (static build, free plan)
- Build command: `npm run build`  (run inside `app/`)
- Output directory: `app/dist`
- SPA fallback handled by `app/public/_redirects`
- Edge proxy handled by `app/functions/_middleware.js` (Cloudflare Workers — runs at edge)

### Backend (WordPress + WooCommerce)
- Hosted on **Hostinger** at shop.hackknow.com → IP 145.223.124.144
- NEVER expose shop.hackknow.com to users. Always proxied via Cloudflare Workers.
- SFTP: port 65002, root /home/u828497513/
- mu-plugin: domains/shop.hackknow.com/public_html/wp-content/mu-plugins/hackknow-checkout.php

### Cloudflare Workers Proxy (app/functions/_middleware.js)
This file runs at Cloudflares edge for EVERY request to www.hackknow.com.
It intercepts these paths and proxies them silently to shop.hackknow.com:
- /wp-json/*     — WordPress REST API (auth, orders, checkout, chat)
- /graphql       — WPGraphQL (product catalog, categories, search)
- /wp-content/*  — WordPress media/uploads
- /wp-admin/*    — WordPress admin panel
- /wp-includes/* — WordPress core assets

Everything else (/, /shop, /product, /assets, /fonts etc.) is served as static React SPA.

---

## Secrets Required

| Secret | Purpose |
|--------|---------|
| GITHUB_TOKEN | PAT for repo gaganchauhan1997/Yahavi2022 (needs Contents read+write) |
| HOSTINGER_SFTP_HOST | SFTP host for Hostinger |
| HOSTINGER_SFTP_PORT | 65002 |
| HOSTINGER_SFTP_USER | SFTP username |
| HOSTINGER_SFTP_PASSWORD | SFTP password |
| RAZORPAY_KEY_ID | rzp_live_... (also set as Cloudflare Pages build env var) |
| RAZORPAY_KEY_SECRET | Razorpay webhook verification secret |
| VITE_GOOGLE_CLIENT_ID | Google OAuth client ID (set as Cloudflare Pages build env var) |

## Cloudflare Pages Build Environment Variables
Set these in: Cloudflare Dashboard → Pages → hackknow → Settings → Environment variables

| Variable | Value |
|----------|-------|
| VITE_RAZORPAY_KEY_ID | rzp_live_... |
| VITE_GOOGLE_CLIENT_ID | your-client-id.apps.googleusercontent.com |
| VITE_WP_API_BASE | (leave empty — proxy handles it) |

---

## GitHub Pushes
Use the GitHub Contents API (GET sha first, then PUT with content + sha).
Do NOT use git operations directly.

---

## SFTP (Hostinger)
Used for deploying mu-plugins and theme files to WordPress on Hostinger.

---

## Frontend Architecture

### Key Source Files
```
app/
  index.html                          -- HTML template
  vite.config.ts                      -- Build config with manual chunk splitting
  functions/
    _middleware.js                    -- Cloudflare Workers edge proxy (CRITICAL — do not break)
    lib/yahavi-chat.js                -- Yahavi AI chat handler (Cloudflare Workers AI)
    lib/yahavi-prompt.js              -- Yahavi AI system prompt builder
  public/
    _headers                          -- Cloudflare Pages cache + security headers
    _redirects                        -- SPA fallback (/* → /index.html 200)
    images/hero/phone-mockup.webp     -- 16KB hero (was 957KB PNG)
    fonts/                            -- Self-hosted woff2 font files
  src/
    App.tsx                           -- React.lazy() for all non-home routes
    lib/api-base.ts                   -- API_BASE resolver (empty = relative = proxied)
    lib/graphql-client.ts             -- Hand-rolled GraphQL client → /graphql
    lib/auth.ts                       -- Auth via /wp-json/hackknow/v1/auth/*
    lib/checkout-api.ts               -- Orders via /wp-json/hackknow/v1/order
    lib/razorpay.ts                   -- Razorpay checkout integration
```

### How API Calls Flow
```
Browser on www.hackknow.com
  → fetch("/graphql", ...)            Product catalog (WPGraphQL)
  → fetch("/wp-json/hackknow/v1/...") REST API (auth, orders, checkout)
  → Cloudflare Workers (_middleware.js) intercepts all of the above
  → Proxies to https://shop.hackknow.com/...
  → Returns response to browser
  shop.hackknow.com is NEVER exposed to the browser
```

---

## Bundle Sizes
| Chunk | Size | Gzipped |
|-------|------|---------|
| index (main) | 97.9 KB | 27.5 KB |
| vendor-react | 247.6 KB | 80.0 KB |
| vendor-radix | 61.3 KB | 18.6 KB |
| All page chunks | 3-35 KB each | lazy loaded |

---

## All Completed Work

### 1. Cloudflare Migration (May 2026)
- Moved from GCE VM to Cloudflare Pages (free plan)
- GCE nginx proxy replaced by Cloudflare Workers (_middleware.js)
- Fixed: /graphql path added to proxy (was missing — broke product catalog)
- Fixed: _headers updated (no GCE refs, /graphql no-cache added)

### 2. UserProfilePage
- Sidebar order: Profile → Downloads → Wishlist → Payments → Addresses → Support → MyOrders → Logout
- 30-day download expiry after order completion date

### 3. Contact Details
- Email: team@hackknow.com
- Phone: +91 87960 18700

### 4. WooCommerce mu-plugin (hackknow-checkout.php)
- Handles: orders filter, 30-day download expiry, custom checkout fields

### 5. Performance Optimization
- Hero: 957KB PNG → 16KB WebP
- Main bundle: 443KB → 98KB (78% smaller)
- Self-hosted fonts (Space Grotesk + Inter) — no Google Fonts
- React.lazy() for all 17 non-home routes

---

## PageSpeed Scores
| | Before | After |
|--|--------|-------|
| Mobile | 59 | 88-93 |
| Desktop | 95 | 95 |

**DO NOT touch desktop** — it is already at 95/100.

---

## Critical Rules
1. Desktop PageSpeed 95 — do not change anything affecting desktop
2. All traffic via www.hackknow.com — NEVER expose shop.hackknow.com
3. Always rebuild before deploying: npm run build, then Cloudflare Pages picks up dist/
4. Fonts must be in public/fonts/ so every build includes them in dist output
5. _middleware.js is the ONLY proxy — if you break this, the entire site goes dark
6. VITE_WP_API_BASE must be empty in production (proxy handles routing)
7. GitHub: use Contents API only (no git CLI)
