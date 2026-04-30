# HackKnow Shop Seed Scripts

Bulk product update tooling for `shop.hackknow.com` (WooCommerce on Hostinger).

## Files

- `names.py` — Source-of-truth product names + slugs grouped by category (`NAME_POOLS`), plus per-category metadata (`CAT_META`) and per-category counts (`COUNTS`). 206 unique Excel templates across 13 categories.
- `content_v2.py` — Wedding-format HTML description generator. Produces:
  - Excerpt (~170-185 bytes) — hook + tagline only, NO body duplication.
  - Description (~2 KB) — context, value-prop, ✔ checklist, contextual `<details>` blocks.
  - Yoast title (≤60 chars) and meta description (exactly 160 chars).
- `update_all.py` — Concurrent runner (4 workers) that loops over all 207 SKUs (`HK-EX-{CAT}-{NN}` + bundle `HK-EXCEL-BUNDLE-206`) and POSTs to the `/update-product` endpoint of the `hackknow-bulk-products` mu-plugin.

## Mu-plugin endpoints used

The `hackknow-bulk-products.php` mu-plugin (also under `hostinger/mu-plugins/`) exposes:

- `GET  /wp-json/hk-bulk/v1/list-skus` — returns all 207 SKU → product-id mappings.
- `POST /wp-json/hk-bulk/v1/update-product` — sets `_hk_managed=yes` and updates `content`, `excerpt`, `title`, `yoast_*` for a product (lookup by `id` or `sku`).
- `POST /wp-json/hk-bulk/v1/sideload-thumb` — idempotent media sideload of a remote image into the WP media library and attaches as the product thumbnail.

All endpoints require the `X-HK-DB-Token` admin token.

## Usage

```bash
export HK_SHOP_TOKEN="<server-side admin token>"

# Smoke-test on one SKU
python3 hostinger/seed/update_all.py --only-sku HK-EX-ACCOUNTING-01

# Smoke-test the first N
python3 hostinger/seed/update_all.py --limit 10

# Run on all 207 (4 workers, ~70 seconds)
python3 hostinger/seed/update_all.py
```

The token is **never** committed to the repo. Set `HK_SHOP_TOKEN` in your shell or CI secrets.
