# HackKnow.com

Premium digital products marketplace, headless e-commerce, India.
Live at **[https://www.hackknow.com](https://www.hackknow.com)**.

> The official source code for HackKnow.com — a fully headless e-commerce
> platform for premium digital templates, dashboards, marketing kits, and
> learning resources.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 6 + TypeScript + TailwindCSS, deployed on Google Compute Engine (Nginx) |
| Backend | WordPress + WooCommerce on Hostinger (`shop.hackknow.com`, never exposed to the browser) |
| Auth | Custom JWT (HMAC-SHA256 with `wp_salt('auth')`) + Google OAuth 2.0 token client |
| Payments | Razorpay (live keys live in `wp-config.php`, never in the browser bundle) |
| Reviews | WooCommerce comments API with one-review-per-purchased-product enforcement |
| AI Assistant | Yahavi AI — multilingual chatbot with intent routing & cross-sell |
| Repo | [github.com/gaganchauhan1997/Yahavi2022](https://github.com/gaganchauhan1997/Yahavi2022) |

---

## Architecture

```
                 ┌────────────────────────────┐
 Browser ───────▶│ www.hackknow.com (GCE)     │
                 │  React SPA + Nginx proxy   │
                 └─────────────┬──────────────┘
                               │  /wp-json/* /graphql/* /wp-content/*
                               ▼
                 ┌────────────────────────────┐
                 │ shop.hackknow.com          │
                 │ WordPress + WooCommerce    │
                 │ (Hostinger, hidden)        │
                 └────────────────────────────┘
```

The WordPress backend is **never** referenced from browser code. All API calls
go to the same origin (`www.hackknow.com`) and are proxied server-side.

---

## Custom REST endpoints (namespace `hackknow/v1`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create WP user + return JWT |
| POST | `/auth/login` | Email + password login |
| POST | `/auth/google` | Google OAuth token exchange |
| GET  | `/auth/me` | Hydrate current user |
| POST | `/auth/forgot-password` | Send branded reset email with frontend link |
| POST | `/auth/reset-password` | Verify key + change password |
| GET  | `/wishlist` | List user wishlist (per-user `wp_usermeta`) |
| POST | `/wishlist/toggle` | Add/remove product from wishlist |
| GET  | `/my-orders` | Paid orders (`wc-completed`, `wc-processing`) |
| GET  | `/my-downloads` | WooCommerce downloadable files |
| POST | `/order` | Create a Razorpay order via WC |
| POST | `/verify` | Verify payment + mark WC order paid |
| GET  | `/products/{id}/reviews` | Approved reviews + average rating |
| POST | `/products/{id}/reviews` | Submit a review (1 per purchase, unlimited on free products) |
| DELETE | `/admin/reviews/{id}` | Admin: delete a review |
| POST | `/admin/reviews/{id}/approve` | Admin: approve / hide a review |
| GET  | `/admin/analytics` | KPIs: signups, orders, revenue, top products |
| POST | `/chat` | Yahavi AI chatbot (intent routing) |

All endpoints are protected against page caching via `X-LiteSpeed-Cache-Control`
and `Cache-Control: no-store` headers.

---

## Local development

```bash
# 1. Clone
git clone https://github.com/gaganchauhan1997/Yahavi2022.git
cd Yahavi2022/app

# 2. Install
npm install

# 3. Configure (optional, only for hitting prod backend in dev)
cp .env.example .env.local
# edit .env.local → VITE_WP_API_BASE=https://shop.hackknow.com

# 4. Run
npm run dev
```

The PHP backend plugin (`hackknow-checkout.php`) lives on Hostinger under
`wp-content/mu-plugins/`.

---

## SEO

- `robots.txt` — fully allows crawlers, disallows `/wp-admin` proxy paths
- `sitemap.xml` — auto-generated, includes all public routes
- Schema.org `Organization`, `WebSite`, and `Product` JSON-LD on every page
- Open Graph + Twitter Card meta on every route
- LCP-optimised hero image with WebP source + `fetchPriority="high"`

---

## License

This project is released under the **MIT License** with a small attribution
clause — see [`LICENSE`](LICENSE).

You are free to use, modify, and redistribute the code (commercial use is
allowed). The only requirement is that any public use must visibly credit:

> **Created by Gagan Chauhan — HackKnow.com**
> [github.com/gaganchauhan1997/Yahavi2022](https://github.com/gaganchauhan1997/Yahavi2022)

---

## Credits

Built with help from:
- **OpenAI** — mentorship & ideation
- **Anthropic Claude** — production-grade code generation
- **Replit** — the place where this project survived its hardest moments
- **Windsurf** — heavyweight debugging
- **Google** — six-figure cloud-credit grant
- **GitHub** — version control & collaboration

Three humans kept watch over every commit and made sure the technology era
keeps moving forward — so anyone, anywhere, can learn, ship, and pass it on.

---

**Author:** Gagan Chauhan
**Site:** [https://www.hackknow.com](https://www.hackknow.com)
**Repo:** [https://github.com/gaganchauhan1997/Yahavi2022](https://github.com/gaganchauhan1997/Yahavi2022)
