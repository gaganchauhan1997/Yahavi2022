# HackKnow fixes — 22 October 2026

Baseline: main `58ddf68784633b14d53c54aff083b8806b6eb758`.
Scope: improve the existing React/Cloudflare Pages + Hostinger WordPress/WooCommerce setup. No migration, new paid service, payment charge, mail campaign or database cleanup was performed. GitHub source publication, Cloudflare deployment and Hostinger PHP activation are separate steps; consult the accompanying handover PDF for their final status.

## Implemented in source

| Area | Change and practical effect |
| --- | --- |
| Reproducible builds | Node 24.19.0/npm 11.9.0 pins; lockfile installs; dependency lifecycle scripts disabled; CI covers both apps, lint, offline prerender, regression tests, browser tests and PHP contracts. |
| Build safety | Local/preview catalogue fixtures; explicit live production mode; required origin failures reject the deployment; pagination refuses silent partial results. Builds no longer ping search engines or purge an entire zone cache. Production cannot explicitly select fixture mode. |
| Dependencies | Compatible dependency/lockfile updates, patched minimist/tmp/node-fetch/parser overrides; ai-tool Router upgrade. Main app npm audit: 32 findings (3 critical, 22 high, 4 moderate, 3 low) to 6 (0 critical, 5 high, 1 moderate). Audit counts include transitive/related package entries, not six independent exploits. |
| HTML | Sanitize blog/CMS/Brainxercise markup. Patch the actual x-data-spreadsheet shared HTML editor sink through a tested adapter. This mitigates the advisory; it does not make the abandoned upstream package maintained. |
| Catalogue | De-duplicate concurrent catalogue pagination, finite TTL/timeouts, reject broken cursors, remove auth token from public GraphQL requests. Failed live data never becomes sample products. Unknown/missing file availability is blocked on listing and direct product purchase UI. |
| Product navigation | Remount product detail when its slug changes, preventing a previous product/preview from leaking into the new route. |
| Proxy | Preserve same-origin API routing; private no-store on API/auth/admin/cookie responses; security headers; same-origin redirects/cookies; bounded origin wait; generic public network errors. `_routes.json` limits Functions invocation to proxy/API paths so static pages/assets bypass Functions. |
| Chat | Bound streamed body to 32 KiB, message/history sizes and accepted roles before invoking AI; provider errors are not exposed; Gemini edge fallback requires explicit opt-in. Supports an optional rate-limiter binding, which was not provisioned. |
| Checkout | Verification waits are bounded through response body consumption. On timeout the UI uses the pending-order path rather than automatically charging again. |
| Consent | Tag Manager loads only after stored/explicit acceptance; declined/unknown consent does not load it. This covers GTM, not every third-party embed or a legal compliance certification. |
| SSO | Reject URL userinfo/unapproved return origins, disable localhost in production, correct login continuation parameter. Full single-use SSO remains a separate backend/client change. |
| Payment PHP | Shared stored-order/amount/captured-INR invariants across verify/webhook/manual/cron completion; MySQL advisory order lock and unique payment-to-WC-order binding; retries avoid duplicate completion; invalid signature no longer changes a paid order to failed. Remove forced permission renewal on verify/download reads and explicit duplicate mail sends. |
| Backend auth | Password-hash-bound tokens are revoked by password reset. Dedicated admin bearer required instead of webhook signing secret. Database diagnostics require admin; cleanup token accepted only in header. |
| Backend correctness | Move identity verification off payment `/verify`; WC order metadata APIs for new payment bindings; WC order queries for customer downloads; use native WooCommerce account download permissions/expiry instead of a custom raw permissions-table URL query; remove raw file URL fallback; release free-order reservation on explicit price drift. |

## Verification performed locally

