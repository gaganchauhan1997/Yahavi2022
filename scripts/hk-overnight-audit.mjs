#!/usr/bin/env node
/**
 * HackKnow overnight audit — read-only health checks against production
 * with auto-retry. Writes JSON + Markdown reports to $AUDIT_OUT.
 *
 * Designed to run from GitHub Actions every hour. Never fails the workflow
 * (always exits 0) — failures are surfaced via the report status string.
 */

import fs from 'node:fs';
import path from 'node:path';

const OUT  = process.env.AUDIT_OUT || '/tmp/audit-out';
const SITE = 'https://www.hackknow.com';
const NOW  = new Date();
const STAMP = NOW.toISOString().replace(/[:.]/g, '-').slice(0, 16) + 'Z';

fs.mkdirSync(OUT, { recursive: true });

/** Fetch with timeout + N retries (exponential-ish backoff). */
async function tryFetch(url, opts = {}, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeout ?? 12000);
    try {
      const r = await fetch(url, {
        method: opts.method || 'GET',
        headers: { 'User-Agent': 'HackKnow-Audit-Bot/1.0', ...(opts.headers || {}) },
        body: opts.body,
        signal: ctrl.signal,
        redirect: 'follow',
      });
      clearTimeout(t);
      const text = opts.noBody ? '' : await r.text();
      return { ok: true, status: r.status, text, headers: r.headers, attempt: i + 1 };
    } catch (e) {
      clearTimeout(t);
      last = e;
      if (i < attempts - 1) await new Promise(res => setTimeout(res, 1500 * (i + 1)));
    }
  }
  return { ok: false, status: 0, text: '', error: String(last), attempt: attempts };
}

const checks = [];
function check(name, fn) { checks.push({ name, fn }); }

// ── 1. Homepage liveness + splash + SW killer ───────────────────────
check('Homepage 200 + splash + SW killer', async () => {
  const r = await tryFetch(`${SITE}/`);
  if (r.status !== 200) return { pass: false, msg: `status=${r.status} attempt=${r.attempt}` };
  const splash = (r.text.match(/hk-splash/g) || []).length;
  const sw     = r.text.includes('serviceWorker') && r.text.includes('unregister');
  if (splash < 5) return { pass: false, msg: `splash markers ${splash} < 5` };
  if (!sw)        return { pass: false, msg: `SW killer missing` };
  return { pass: true, msg: `splash×${splash} + SW killer ok` };
});

// ── 2. No Hindi in JSON-LD ──────────────────────────────────────────
check('JSON-LD has no Hindi', async () => {
  const r = await tryFetch(`${SITE}/`);
  const hits = (r.text.match(/Hindi/gi) || []).length;
  return { pass: hits === 0, msg: `Hindi occurrences=${hits}` };
});

// ── 3. Hacked News page + RSS chunk hardened ───────────────────────
check('Hacked News chunk has all 3 proxies + no javascript:', async () => {
  const r = await tryFetch(`${SITE}/hacked-news`);
  if (r.status !== 200) return { pass: false, msg: `page status=${r.status}` };
  const home = await tryFetch(`${SITE}/`);
  const indexHash = (home.text.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
  if (!indexHash) return { pass: false, msg: 'no index bundle ref' };
  const bundle = await tryFetch(`${SITE}${indexHash}`);
  const newsChunk = (bundle.text.match(/HackedNewsPage-[A-Za-z0-9_-]+\.js/) || [])[0];
  if (!newsChunk) return { pass: false, msg: 'no HackedNewsPage chunk in bundle' };
  const chunk = await tryFetch(`${SITE}/assets/${newsChunk}`);
  const has = (s) => chunk.text.includes(s);
  const ladderOk = has('codetabs') && has('allorigins') && has('rss2json');
  const xssLeak  = chunk.text.includes('javascript:');
  if (!ladderOk) return { pass: false, msg: `proxy ladder missing in ${newsChunk}` };
  if (xssLeak)   return { pass: false, msg: `javascript: leaked into bundle (XSS regression)` };
  return { pass: true, msg: `${newsChunk} ok (3 proxies, sanitised)` };
});

// ── 4. Backend /releases (curated news) ─────────────────────────────
check('Backend /releases returns items', async () => {
  const r = await tryFetch(`${SITE}/wp-json/hackknow/v1/releases?limit=5`);
  if (r.status !== 200) return { pass: false, msg: `status=${r.status}` };
  try {
    const j = JSON.parse(r.text);
    const arr = Array.isArray(j) ? j : (j.items || []);
    return { pass: arr.length > 0, msg: `${arr.length} releases` };
  } catch { return { pass: false, msg: 'not JSON' }; }
});

// ── 5. Backend /roadmaps ────────────────────────────────────────────
check('Backend /roadmaps returns ≥10', async () => {
  const r = await tryFetch(`${SITE}/wp-json/hackknow/v1/roadmaps`);
  if (r.status !== 200) return { pass: false, msg: `status=${r.status}` };
  try {
    const j = JSON.parse(r.text);
    const arr = Array.isArray(j) ? j : (j.items || []);
    return { pass: arr.length >= 10, msg: `${arr.length} roadmaps` };
  } catch { return { pass: false, msg: 'not JSON' }; }
});

// ── 6. Backend /courses ─────────────────────────────────────────────
check('Backend /courses returns items', async () => {
  const r = await tryFetch(`${SITE}/wp-json/hackknow/v1/courses`);
  if (r.status !== 200) return { pass: false, msg: `status=${r.status}` };
  try {
    const j = JSON.parse(r.text);
    const arr = Array.isArray(j) ? j : (j.items || []);
    return { pass: arr.length > 0, msg: `${arr.length} courses` };
  } catch { return { pass: false, msg: 'not JSON' }; }
});

// ── 7. Yahavi chat history endpoint reachable ──────────────────────
check('Yahavi /chat/history reachable', async () => {
  const r = await tryFetch(`${SITE}/wp-json/hackknow/v1/chat/history`);
  // 200 = ok, 401 = needs auth (route alive). Anything else is a regression.
  return { pass: r.status === 200 || r.status === 401, msg: `status=${r.status}` };
});

// ── 8. Sponsor order rejects bad payload (route alive) ─────────────
check('Sponsor order route alive (rejects bad payload)', async () => {
  const r = await tryFetch(`${SITE}/wp-json/hackknow/v1/sponsor-guest/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  return { pass: r.status >= 400 && r.status < 500, msg: `status=${r.status}` };
});

// ── 9. Storefront — 10 critical pages all 200 ──────────────────────
check('Storefront 10 routes all 200', async () => {
  const routes = ['/', '/shop', '/courses', '/roadmaps', '/about',
                  '/community', '/support', '/contact', '/login', '/checkout'];
  const results = await Promise.all(routes.map(p =>
    tryFetch(`${SITE}${p}`, { noBody: true }, 2).then(r => ({ p, status: r.status }))
  ));
  const fails = results.filter(r => r.status !== 200);
  return {
    pass: fails.length === 0,
    msg: fails.length ? fails.map(f => `${f.p}=${f.status}`).join(', ')
                      : `${results.length}/${results.length} ok`,
  };
});

// ── 10. Live RSS proxy probe (sample of 6 representative feeds) ────
check('RSS proxy alive (≥3/6 sample feeds via codetabs)', async () => {
  const FEEDS = [
    'https://techcrunch.com/feed/',
    'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'https://krebsonsecurity.com/feed/',
    'https://huggingface.co/blog/feed.xml',
    'https://feeds.arstechnica.com/arstechnica/index',
    'https://feeds.feedburner.com/TheHackersNews',
  ];
  const probes = await Promise.all(FEEDS.map(async f => {
    const u = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(f)}`;
    const r = await tryFetch(u, { timeout: 9000 }, 2);
    return r.status === 200 && (r.text.includes('<item') || r.text.includes('<entry'));
  }));
  const live = probes.filter(Boolean).length;
  return {
    pass: live >= 3,
    msg: `${live}/${FEEDS.length} sample feeds returned items`,
  };
});

