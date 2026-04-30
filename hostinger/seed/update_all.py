"""Bulk-update all 207 products with new wedding-format content + Yoast SEO.

NO image work — descriptions + excerpts + SEO meta only.
Uses /update-product endpoint (idempotent, sets _hk_managed=yes).
"""
import os, sys, json, time, argparse
import urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
sys.path.insert(0, os.path.dirname(__file__))
from names import NAME_POOLS, CAT_META, COUNTS
from content_v2 import description_html, excerpt_html, yoast_meta

BASE = "https://shop.hackknow.com"
TOKEN = os.environ.get("HK_SHOP_TOKEN", "")
if not TOKEN:
    raise SystemExit("HK_SHOP_TOKEN env var not set; export it before running")
VERSION = "v2-2026-04-30"


def post(path, data, timeout=45):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(data).encode(),
        headers={'Content-Type': 'application/json', 'X-HK-DB-Token': TOKEN, 'Cache-Control': 'no-cache'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except: return e.code, {'error': str(e)}
    except Exception as e:
        return 0, {'error': str(e)[:120]}


def get(path, timeout=30):
    req = urllib.request.Request(f"{BASE}{path}",
        headers={'X-HK-DB-Token': TOKEN, 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def build_jobs():
    """Build (sku, name, slug, fkw, cat_key) tuples for ALL 206 templates + 1 bundle."""
    jobs = []
    for cat_key in sorted(COUNTS):
        cat_short = CAT_META[cat_key]['slug'].upper().replace('EXCEL-', '')
        names = NAME_POOLS[cat_key]
        for idx, (name, slug, fkw) in enumerate(names):
            sku = f"HK-EX-{cat_short}-{idx+1:02d}"
            jobs.append({'sku': sku, 'name': name, 'slug': slug, 'fkw': fkw, 'cat_key': cat_key})
    # Bundle (separate kind)
    jobs.append({
        'sku': 'HK-EXCEL-BUNDLE-206', 'name': 'All-In-One Excel Templates Mega Bundle (206 Templates)',
        'slug': 'all-in-one-excel-templates-mega-bundle',
        'fkw': 'excel templates bundle',
        'cat_key': 'BUNDLE',
    })
    return jobs


def bundle_description(name):
    """Special wedding-format description for the bundle product."""
    import html
    return f"""<div class="hk-product-desc">
  <p class="hk-context">Why pay for one when you can own the whole shelf?</p>
  <p>This easy-to-use <strong>{html.escape(name)}</strong> gives you every HackKnow Excel template ever made — 206 ready-to-use spreadsheets across budgets, accounting, calculators, calendars, charts, finance, inventory, invoices, planners, schedules, student tools, timelines and timesheets — all for one tiny price.</p>

  <details open>
    <summary>💡 Why grab the bundle</summary>
    <p>Buying templates one by one adds up fast — and you never know which one you'll need next month.</p>
    <p>This bundle gives you instant access to every category, every use case, every layout — so you're ready for any spreadsheet need that pops up at work, home or business.</p>
  </details>

  <details>
    <summary>📦 What's inside</summary>
    <ul class="hk-checklist">
      <li>✔ 9 Accounting templates (ledgers, P&L, cash flow, GST, etc.)</li>
      <li>✔ 18 Budget planners (personal, household, wedding, project)</li>
      <li>✔ 12 Calculators (EMI, SIP, mortgage, retirement)</li>
      <li>✔ 12 Calendar templates (yearly, monthly, weekly)</li>
      <li>✔ 14 Chart templates (sales, KPIs, dashboards)</li>
      <li>✔ 13 Financial management templates</li>
      <li>✔ 17 Inventory trackers (retail, restaurant, warehouse)</li>
      <li>✔ 18 Invoice templates (services, GST, freelance)</li>
      <li>✔ 23 Planner & tracker templates (goals, habits, projects)</li>
      <li>✔ 18 Schedule templates (daily, weekly, shift)</li>
      <li>✔ 19 Student templates (study plans, attendance, grades)</li>
      <li>✔ 16 Timeline templates (projects, weddings, launches)</li>
      <li>✔ 17 Timesheet templates (employee, freelance, project)</li>
    </ul>
  </details>

  <details>
    <summary>⚡ Features across all 206 templates</summary>
    <ul class="hk-checklist">
      <li>✔ Pre-built formulas — just plug in your numbers</li>
      <li>✔ Clean neobrutal design — easy on the eyes</li>
      <li>✔ Works in Microsoft Excel and Google Sheets</li>
      <li>✔ No macros, no add-ons — open and go</li>
      <li>✔ Print and PDF-friendly layouts</li>
      <li>✔ Fully editable for your brand or personal use</li>
    </ul>
  </details>

  <details>
    <summary>🎯 Benefits</summary>
    <ul class="hk-checklist">
      <li>✔ Replace expensive subscription tools with one-time ₹19 templates</li>
      <li>✔ Always have the right template for any task</li>
      <li>✔ Save hours every month on formatting and setup</li>
      <li>✔ Look professional with consistent, branded layouts</li>
      <li>✔ Lifetime access — no recurring fees, ever</li>
    </ul>
  </details>

  <details>
    <summary>👤 Perfect for</summary>
    <ul class="hk-checklist">
      <li>✔ Small business owners and freelancers</li>
      <li>✔ Students, teachers and parents</li>
      <li>✔ Project managers and team leads</li>
      <li>✔ Anyone who lives in spreadsheets</li>
    </ul>
  </details>

  <details>
    <summary>📥 What you get</summary>
    <ul class="hk-checklist">
      <li>✔ All 206 templates (.xlsx) in one bundle download</li>
      <li>✔ Quick-start guide for each category</li>
      <li>✔ Lifetime access — every future template added free</li>
      <li>✔ Instant download, no signup needed</li>
    </ul>
  </details>

  <p class="hk-closing"><strong>💎 One bundle. Every spreadsheet you'll ever need.</strong></p>
  <p class="hk-cta">👉 Grab the mega bundle today — every template, one tiny price!</p>
</div>"""


def bundle_excerpt():
    return ('<p class="hk-hook"><strong>📦 Get All 206 Excel Templates In One Bundle!</strong></p>'
            '<p class="hk-tagline">✨ Every category. Every use case. One tiny price.</p>')


def bundle_yoast():
    title = "All Excel Templates Mega Bundle (206) | HackKnow"
    desc = ("Get all 206 HackKnow Excel templates in one mega bundle — budgets, accounting, "
            "invoices, planners, charts and more. Lifetime access. Works in Excel & Google Sheets.")
    return title, desc[:160], 'excel templates bundle'


def make_payload(job):
    name, slug, fkw, cat_key, sku = job['name'], job['slug'], job['fkw'], job['cat_key'], job['sku']
    if cat_key == 'BUNDLE':
        content = bundle_description(name)
        excerpt = bundle_excerpt()
        title, desc, focuskw = bundle_yoast()
    else:
        content = description_html(name, slug, fkw, cat_key)
        excerpt = excerpt_html(name, slug, fkw, cat_key)
        title, desc, focuskw = yoast_meta(name, fkw, cat_key)
    return {
        'sku': sku, 'content': content, 'excerpt': excerpt,
        'yoast_title': title, 'yoast_desc': desc, 'yoast_focuskw': focuskw,
        'og_title': title, 'og_desc': desc,
        'twitter_title': title, 'twitter_desc': desc,
        'version': VERSION,
    }


def process(job):
    try:
        payload = make_payload(job)
        c, r = post('/wp-json/hackknow-bulk/v1/update-product', payload, timeout=45)
        if c != 200 or not r.get('ok'):
            return ('fail', job['sku'], c, r)
        return ('ok', job['sku'], r.get('product_id'))
    except Exception as e:
        return ('exc', job.get('sku', '?'), str(e)[:200])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=0, help='process only first N (0=all)')
    ap.add_argument('--only-sku', help='process only this SKU (smoke test)')
    ap.add_argument('--workers', type=int, default=4)
    args = ap.parse_args()

    jobs = build_jobs()
    print(f"total jobs built: {len(jobs)}", flush=True)

    if args.only_sku:
        jobs = [j for j in jobs if j['sku'] == args.only_sku]
        print(f"filtered to {len(jobs)} job(s) by --only-sku", flush=True)
    elif args.limit > 0:
        jobs = jobs[:args.limit]
        print(f"limited to first {len(jobs)} jobs", flush=True)

    if not jobs:
        print("no jobs to process"); return

    t0 = time.time(); ok = 0; fails = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futs = {pool.submit(process, j): j for j in jobs}
        done = 0
        for fut in as_completed(futs):
            r = fut.result()
            done += 1
            if r[0] == 'ok':
                ok += 1
                if done <= 5 or done % 25 == 0 or done == len(jobs):
                    print(f"  {done}/{len(jobs)} ok={ok} fails={len(fails)} elapsed={time.time()-t0:.0f}s :: {r[1]} -> pid {r[2]}", flush=True)
            else:
                fails.append(r)
                print(f"  {done}/{len(jobs)} FAIL :: {r}", flush=True)

    print(f"\nDONE in {time.time()-t0:.0f}s: ok={ok} failures={len(fails)} of {len(jobs)}", flush=True)
    if fails:
        print("FAILURES:")
        for f in fails[:30]: print(f"  {f}", flush=True)


if __name__ == '__main__':
    main()
