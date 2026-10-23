# Storefront cleanup and branded free Excel resources — 23 October 2026

## Implemented in the storefront

- Founder profiles remain exactly https://www.linkedin.com/in/gagan-yahavi-hackknow/ and https://www.instagram.com/i_kunalarious/ (tracking query removed).
- Remove the black TDM / Dead Man AI header promotion on mobile and desktop, including its unused sigil component. This removes the requested header entry; it does not delete the separate AI service or unrelated support chat.
- Delete the fabricated purchase-notification component, its random names/cities/timestamps and its unnecessary catalogue request. It cannot resume on a timer or after cookie consent.
- Remove hardcoded testimonial cards and the unverified featured-review quotation/star rating. Replace the testimonials page with product-feedback/support links. Real backend product reviews are a separate data source; they are not fabricated replacements or erased by this release.
- Remove unsupported hardcoded customer/member/resource totals from the home/community/trust banners, mobile navigation and relevant crawler/route metadata. Replace the community freebie membership/review gate with a working direct-download route. Correct the home community section's placeholder links.
- Remove newsletter signup and the exit-intent lead capture popup. Replace the footer signup with a direct free-resource link. Remove the retired local email cache (`hk_local_leads_v1`) from a returning browser when the new app runs. This is not a server-side account/database wipe.

## Nine free branded workbooks

All nine resources at `/free-excel-templates/` remain free direct ZIP downloads. No price, account, email address, cart or payment is required. This applies to this curated collection; existing unrelated WooCommerce catalogue prices are not changed.

Each workbook now contains an appended **HackKnow** welcome tab with a yellow/black title, clickable `https://www.hackknow.com/`, the free-collection link, support email, source author/revision links and adaptation notice. Original worksheet order, cells, formulas, relationships and sample values are preserved. The new tab is selected on opening where the workbook view supports it. Existing source authors are credited; these are adapted third-party MIT resources, not original HackKnow designs. Every ZIP retains the original complete MIT notice and a new adaptation README.

The original-source `workbookSha256` remains pinned; `brandedWorkbookSha256`, distribution hash, bytes and versioned download paths identify the adapted files. `scripts/brand-free-templates.py` is a manual curation tool requiring Python + lxml and original packages; normal website builds need neither Python nor network downloads for packaging.

Validation compares every existing worksheet XML/relationship part byte-for-byte, checks preserved namespaces, opens each resulting workbook with openpyxl for structure/link inspection, and checks package/workbook checksums, archive integrity and license preservation. This is not Microsoft Excel UI testing or formula-accuracy/financial-advice certification. Template example values are clearly labelled examples inside the workbook; they are not fake live customer records.

## Prevent sample content returning after a reset (backend patch prepared)

Five historical content-seeding plugins can recreate sample courses/products/content when their completion flags disappear. Seven mutation callbacks now return before any content API unless `HACKKNOW_ENABLE_SAMPLE_SEED === true` AND WordPress reports `local` or `development`. Production remains blocked even with the opt-in constant. The separate v5 preview-category filter continues to work. Existing records are not removed by these guards.

These PHP source changes need staging/reconciliation with the actual installed Hostinger plugins before activation. A Pages deployment does not deploy them. Offline guard tests exercise seven callbacks in three blocked modes (21 cases); ordinary payment contract checks remain in CI.

## Customer data reset: not executed — access unavailable

The user authorised a fresh start because outstanding customer balances are settled. No Hostinger/SFTP, WordPress database/admin or email/backup storage credentials are configured in the current cloud runtime. GitHub access does not grant database access. No user, order, review, wallet or payment history has been deleted from production. No SQL wipe, public deletion endpoint or unauthorised bypass has been attempted.

A complete reset requires scoped backend access and this sequence:

1. Inventory actual WordPress/WooCommerce/plugin versions, table prefix, HPOS vs legacy order storage, customer roles and owner/admin accounts. Inventory aggregate record counts without copying customer details into GitHub/reports.
2. Create a restricted temporary rollback backup and verify it can restore; keep it out of the public repository, website and this handover. Set its deletion/retention handling explicitly, since a backup still contains the old data.
3. Disable live seeders, scheduled imports, duplicate mail sends and other jobs that can recreate records. Reconcile and activate the prepared source guards in staging first.
4. Use supported WooCommerce/WordPress APIs to remove the authorised old customer accounts, orders/refunds, addresses, notes, download permissions, product reviews and sessions. Preserve owner/admin access, infrastructure settings, licensed resources and genuine catalogue content. Handle both guest orders and authenticated customers; do not assume deleting wp_users covers them.
5. Purge associated custom chat histories, leads/newsletter lists, support data, community/badge records, wallet/ledger/customer coupons, queued messages and stored attachments, based on the real plugin schema. Invalidate old sessions and download grants. Review external mail/Drive backups and other retained copies separately; a website wipe does not erase those copies.
6. Unpublish clearly identified sample/unfinished products/courses after inventory; verify actual deliverable files and licenses before restoring listings. Keep test fixtures exclusively in offline tests/build fixtures, not live catalogue content.
7. Verify aggregate old-customer/order/chat/lead counts are zero (owner/admin accounts excluded), anonymous free downloads work, fresh signup and recovery work, and a sandbox order/download/refund path works. Rebuild snapshots and purge relevant public caches. Remove the temporary rollback copy according to the agreed retention handling after verification.

Until that process runs, do not describe the website as a completely empty customer database or all backend catalogue content as verified. Existing login, checkout, contact/support submission and support-chat functionality can still collect information when a visitor uses it; this release removes the promotional email capture widgets, not every transactional feature.

## Suggestions after this release

1. Keep the free collection available without registration; provide clear source/license notices and screenshots of actual worksheets.
2. Publish only products with checked files and a tested download path. Keep incomplete/sample catalogue items unpublished.
3. Investigate the previously observed API HTTP 429 responses using Cloudflare/Hostinger logs, then complete backend activation, mail and backup/restore checks.
4. Continue mobile loading and accessibility work from the prior measured report. No stress test, full field Core Web Vitals result, enterprise certification or one-million-visitor capacity claim is made.

No new paid service is introduced. Release checks and the production revision/deployment outcome are recorded in the handover evidence.
