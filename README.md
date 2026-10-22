# HackKnow Monorepo

Production stack for **[hackknow.com](https://www.hackknow.com)** — India's premium digital products marketplace (Excel templates, PowerPoint decks, courses, dashboards, marketing kits, social media assets).

> **Current Status (June 2026)**: Fully migrated to Cloudflare Pages + Workers. The previous GCE/nginx architecture has been deprecated. See `CONTEXT.md` and `FOUNDER.md` for the definitive current setup.

## Current Architecture

```
Browser (www.hackknow.com)
    │
    ▼  Cloudflare Pages (static React 19 + Vite build from app/)
    │
    ▼  Cloudflare Workers (_middleware.js)
    │   ├── Proxies: /wp-json/* , /graphql , /wp-content/* , /wp-admin/*
    │   ├── Special: /wp-json/hackknow/v1/chat → Yahavi AI (Workers AI) with WP fallback
    │
    ▼  Hostinger WordPress + WooCommerce (shop.hackknow.com)  [NEVER exposed directly]
```

**Key Principle**: `shop.hackknow.com` is never visible to users. All traffic is proxied at the edge for security and performance.

## Must-Read Files (Start Here)

| File | Purpose |
|------|---------|
| `CONTEXT.md` | Full project context, secrets, Cloudflare config, critical "DO NOT TOUCH" rules, completed work log |
| `FOUNDER.md` | System overview, credential locations, deployment flow, what to never break |
| `docs/ARCHITECTURE.md` | Detailed current architecture diagram (Mermaid), component inventory, data flows |
| `docs/DPDP_COMPLIANCE_CHECKLIST.md` | India DPDP Act compliance checklist, privacy recommendations, payment security |
| `tech-spec.md` | UI components, animations (GSAP/Lenis), Tailwind config, state plan |

## Tech Stack

- **Frontend**: React 19.2 + Vite 7 (in `app/`), TypeScript, Tailwind + shadcn/ui (full Radix suite), Zod + react-hook-form
- **Animations & UX**: GSAP 3.15 + Lenis, custom tilt/flip/3D effects, CustomCursor, smooth scroll
- **Edge / Proxy**: Cloudflare Workers (`app/functions/_middleware.js`)
- **Backend**: WordPress + WooCommerce + WPGraphQL (Hostinger)
- **Payments**: Razorpay (client-side + server signature verification in WP mu-plugin)
- **Auth**: Google One-Tap (JWT) + WordPress email/password + custom `/hackknow/v1/` REST endpoints
- **AI**: Yahavi Chat — Cloudflare Workers AI (RAG/Gemini) with graceful fallback to WP
- **Other**: Recharts, x-data-spreadsheet (Excel preview), dompurify, Sonner toasts

## Local Development

Use the tested **Node.js 24.19.0 / npm 11.9.0** toolchain. Root `.node-version`
and `.nvmrc`, package engines and lockfiles describe the supported setup.
`app/` and `ai-tool/` are separate npm packages: run installs inside each.

```bash
cd app
npm ci --ignore-scripts --no-audit --no-fund
npm run dev
```

Verification from `app/`:

```bash
npm run lint -- --max-warnings 0
npm run build           # TypeScript + Vite + offline fixture prerender
npm run test:coverage
npx playwright install chromium
npm run test:e2e        # Desktop/mobile browser tests; backend APIs mocked
npm run preview
```

Local/preview builds use a deterministic fixture catalogue and never notify search
engines or purge caches. They still need backend APIs for real interactive data;
Vite does not provide the production WordPress proxy. `npm run build:production`
explicitly fetches live catalogue metadata. Cloudflare production builds on `main`
select live mode automatically and fail if required data is missing. Never upload
fixture `dist/` to production. `.npmrc` disables dependency lifecycle scripts.

The CI workflow also builds `ai-tool/` and runs PHP syntax/payment contract tests
in an offline PHP container. Browser/API mocks and WP/WC stubs are not a live
payment, email, database or capacity test. See
[the implementation and deployment report](docs/FIX_IMPLEMENTATION_2026-10-22.md)
for completed work, residual findings and the Hostinger deployment boundary.

## Deployment

### Frontend & Edge (Primary)
1. Push to `main` branch
2. Cloudflare Pages automatically builds `app/` and deploys to edge (including `_middleware.js` as Worker)
3. Live in ~1-2 minutes

### WordPress Customizations
- `wp-content/mu-plugins/hackknow-checkout.php` (order filtering, 30-day download expiry, custom checkout fields)
- Deploy via SFTP to Hostinger (port 65002) or Replit automation script

### Legacy Note
`gce/` folder and old `DEPLOYMENT_GUIDE.md` contain previous Google Cloud Engine setup. They are retained for history but are no longer used in production.

## Health & Production Audit

- GitHub Actions workflow `.github/workflows/hk-overnight-audit.yml` runs **every hour**
- Performs 11 production health checks
- Reports published to `audit-reports` branch
- Latest report: [View Latest Audit](https://github.com/gaganchauhan1997/Yahavi2022/blob/audit-reports/.audit/latest.md)

**Current Status**: 10/11 checks passing (one non-critical RSS proxy warning).

## Performance Highlights
- Mobile PageSpeed: 88-93 | Desktop: 95
- Hero image optimized from 957KB PNG → 16KB WebP
- Main bundle ~98KB gzipped with aggressive code-splitting (React.lazy for 17 routes)
- Self-hosted fonts (no Google Fonts latency)

## License

MIT — see [LICENSE](./LICENSE).

---

**Maintained by**: gaganchauhan1997 | Live: [www.hackknow.com](https://www.hackknow.com) | Contact: team@hackknow.com
