# Company, free Excel resources and performance update

Request: publish current leadership, remember Manish Kumar Singh respectfully, remove Gourav and the anonymous developer-person section, replace public business phone contacts with email, review performance/SEO and publish commercially redistributable free Excel workbooks.

## Company content

- About: Manish Kumar Singh is remembered as **Late Beloved Founder & Mentor**. Gagan Chauhan is identified as Founder of hackknow.com, based in Nangli Razapur, Delhi, with a bio adapted from the previous technical-builder profile. Vinay Rajouria is credited as Co-Founder and website designer.
- Remove Gourav's About section and published portrait assets. Remove the anonymous developer profile. The existing AI product brand is a separate name and has not been renamed.
- Remove old mentor narration rather than present an outdated living-person introduction or generate a synthetic tribute voice. The memorial photograph remains.
- Remove the disrespectful fictional tiger/death comic from Testimonials in light of the founder memorial.
- Replace published business telephone/WhatsApp contacts on contact, footer, legal, support, pending-order, checkout-success and account pages with founder@hackknow.com / team@hackknow.com. Retain customer-entered phone fields needed by existing forms/payment integration.
- Contact location: Delhi, India. Index/schema, prerendered About/Contact copy and edge AI attribution follow the current identity. The prepared Hostinger AI prompt source also changes, but that PHP file is not deployed through Pages.
- The founder's exact personal LinkedIn URL was requested; no verified URL is present in the repository. No guessed personal profile link is published. The company LinkedIn link is not represented as a personal founder profile.

## Free Excel collection

Nine workbooks are hosted as public static downloads, categorised under Finance (6), Career (1) and Business planning (2), at `/free-excel-templates/`. Each ZIP contains an unchanged `.xlsx`, full original MIT license and attribution/source README. These are third-party works, not represented as original HackKnow designs. Both MIT grants expressly permit commercial use and redistribution, with notices retained.

Sources:
- https://github.com/jacobq/budget-spreadsheet — Monthly Budget Planner, MIT, copyright 2016 Jacob.
- https://github.com/agung2001/life-operating-system — eight career/finance/management workbooks, MIT, copyright 2022 Agung Sundoro.

The JSON manifest pins source revisions, exact source paths, license links, workbook SHA-256 and package SHA-256. Downloads use hash-versioned filenames. Build preparation decodes checked-in packages offline and rejects checksum/size/path mismatches. License and README remain in every distributed ZIP.

Inspection: archives parse, checksums match, original workbook bytes remain unchanged; no VBA, external workbook links, connections, ActiveX or embedded object parts were found by the structural screen. This is not antivirus certification or a guarantee of financial/model accuracy. Sample values/formulas must be reviewed before use. The 9 packages total 837,815 bytes. Sources without clear redistribution permission were not copied; "free download" alone is insufficient.

The collection is available on the website and linked from the footer/sitemap. It is not imported as nine WooCommerce products: that would require active backend inventory/admin access. Free public downloads do not need a checkout or account, and static downloads bypass Pages Functions. No new storage service or paid subscription is provisioned.

## Performance and SEO

Baseline Lighthouse 13.5.0, Chromium, proxied lab runs (not CrUX field data):

| Page | Mobile score | Mobile LCP | Mobile CLS | Desktop score | Desktop LCP | Desktop CLS |
| --- | --- | --- | --- | --- | --- | --- |
| Home | 65 | 5.07s | 0.003 | 89 | 1.60s | 0.003 |
| About | 64 | 5.40s | 0.0001 | 75 | 1.41s | 0.402 |
| Shop | 51 | 6.62s | 0.179 | 93 | 1.25s | 0.105 |

These are one-run measurements on this workspace/network, not historical production scores or a 75th-percentile real-user result. After-release measurements, raw audits and a broader route/interaction sweep are included in the final handover PDF/artifacts.

Implemented fixes:
- Self-host Inter, Space Grotesk and JetBrains Mono through pinned Fontsource packages; remove duplicate blocking/async Google stylesheets and unnecessary Google font preconnects. Publish their OFL notices under `/licenses/`.
- Load Google Identity only on login/signup pages, retaining the existing OAuth flow and sharing concurrent SDK requests. Lighthouse identified roughly 86 KB of unused Google SDK code during public browsing.
- Keep the lazy-page loader at least one viewport tall so the footer is not shown and then pushed away during route code loading.
- Reserve product-grid space with layout-matched skeletons, rather than showing a short spinner then pushing the visible footer down several screens. First shop product image is eager/high priority, with explicit dimensions; remaining cards stay lazy.
- Correct trailing-slash route metadata lookup, canonical directory URLs, and SPA robots transitions between account/auth and public pages. Known private pages remain noindex; unknown client routes are noindex. Add the working skip-link target to main content.
- Publish founder/company schema and a source-attributed free-resource CollectionPage/ItemList; add the free page to generated sitemap and prerendered HTML.

Limits: HTTP soft-404 handling, backend catalogue latency, full SSR/rendering coverage, accessibility issues surfaced by broader checks and field Core Web Vitals remain separate concerns. Do not claim every URL is fully SEO-complete or that one lab run certifies good CWV for all users. No stress test, live payment or email campaign is performed.

## Validation and deployment

Local build/typecheck, zero-warning ESLint, 14 regression tests and 16 desktop/mobile browser cases pass. New cases cover the founder memorial/removed sections, absent public phone links, category filtering, nine real package downloads, Google SDK loading on auth pages, and private-to-public robots reset. Archive/license/checksum inspection is recorded separately. GitHub CI and Cloudflare deployment are verified before reporting live status; the final PDF records the production revision and after-release metrics.

Pages deploys storefront/edge/static downloads only. Existing Hostinger PHP, Zoho SMTP, Drive backups and prior payment/SSO/database blockers are not activated by this change. Prior report: `docs/FIX_IMPLEMENTATION_2026-10-22.md`.
