# HackKnow Digital Marketplace — Project Context

> For any AI resuming this project: read this file fully before touching anything.

---

## Project Overview

**HackKnow** is a digital product marketplace (like Gumroad/Envato) for Indian creators.
- Sells: Excel templates, PowerPoint decks, dashboards, social media kits, etc.
- Payments: Razorpay (live, INR)
- Auth: Google Sign-In (one-tap popup, JWT-based)
- Stack: React 19 + Vite (frontend) + WordPress + WooCommerce (backend/product management)

**Live URL:** https://www.hackknow.com (ALL traffic — shop subdomain is hidden from users)

---

## Architecture

```
User Browser
     │
     ▼
www.hackknow.com  (Nginx reverse proxy on GCE)
     │
     ├── /           → React SPA (static files in /var/www/hackknow/dist/)
     ├── /wp-json/   → Proxied to Hostinger (WordPress REST API)
     ├── /graphql    → Proxied to Hostinger (WPGraphQL)
     ├── /wp-content/→ Proxied to Hostinger (product images, uploads)
     └── /wp-admin/  → Proxied to Hostinger (WP dashboard)
```

### Servers

| Server | Purpose | Details |
|--------|---------|---------|
| **GCE (Google Cloud)** | React frontend + Nginx proxy | IP: `34.44.252.70` (IPv4 only — no IPv6) |
| **Hostinger** | WordPress + WooCommerce backend | Domain: `shop.hackknow.com` (hidden from users) |

**CRITICAL:** Nginx on GCE MUST proxy to Hostinger using IPv4 `145.223.124.144` directly.
GCE has no IPv6 routing so DNS lookup of `shop.hackknow.com` would fail.

---

## Credentials Needed (ask owner for these)

| Secret Name | What it's for | Value |
|-------------|--------------|-------|
| `GCE_SSH_HOST` | GCE server IP | `34.44.252.70` |
| `GCE_SSH_USER` | SSH username | XXXX |
| `GCE_SSH_PORT` | SSH port | `22` |
| `GCE_SSH_PRIVATE_KEY` | RSA private key (raw base64 body, no headers) | XXXX |
| `HOSTINGER_SFTP_HOST` | SFTP hostname | XXXX |
| `HOSTINGER_SFTP_PORT` | SFTP port | `65002` |
| `HOSTINGER_SFTP_USER` | SFTP username | XXXX |
| `HOSTINGER_SFTP_PASSWORD` | SFTP password | XXXX |
| `RAZORPAY_KEY_ID` | Razorpay live public key | `rzp_live_XXXX` |
| `RAZORPAY_KEY_SECRET` | Razorpay live secret | XXXX |
| `SESSION_SECRET` | Express/WP session secret | XXXX |
| `GITHUB_TOKEN` | GitHub PAT (for pushing files via API) | XXXX |

---

## GitHub Repository

**Repo:** `gaganchauhan1997/Yahavi2022` (branch: `main`)

### Key Files

```
app/                              ← React + Vite frontend source
  src/
    pages/
      UserProfilePage.tsx         ← Full account page (sidebar, downloads, orders, DP upload, addresses, payments)
      AccountPage.tsx             ← Re-exports UserProfilePage
      ContactPage.tsx             ← Contact details (+91 87960 18700)
      SupportPage.tsx             ← FAQ + support CTA (email + phone)
      HomePage.tsx                ← Renders all home sections
    sections/home/
      HeroSection.tsx
      CategoriesSection.tsx
      TrendingSection.tsx
      WhySection.tsx
    components/
      Footer.tsx                  ← Footer with contact bar (email + phone)
      Header.tsx
    lib/
      auth.ts                     ← Google Sign-In + JWT logic
      api-base.ts                 ← WP_REST_BASE = '' (relative URLs)
      auth-token.ts               ← JWT stored in localStorage
  public/
    favicon.svg                   ← Black background, yellow H
  vite.config.ts
  package.json

hostinger/
  mu-plugins/
    hackknow-checkout.php         ← Custom WP REST API plugin (v3, ~460 lines)

gce/
  nginx-hackknow.conf             ← Production nginx config (153 lines)

CONTEXT.md                        ← This file
```

---

## How to Deploy (step by step)

### 1. Setup SSH Key for GCE
```python
import os, stat, textwrap
key_raw = os.environ.get('GCE_SSH_PRIVATE_KEY', '').strip()
clean   = key_raw.replace(' ', '').replace('\n', '')
wrapped = '\n'.join(textwrap.wrap(clean, 64))
pem     = f'-----BEGIN RSA PRIVATE KEY-----\n{wrapped}\n-----END RSA PRIVATE KEY-----\n'
os.makedirs('/tmp/ssh', exist_ok=True)
with open('/tmp/ssh/id_key_rsa', 'w') as f:
    f.write(pem)
os.chmod('/tmp/ssh/id_key_rsa', 0o600)
# Test: ssh -i /tmp/ssh/id_key_rsa -p $PORT user@host "echo OK"
```