- Clean `npm ci --ignore-scripts` succeeded; both TypeScript/Vite applications build.
- Storefront ESLint succeeds with zero warnings.
- 14 Vitest regression tests pass, including actual upstream spreadsheet sink and an offline prerender with fetch prohibited. Coverage is deliberately reported honestly: roughly 39% of lines in the selected helper/edge files, not full application coverage.
- 10 Chromium browser cases pass across desktop/mobile, using mock catalogue/availability APIs and blocked external services: cart persistence, unverified product blocking, catalogue failure recovery and analytics consent.
- 23 PHP files pass syntax checks in PHP 8.3.36. 28 offline assertions exercise payment invariants, duplicate completion, payment reuse, contention, exception recovery, the canonical verify callback, and password-reset token revocation. WordPress/WooCommerce/database are stubs, not a real integration environment.
- Explicit live-data prerender succeeded through this workspace's configured network proxy: 30 categories, 271 products, 10 courses, 12 roadmaps, 258 posts, 407 snapshots. No purge/notifications. This proves build/data compatibility at that moment, not checkout performance.
- No production stress test, real payment/refund or transactional-email test was run.

## Cloudflare configuration applied

Project `yahavi2022`: build command is `npm ci --ignore-scripts --no-audit --no-fund && npm run build`; preview and production Node/npm variables pinned to 24.19.0/11.9.0. `fail_open` is false so exhausted/broken Functions do not silently bypass API handling. Existing secret variables were preserved. These settings take effect on new deployments and do not retroactively modify an older Worker deployment.

## Hostinger deployment — still requires access and live inventory

Source patches are not live backend fixes. The public REST route inventory differs from the tracked PHP; do not overwrite active plugins from this repository without a comparison.

1. Provide a temporary SFTP credential limited to the site's relevant files, SSH/WP-CLI or an authenticated staging/admin path, plus permission to inspect the active mu-plugin/plugin manifest. No credentials in GitHub or reports.
2. Take an encrypted off-site file/database backup and prove restore to staging. Export settings and scheduled actions. Keep the existing live PHP files for rollback.
3. Compare active callbacks/priorities and reconcile duplicate routes, legacy wallet variants, seed/import tools and HPOS mode. Test against actual PHP/WP/WC versions and confirm the DB supports connection-scoped `GET_LOCK` on the configured connection/pool.
4. Deploy `hostinger/mu-plugins/inc/hk-payment-safety.php` together with BOTH `hackknow-checkout.php` and `zz-hackknow-payment-fix.php`. Deploy related content/dbtools/free-order changes only after comparing active versions. No automatic PHP upload is configured.
5. Token format changes invalidate existing sessions. Plan a forced re-login; exercise login, Google login, account/downloads, reset password and all tool SSO paths. The ai-tool's JWT bridge also needs coordinated revocation semantics.
6. With Razorpay TEST keys and a test webhook signing secret, test successful/cancelled/failed payment, bad signature, wrong amount/order/currency, verify/webhook races and duplicate delivery, capture arriving late, refunds and interrupted reconciliation. Verify exactly one completion and expected download/email behaviour in the real system.
7. Confirm coupon reservation behaviour under retries/crashes, WP-Cron/Action Scheduler health, SMTP retries and paid download expiry. Then deploy during the agreed maintenance window and monitor logs; restore previous files if regressions occur.

## Remaining work and required inputs