// ── 11. Bundle present + sized sanely + cache-control immutable ────
check('Main bundle present + ≥100KB + cache headers', async () => {
  const r = await tryFetch(`${SITE}/`);
  const indexHash = (r.text.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
  if (!indexHash) return { pass: false, msg: 'no bundle ref in HTML' };
  // GET (not HEAD) — some CDNs don't return Content-Length on HEAD.
  const got = await tryFetch(`${SITE}${indexHash}`, { timeout: 15000 });
  if (got.status !== 200) return { pass: false, msg: `bundle status=${got.status}` };
  const len  = got.text.length;
  const cc   = got.headers ? got.headers.get('cache-control') || '' : '';
  const immut = cc.includes('immutable');
  if (len < 100_000) return { pass: false, msg: `${indexHash.split('/').pop()} only ${len}B` };
  return { pass: true, msg: `${indexHash.split('/').pop()} ${len}B${immut ? ' immutable' : ''}` };
});

// ── run ─────────────────────────────────────────────────────────────
const results = [];
for (const c of checks) {
  const t0 = Date.now();
  let res;
  try { res = await c.fn(); }
  catch (e) { res = { pass: false, msg: `EXCEPTION: ${e.message}` }; }
  res.name = c.name;
  res.ms = Date.now() - t0;
  results.push(res);
  console.log(`${res.pass ? 'OK ' : 'FAIL'} | ${c.name} — ${res.msg} (${res.ms}ms)`);
}

const passed = results.filter(r => r.pass).length;
const total  = results.length;
const status = passed === total ? `OK ${passed}/${total}` : `WARN ${passed}/${total}`;

const md = [
  `# HackKnow audit — ${NOW.toISOString()}`,
  ``,
  `**Status: ${status}**`,
  ``,
  `Site: ${SITE}`,
  ``,
  `| # | Check | Result | Detail | Latency |`,
  `|---|---|---|---|---|`,
  ...results.map((r, i) => `| ${i + 1} | ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.msg} | ${r.ms}ms |`),
  ``,
  `Generated by \`scripts/hk-overnight-audit.mjs\`.`,
  ``,
].join('\n');

fs.writeFileSync(path.join(OUT, `audit-${STAMP}.json`),
  JSON.stringify({ at: NOW.toISOString(), passed, total, status, results }, null, 2));
fs.writeFileSync(path.join(OUT, `audit-${STAMP}.md`), md);
fs.writeFileSync(path.join(OUT, 'latest.md'), md);
fs.writeFileSync(path.join(OUT, 'latest-status.txt'), status);

// Rolling INDEX.md (newest first, max 200 lines)
const indexPath = path.join(OUT, 'INDEX.md');
let prevBullets = [];
try {
  const txt = fs.readFileSync(indexPath, 'utf8');
  prevBullets = txt.split('\n').filter(l => l.startsWith('- '));
} catch {}
const bullet = `- ${NOW.toISOString()} — ${status} — [report](audit-${STAMP}.md)`;
const merged = [bullet, ...prevBullets].slice(0, 200);
fs.writeFileSync(indexPath,
  `# HackKnow audit log\n\nNewest first. Each row links to a per-run report.\n\n${merged.join('\n')}\n`);

console.log(`\n${status}`);
process.exit(0); // never fail the workflow — surface via status text instead
