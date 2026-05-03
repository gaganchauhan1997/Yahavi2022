# HackKnow Monorepo

Production stack for **[hackknow.com](https://www.hackknow.com)** — India's premium digital products marketplace (Excel templates, PowerPoint decks, courses, dashboards, marketing kits).

## Architecture

```
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│   www.hackknow.com │───▶│   GCE nginx (us-c1) │───▶│  shop.hackknow.com │
│      (React SPA)   │    │  static + reverse  │    │  WordPress / WC    │
└────────────────────┘    │  proxy /wp-json/*  │    │  (Hostinger)       │
                          └────────────────────┘    └────────────────────┘
```

## Repos

This monorepo (pnpm workspaces):

- `artifacts/api-server` — Express API server (Node/TS)
- `artifacts/mockup-sandbox` — component preview server (Vite)
- `lib/api-spec` — OpenAPI contract (source of truth)
- `lib/api-client-react` — generated React Query hooks
- `lib/api-zod` — generated Zod validators
- `lib/db` — Drizzle schemas + migrations

The **React storefront** (the actual SPA at hackknow.com) is in a sibling repo and auto-deploys to GCE via webhook on push to `main`.

## Health & Audit

- Every hour, GitHub Actions runs `.github/workflows/hk-overnight-audit.yml`, performing 11 production health checks. Reports land on the `audit-reports` branch.
- Latest report: `https://github.com/gaganchauhan1997/Yahavi2022/blob/audit-reports/.audit/latest.md`

## Local development

```bash
pnpm install
pnpm --filter @workspace/api-server dev          # API on configured PORT
pnpm --filter @workspace/mockup-sandbox dev      # component sandbox
pnpm typecheck                                   # full repo typecheck
pnpm --filter @workspace/api-spec run codegen    # regenerate hooks + zod
```

## Deploy

- **API server**: `pnpm --filter @workspace/api-server build && publish via Replit deployment`
- **Frontend**: push to `main` of the storefront repo → GCE webhook auto-deploys to `/var/www/hackknow/dist`
- **WordPress mu-plugins**: SFTP upload to `domains/shop.hackknow.com/public_html/wp-content/mu-plugins/`

## License

MIT — see [LICENSE](./LICENSE).