| Priority | Remaining item | Needed / next free step |
| --- | --- | --- |
| P0 | Activate and prove backend patches safely | Temporary limited Hostinger access; actual plugin inventory; staging DB/files; Razorpay test credentials. Existing storefront remains on the previously deployed backend until then. |
| P0 | Restrict diagnostic/import/bootstrap routes actually exposed live | Compare live callbacks and retire unneeded tooling; remove query-string/admin secret fallbacks everywhere, not only dbtools. Repository fixes alone do not close drifted live routes. |
| P0 | Purchase/download confidentiality | Exercise WooCommerce permissions, refunds/revocation and direct-origin files; remove any bypass and expired-link renewal in active plugins. Current patch removes identified renewal/raw URL paths but is not a complete download-storage migration. |
| P1 | Durable single-use SSO / session revocation | Backend exchange endpoint and coordinated ai-tool/tdm changes. Browser localStorage tokens and client-trusted profile fragments still exist. Password reset revocation is implemented only in canonical tracked PHP. |
| P1 | Payment reconciliation pagination and durable progress | Existing 100-payment/30-minute scanner can miss busy/outage windows; implement paged durable checkpoints/backfill on actual WC/DB integration; test crashes/concurrency. |
| P1 | Coupon/free-order and wallet concurrency | Price-drift leak fixed; stale leases after process death, wallet route duplication and atomic ledger need actual schema/migration and integration tests. |
| P1 | Rate limits and zero-cost AI bounds | Optional edge limiter binding is not active. Add supported free controls, origin quotas and deterministic fallback. Existing WP fallback may use paid provider credentials; edge opt-in alone cannot guarantee zero existing provider spend. No plan upgrade was enabled. |
| P1 | Backups and mail | Google Drive OAuth folder access for encrypted backup/retention + restore test. Zoho mailbox's actual SMTP entitlement, region-specific host and app password; DNS access for SPF/DKIM/DMARC. Free Zoho SMTP eligibility must be verified; storage capacity alone is not a backup system. |
| P1 | Dependency maintenance | Remaining high entries are the Tailwind 3/braces/micromatch/chokidar/fast-glob chain; upstream major migration requires visual regression work. x-data-spreadsheet has no upstream fix; replace it or maintain a reviewed patch. Do not run audit fix --force blindly. |
| P1 | Real capacity proof | Define public page mix, cache hit ratio, image bytes, login/checkout/download peaks and bots. Run k6 against a staging origin at an agreed rate and monitor errors/p95/DB/CPU. Do not stress live payments. No 1-million-visitor capacity certification. |
| P2 | HTTP 404, SEO and content coverage | Current SPA catch-all still yields soft 404s; proper route-aware status handling and complete dynamic-route coverage remain. Sitemap contains more blog posts than the 50 post snapshots; static HTML is metadata/noscript, not full React SSR. Recheck canonicals, rendered content, accessibility and Core Web Vitals against the original screenshot findings. |
| P2 | CI release gating and operational alerts | Verify GitHub workflow runs/Cloudflare preview; configure required checks when admin access permits. Add free uptime/error alerts and incident/rollback runbook; test a restore regularly. |

## Cost and scale limits

No additional subscription or infrastructure was purchased or provisioned. Existing Hostinger/domain/payment-provider costs remain. GitHub Actions and Cloudflare usage still consume their plan allowances. Oracle, Supabase and Drive delivery were not introduced. A million unique visitors is not a load test: static page traffic can be cached, while login, catalogue APIs, checkout and downloads are dynamic and must be measured. Google Drive capacity does not guarantee public-download bandwidth/CDN rights or availability.

## Rollback

Cloudflare: restore the previous successful Pages deployment (production ID recorded before changes: `d86efef3-f0d8-45c6-ba77-f440b0e0ca03`) and, if necessary, revert this PR. Previous dashboard command was `npm install && npm run build`, Node 24.13.1/npm 10.9.2, fail_open true. Do not overwrite existing secrets while editing settings.

Hostinger: restore the matched plugin set and database backup from the deployment window. Do not mix a checkout plugin requiring the helper with an absent helper. Restoring old token code also changes session validity and must be considered during rollback. Payment capture and already-sent email are external facts: reconciliation is required even after a code rollback.

## One-million-visitor planning example (not a capacity result)

Over 30 days, 1,000,000 unique visitors average only 0.39 new visitors/second. At 5 pages/visitor this becomes about 1.93 page views/second; a 10x peak is about 19.3 page views/second, before repeat visits or bots. Request and byte counts still depend on assets and cache behaviour. Two dynamic API requests per visitor means roughly 2 million dynamic requests/month (66,667/day); five means roughly 5 million (166,667/day). Compare the measured totals and peak days against the actual free-plan daily allowances. Cacheable HTML/images and dynamic authenticated checkout cannot be counted as the same workload. The route restriction, de-duplication and TTL changes reduce unnecessary work but do not demonstrate a safe peak or unlimited free capacity.