### 2. Build React App
```bash
cd app
npm install
npm run build   # outputs: dist/
```
Required env vars for build (set in `.env.local` or shell):
```
VITE_WP_API_BASE=
VITE_RAZORPAY_KEY_ID=rzp_live_XXXX
VITE_GOOGLE_CLIENT_ID=936562781728-XXXX.apps.googleusercontent.com
```

### 3. Deploy to GCE
```bash
cd dist
tar czf /tmp/dist.tar.gz .
scp -i /tmp/ssh/id_key_rsa -P $GCE_PORT /tmp/dist.tar.gz $GCE_USER@$GCE_HOST:/tmp/
ssh -i /tmp/ssh/id_key_rsa -p $GCE_PORT $GCE_USER@$GCE_HOST \
  "sudo rm -rf /var/www/hackknow/dist/* && \
   sudo tar xzf /tmp/dist.tar.gz -C /var/www/hackknow/dist/ && \
   sudo chown -R www-data:www-data /var/www/hackknow/dist/"
```

### 4. Deploy mu-plugin to Hostinger (via SFTP)
```python
# pip install paramiko
import paramiko, os
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=65002, username=user, password=passwd, timeout=30)
sftp = client.open_sftp()
sftp.put('hackknow-checkout.php',
  'domains/shop.hackknow.com/public_html/wp-content/mu-plugins/hackknow-checkout.php')
```

### 5. Push Code to GitHub
```python
# Use GitHub Contents API — git commit is forbidden in main agent
import urllib.request, json, base64
# GET  /repos/gaganchauhan1997/Yahavi2022/contents/{path}  → get sha
# PUT  same path with {message, content (base64), sha, branch: 'main'}
```

---

## Custom REST API (mu-plugin)

**Base:** `https://www.hackknow.com/wp-json/hackknow/v1/`

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/google` | POST | None | Google ID token → custom JWT |
| `/my-orders` | GET | Bearer JWT | Returns `completed` + `processing` orders only |
| `/my-downloads` | GET | Bearer JWT | Returns downloads (30-day expiry window) |
| `/checkout/create-order` | POST | Bearer JWT | Create WC order + Razorpay order |
| `/checkout/verify-payment` | POST | Bearer JWT | Verify Razorpay signature, mark order complete |

**JWT:** Custom HS256 token, secret stored in WP options as `hackknow_jwt_secret`.
Token stored in browser `localStorage` as `hackknow_token`.

---

## Hostinger File Paths

SFTP root: `/home/u828497513/`

```
domains/shop.hackknow.com/public_html/
  wp-content/
    mu-plugins/
      hackknow-checkout.php     ← main custom API plugin
    uploads/                    ← product files uploaded here
```

---

## Important Decisions Made

| Decision | Why |
|----------|-----|
| All URLs via `www.hackknow.com` only | shop.hackknow.com must stay hidden from users |
| Nginx proxies using IPv4 `145.223.124.144` | GCE has no IPv6, DNS resolution fails |
| JWT auth (not WP cookies) | React SPA needs stateless auth |
| Pending orders filtered out | New users were seeing unpaid "pending" orders |
| `_download_expiry = 30` days | User can re-download for 30 days after purchase |
| Profile photo in localStorage | No server-side upload endpoint built yet |
| Addresses + Payment info in localStorage | No backend storage needed for basic autofill |
| Bare domain `hackknow.com` → redirect | Separate nginx server block for HTTPS redirect |

---

## Contact Details (used everywhere on site)
- **Email:** support@hackknow.com
- **Phone:** +91 87960 18700

---

## WooCommerce Products
- Demo product: ID `940`, "Demo 1", ₹99, Excel file attached
- Live product: "Startup Pitch Deck PowerPoint" (visible on shop)

---

## Pending / TODO

- [ ] **WP Mail SMTP** not configured yet — needed for order confirmation emails to customers (owner needs to connect Gmail in WP Mail SMTP plugin)
- [ ] **Google OAuth Redirect URI** — owner needs to add `https://www.hackknow.com` in Authorized Redirect URIs in Google Cloud Console (JS origins already added)
- [ ] **Profile photo server upload** — currently only localStorage (ask owner if they want Cloudinary or WP media upload)
- [ ] **Wishlist backend** — currently frontend placeholder, no WC wishlist plugin
- [ ] **Contact form email** — form exists but submissions don't send email yet

---

## What to Ask Owner First (if starting fresh)

1. All secrets from the "Credentials Needed" table
2. GitHub repo access (fork or PAT)
3. Google Cloud Console — OAuth 2.0 Client ID details
4. Is WP Mail SMTP connected to Gmail? (for email notifications)
5. Any new features they want to build next
