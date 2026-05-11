# FOUNDER.md — HackKnow System Overview

> **Founder ka guide:** Yeh file explain karti hai ki poora system kaise kaam karta hai,
> kya touch karna hai, kya bilkul nahi, aur build ke liye kaunse credentials chahiye.
> Kisi bhi developer ya AI ko dene se pehle yeh file zaroor padhao.

---

## System Kaise Kaam Karta Hai

### Simple Words Mein

```
User (browser)
  ↓  www.hackknow.com pe jaata hai
Cloudflare Pages
  ↓  React website serve karta hai (static files)
  ↓  Agar request /wp-json/* ya /graphql ke liye hai...
Cloudflare Workers (_middleware.js)
  ↓  Request ko silently forward karta hai
WordPress (shop.hackknow.com — Hostinger)
  ↓  Products, orders, auth data return karta hai
User ko response milta hai
  (shop.hackknow.com kabhi bhi browser mein nahi dikhta)
```

### Connections — Kya Kis Se Baat Karta Hai

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

## Cloudflare Dashboard Mein Kya Set Karna Hai

**Cloudflare → Pages → hackknow → Settings → Environment Variables:**

| Variable | Kya Hai |
|----------|---------|
| `VITE_RAZORPAY_KEY_ID` | Razorpay live key (rzp_live_...) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `VITE_WP_API_BASE` | **Khali chhod do (empty)** — proxy handle karta hai |

---

## Bilkul Mat Chhuona (DO NOT TOUCH)

| Cheez | Kyun Nahi |
|-------|-----------|
| `app/functions/_middleware.js` ka proxy logic | Yeh poora bridge hai — toota toh site dark ho jaayegi |
| `VITE_WP_API_BASE` ko koi value dena | Empty hona zaroori hai — warna backend expose ho jaata hai |
| `shop.hackknow.com` ko public links mein daalna | Backend kabhi user ko nahi dikhna chahiye |
| Desktop PageSpeed settings | Desktop 95/100 hai — kuch bhi change mat karo |
| `app/public/_redirects` ka `/* /index.html 200` | Yeh SPA routing hai — hata diya toh 404 aayenge |
| `app/public/fonts/` folder | Self-hosted fonts hain — hataoge toh Google Fonts load hoga (1700ms lag) |
| WordPress mu-plugins folder on Hostinger | `hackknow-checkout.php` orders aur downloads handle karta hai |

---

## Build Karne Ke Liye Credentials

### Cloudflare Pages Build (Automatic jab GitHub pe push karo)

| Credential | Kahan Set Karo | Kya Hai |
|-----------|----------------|---------|
| `VITE_RAZORPAY_KEY_ID` | CF Pages → Environment Variables | Razorpay public key (rzp_live_...) |
| `VITE_GOOGLE_CLIENT_ID` | CF Pages → Environment Variables | Google OAuth Client ID |
| `VITE_WP_API_BASE` | CF Pages → Environment Variables | **Empty rakhna** |

### Replit (Deploy automation ke liye)

| Credential | Purpose |
|-----------|---------|
| `GITHUB_TOKEN` | GitHub repo mein code push karne ke liye (Contents read+write chahiye) |
| `HOSTINGER_SFTP_HOST` | WordPress files upload karne ke liye (SFTP) |
| `HOSTINGER_SFTP_USER` | Hostinger SFTP username |
| `HOSTINGER_SFTP_PASSWORD` | Hostinger SFTP password |
| `RAZORPAY_KEY_ID` | Razorpay live key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret (webhook verification ke liye) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID |

### WordPress (Hostinger pe already set hain)
- WooCommerce active hona chahiye
- WPGraphQL plugin active hona chahiye
- `hackknow-checkout.php` mu-plugins mein deployed hona chahiye
- Razorpay WordPress plugin configured hona chahiye

---

## Key Files — Kahan Kya Hai

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
dist/ folder deploy hota hai Cloudflare edge pe
       ↓
functions/_middleware.js bhi deploy hota hai as Cloudflare Workers
       ↓
www.hackknow.com live ho jaata hai (1-2 min mein)
```

---

## Agar Kuch Toot Jaaye — Quick Debug

| Problem | Check Karo |
|---------|-----------|
| Products nahi dikh rahe | `_middleware.js` mein `/graphql` proxy hai ya nahi |
| Login kaam nahi kar raha | `/wp-json/hackknow/v1/auth/*` WordPress pe accessible hai ya nahi |
| Payment fail ho rahi hai | `VITE_RAZORPAY_KEY_ID` CF Pages env vars mein set hai ya nahi |
| Images nahi load ho rahi | `/wp-content/*` proxy `_middleware.js` mein hai |
| Cloudflare pe build fail ho rahi | Build env vars set hain ya nahi (CF Dashboard check karo) |
| 404 errors everywhere | `_redirects` file mein `/* /index.html 200` hai ya nahi |

---

*Last updated: May 2026 — Cloudflare-only architecture (GCE removed)*
