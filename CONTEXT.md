# HackKnow Digital Marketplace — Project Context

> For any AI resuming this project: read this file fully before touching anything.

---

## Project Overview

**HackKnow** is a digital product marketplace for Indian creators.
- Sells: Excel templates, PowerPoint decks, dashboards, social media kits, etc.
- Payments: Razorpay (live, INR)
- Auth: Google Sign-In (one-tap popup, JWT-based)
- Stack: React 19 + Vite (frontend) + WordPress + WooCommerce (backend)
- Live URL: **https://www.hackknow.com** (all traffic via www only)

---

## Infrastructure

### Frontend (React + Vite)
- Hosted on **GCE VM** at 34.44.252.70 (Debian, nginx)
- Web root: /var/www/hackknow/dist/
- Nginx config: /etc/nginx/sites-enabled/hackknow
- Build: cd /tmp/yahavi2022/app && npm run build
- Deploy: tar dist/ -> scp -> sudo rm -rf dist/* -> tar xzf -> chown www-data
- Build env vars needed:
  - VITE_WP_API_BASE= (empty, proxied via nginx)
  - VITE_RAZORPAY_KEY_ID=rzp_live_...
  - VITE_GOOGLE_CLIENT_ID=936562781728-...

### Backend (WordPress + WooCommerce)
- Hosted on **Hostinger** at shop.hackknow.com -> IP 145.223.124.144
- NEVER expose shop.hackknow.com to users. Always proxy via GCE nginx.
- SFTP: port 65002, root /home/u828497513/
- mu-plugin: domains/shop.hackknow.com/public_html/wp-content/mu-plugins/hackknow-checkout.php

### Nginx (GCE) Key Rules
- IPv4-only resolver (resolver 8.8.8.8 8.8.4.4 ipv6=off) -- GCE has no IPv6 routing
- /wp-json/ and /graphql proxy to 145.223.124.144 with proxy_ssl_name shop.hackknow.com
- /wp-content/ proxied for product images
- /assets/ -- 1-year immutable cache (hashed Vite bundles)
- /images/ -- 30-day cache
- /fonts/ -- 1-year immutable cache (self-hosted woff2)
- SPA fallback: try_files $uri $uri/ /index.html
- HSTS, X-Frame-Options, nosniff headers on root location

---

## Secrets (Replit environment)

| Secret | Purpose |
|--------|---------|
| GCE_SSH_HOST | 34.44.252.70 |
| GCE_SSH_PORT | SSH port |
| GCE_SSH_USER | SSH username |
| GCE_SSH_PRIVATE_KEY | RSA private key (needs PEM wrapping -- see below) |
| GITHUB_TOKEN | PAT for repo gaganchauhan1997/Yahavi2022 |
| HOSTINGER_SFTP_HOST | SFTP host |
| HOSTINGER_SFTP_PORT | 65002 |
| HOSTINGER_SFTP_USER | SFTP username |
| HOSTINGER_SFTP_PASSWORD | SFTP password |
| RAZORPAY_KEY_ID | rzp_live_... |
| RAZORPAY_KEY_SECRET | Razorpay secret |

SSH key PEM wrapping (required before every SSH/SCP call):
```python
import textwrap, os, stat
raw = os.environ.get('GCE_SSH_PRIVATE_KEY','')
lines = textwrap.wrap(raw, 64)
pem = "-----BEGIN RSA PRIVATE KEY-----\n" + "\n".join(lines) + "\n-----END RSA PRIVATE KEY-----\n"
os.makedirs('/tmp/ssh', exist_ok=True)
with open('/tmp/ssh/id_key_rsa', 'w') as f: f.write(pem)
os.chmod('/tmp/ssh/id_key_rsa', 0o600)
```

---

## GitHub Pushes
Use the GitHub Contents API (GET sha first, then PUT with content + sha).
Do NOT use git operations directly.

```python
import urllib.request, json, base64, os
token = os.environ.get('GITHUB_TOKEN','')
def gh(path, method='GET', data=None):
    req = urllib.request.Request(
        f'https://api.github.com/repos/gaganchauhan1997/Yahavi2022{path}',
        data=json.dumps(data).encode() if data else None,
        headers={'Authorization': f'token {token}',
                 'Content-Type': 'application/json',
                 'Accept': 'application/vnd.github.v3+json',
                 'User-Agent': 'py'})
    req.get_method = lambda: method
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, json.loads(r.read())
```

---

## SFTP (Hostinger)
```python
import paramiko  # pip install paramiko first
transport = paramiko.Transport((host, 65002))
transport.connect(username=user, password=password)
sftp = paramiko.SFTPClient.from_transport(transport)
```

---

## Frontend Architecture

### Key Source Files
```
app/
  index.html                          -- HTML template (edit here for head tags)
  vite.config.ts                      -- Build config with manual chunk splitting
  public/
    images/hero/phone-mockup.webp     -- 16KB hero (was 957KB PNG)
    images/hero/phone-mockup.png      -- PNG fallback
    fonts/                            -- Self-hosted woff2 font files
      fonts.css
      space-grotesk-500.woff2
      space-grotesk-700.woff2
      inter-400.woff2
      inter-500.woff2
      inter-600.woff2
  src/
    App.tsx                           -- React.lazy() for all non-home routes
    sections/home/HeroSection.tsx     -- <picture> WebP + PNG fallback
    pages/UserProfilePage.tsx         -- Profile page (sidebar, downloads, orders)
    pages/ContactPage.tsx             -- Contact details
    pages/SupportPage.tsx             -- Support details
    components/layout/Footer.tsx      -- Footer with contact info
```

### Bundle Sizes (post-optimization)
| Chunk | Size | Gzipped |
|-------|------|---------|
| index-C4_GWC7W.js (main) | 97.9 KB | 27.5 KB |
| vendor-react-DWcvyujQ.js | 247.6 KB | 80.0 KB |
| vendor-radix-DmtxrioZ.js | 61.3 KB | 18.6 KB |
| All page chunks | 3-35 KB each | lazy loaded |
| index-ChKTkTv5.css | 109.9 KB | 17.9 KB |

---

## All Completed Work

### 1. Infrastructure Fixes
- IPv6 -> IPv4 for all Hostinger proxy calls in nginx (GCE has no IPv6)
- Favicon (SVG + ICO + apple-touch-icon) deployed
- Product image proxy via /wp-content/ nginx location
- HTTP -> HTTPS -> www redirect chain

### 2. UserProfilePage (src/pages/UserProfilePage.tsx)
- Sidebar order: Profile -> Downloads -> Wishlist -> Payments -> Addresses -> Support -> MyOrders -> Logout
- Profile picture upload (base64, localStorage)
- Manage addresses (add/edit/delete)
- Payment methods autofill
- Orders filter: shows only completed + processing orders
- 30-day download expiry: downloads expire 30 days after order completion date

### 3. Contact Details (updated everywhere)
- Email: support@hackknow.com
- Phone: +91 87960 18700
- Files: Footer.tsx, ContactPage.tsx, SupportPage.tsx

### 4. WooCommerce mu-plugin (hackknow-checkout.php)
- Deployed to Hostinger mu-plugins folder
- Handles: orders filter, 30-day download expiry, custom checkout fields

### 5. Performance Optimization

**Images:**
- All PNG images converted to WebP (95-98% size reduction)
- Hero: 957KB PNG -> 16KB WebP
- HeroSection uses <picture> tag with WebP source + PNG fallback
- fetchPriority="high" on hero image

**JavaScript:**
- React.lazy() for all 17 non-home routes (pages load on demand)
- Vite manualChunks: react, radix, ui split into separate vendor chunks
- Main bundle: 443KB -> 98KB (78% smaller)

**Fonts:**
- Removed Google Fonts entirely (was adding 1700ms to critical path on mobile)
- Self-hosted: Space Grotesk (500, 700) + Inter (400, 500, 600) as woff2
- Served from /fonts/ on same GCE server (1-year cache, immutable)
- font-display: swap -- never blocks render
- Preload hints for Space Grotesk 500 + Inter 400

**Nginx:**
- /fonts/ location: Cache-Control: public, max-age=31536000, immutable
- gzip_types includes image/webp + application/manifest+json

---

## PageSpeed Scores (as of 29 Apr 2026)
| | Before | After all fixes |
|--|--------|----------------|
| Mobile | 59 | 88-93 (expected after fonts fix) |
| Desktop | 95 | 95 (do not touch) |

**DO NOT touch desktop** -- it is already at 95/100.

Remaining mobile issues (cannot fix -- library internals):
- Forced reflow from React/Radix vendor files
- These are acceptable

---

## Critical Rules
1. Desktop score 95 -- do not change anything affecting desktop
2. All traffic via www.hackknow.com -- never expose shop.hackknow.com
3. Always rebuild before deploying: npm run build, then deploy dist/
4. Fonts must be in public/fonts/ so every build includes them in dist output
5. Always deploy the BUILT dist/index.html, never the source app/index.html
6. GitHub: use Contents API only
7. SSH key: always wrap with PEM headers before use
