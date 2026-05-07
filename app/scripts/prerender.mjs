#!/usr/bin/env node
/**
 * hk-prerender — postbuild SEO snapshot generator.
 *
 * Runs after `vite build`. Reads dist/index.html (Vite's SPA shell with the
 * correct hashed asset URLs) and emits per-route copies under dist/<path>/index.html
 * with route-specific:
 *   • <title>, <meta name="description">, <link rel="canonical">
 *   • Open Graph + Twitter Card meta
 *   • JSON-LD structured data (Organization + WebSite for /, BreadcrumbList +
 *     CollectionPage + ItemList for category pages, Product + Offer for product pages)
 *   • <noscript> body block with real text content for crawlers that don't / can't
 *     execute JS (the visible app still hydrates normally for human users)
 *
 * Also overwrites dist/sitemap.xml with a dynamic version that includes all
 * categories + products fetched from the WooCommerce store API.
 *
 * Optional: if CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID env vars are set,
 * issues a `purge_everything` after writing.
 *
 * Failure-safe: any WC fetch / write error is logged but does NOT fail the
 * build (process exits 0). The static public/sitemap.xml acts as a fallback.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const DIST = path.join(APP_ROOT, 'dist');

const SITE = 'https://www.hackknow.com';
const STORE_API = 'https://shop.hackknow.com/wp-json/wc/store/v1';
const TODAY = new Date().toISOString().slice(0, 10);

// ─── helpers ───────────────────────────────────────────────────────────────
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
})[c]);
const stripHtml = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const truncate = (s, n) => {
  const t = stripHtml(s);
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};
const safeHttpsUrl = (u) => {
  try {
    const parsed = new URL(u);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') ? parsed.toString() : '';
  } catch { return ''; }
};

async function fetchAllPages(endpoint, perPage = 100) {
  const all = [];
  for (let page = 1; page <= 50; page++) {
    const url = `${STORE_API}${endpoint}?per_page=${perPage}&page=${page}`;
    let r;
    try {
      r = await fetch(url, { headers: { 'User-Agent': 'HackKnow-Prerender/1.0' } });
    } catch (e) {
      console.warn(`  WC fetch error ${url}: ${e.message}`);
      break;
    }
    if (!r.ok) {
      console.warn(`  WC ${r.status} on ${url} — stopping pagination`);
      break;
    }
    let data;
    try { data = await r.json(); } catch { break; }
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    if (data.length < perPage) break;
  }
  return all;
}

// ─── meta application ──────────────────────────────────────────────────────
function applyMeta(html, { title, description, canonical, ogImage, jsonLd, noscriptBody }) {
  let out = html;

  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  const setMeta = (re, replacement) => {
    if (re.test(out)) out = out.replace(re, replacement);
    else out = out.replace('</head>', `  ${replacement}\n</head>`);
  };

  setMeta(/<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${escapeHtml(description)}">`);
  setMeta(/<link\s+rel="canonical"[^>]*>/i,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`);
  setMeta(/<meta\s+property="og:title"[^>]*>/i,
    `<meta property="og:title" content="${escapeHtml(title)}">`);
  setMeta(/<meta\s+property="og:description"[^>]*>/i,
    `<meta property="og:description" content="${escapeHtml(description)}">`);
  setMeta(/<meta\s+property="og:url"[^>]*>/i,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`);
  setMeta(/<meta\s+property="og:image"[^>]*>/i,
    `<meta property="og:image" content="${escapeHtml(ogImage)}">`);
  setMeta(/<meta\s+name="twitter:title"[^>]*>/i,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`);
  setMeta(/<meta\s+name="twitter:description"[^>]*>/i,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`);
  setMeta(/<meta\s+name="twitter:image"[^>]*>/i,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}">`);

  // Inject JSON-LD before </head>
  if (jsonLd && jsonLd.length) {
    const ldBlock = jsonLd
      .map((j) => `<script type="application/ld+json" data-prerender="1">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`)
      .join('\n  ');
    out = out.replace('</head>', `  ${ldBlock}\n</head>`);
  }

  // Inject noscript body block right after opening <body...>
  if (noscriptBody) {
    out = out.replace(/<body([^>]*)>/i,
      `<body$1><noscript><div style="max-width:960px;margin:1rem auto;padding:1rem;font-family:system-ui;line-height:1.6;color:#1a1a1a">${noscriptBody}</div></noscript>`);
  }
  return out;
}

async function writeRoute(routePath, html) {
  const out = routePath === '/'
    ? path.join(DIST, 'index.html')
    : path.join(DIST, routePath.replace(/^\//, ''), 'index.html');
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, html);
}

// ─── JSON-LD builders ──────────────────────────────────────────────────────
const ORG_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'HackKnow',
  url: SITE,
  logo: `${SITE}/icon-512.png`,
  sameAs: [
    'https://www.instagram.com/hackknow',
    'https://www.youtube.com/@hackknow',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'support@hackknow.com',
    areaServed: 'IN',
  },
};

const WEBSITE_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'HackKnow',
  url: SITE,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE}/shop?q={query}`,
    'query-input': 'required name=query',
  },
};

const breadcrumbLd = (crumbs) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.name,
    item: c.url,
  })),
});

function priceMajor(p) {
  const minor = Number(p?.prices?.price ?? 0);
  const exp = p?.prices?.currency_minor_unit ?? 2;
  return minor / Math.pow(10, exp);
}

function productLd(p) {
  const price = priceMajor(p);
  const images = (p.images || []).slice(0, 5).map((i) => safeHttpsUrl(i.src)).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: truncate(p.short_description || p.description || p.name, 300),
    sku: String(p.sku || p.id || ''),
    image: images.length ? images : [`${SITE}/og-image.jpg`],
    url: `${SITE}/product/${p.slug}`,
    brand: { '@type': 'Brand', name: 'HackKnow' },
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: p?.prices?.currency_code || 'INR',
      availability: 'https://schema.org/InStock',
      url: `${SITE}/product/${p.slug}`,
    },
  };
}

// ─── sitemap ───────────────────────────────────────────────────────────────
function buildSitemap(cats, products) {
  const STATIC = [
    { p: '/',                  pri: '1.0', cf: 'daily'   },
    { p: '/shop',              pri: '0.9', cf: 'daily'   },
    { p: '/courses',           pri: '0.8', cf: 'weekly'  },
    { p: '/roadmaps',          pri: '0.8', cf: 'weekly'  },
    { p: '/community',         pri: '0.6', cf: 'weekly'  },
    { p: '/blog',              pri: '0.7', cf: 'daily'   },
    { p: '/about',             pri: '0.6', cf: 'monthly' },
    { p: '/contact',           pri: '0.5', cf: 'monthly' },
    { p: '/faq',               pri: '0.5', cf: 'monthly' },
    { p: '/affiliate',         pri: '0.5', cf: 'monthly' },
    { p: '/privacy',           pri: '0.3', cf: 'yearly'  },
    { p: '/refund-policy',     pri: '0.3', cf: 'yearly'  },
    { p: '/terms',             pri: '0.3', cf: 'yearly'  },
    { p: '/support',           pri: '0.5', cf: 'monthly' },
    { p: '/login',             pri: '0.3', cf: 'monthly' },
    { p: '/signup',            pri: '0.4', cf: 'monthly' },
    { p: '/hacked-news',       pri: '0.6', cf: 'hourly'  },
    { p: '/mis-templates',     pri: '0.7', cf: 'weekly'  },
    { p: '/testimonials',      pri: '0.5', cf: 'monthly' },
    { p: '/sponsor',           pri: '0.4', cf: 'monthly' },
    { p: '/become-a-vendor',   pri: '0.4', cf: 'monthly' },
    { p: '/sitemap',           pri: '0.3', cf: 'monthly' },
  ];
  const urls = [];
  for (const s of STATIC) {
    urls.push(`  <url><loc>${SITE}${s.p === '/' ? '/' : s.p}</loc><lastmod>${TODAY}</lastmod><changefreq>${s.cf}</changefreq><priority>${s.pri}</priority></url>`);
  }
  for (const c of cats) {
    urls.push(`  <url><loc>${SITE}/shop/${c.slug}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  }
  for (const p of products) {
    urls.push(`  <url><loc>${SITE}/product/${p.slug}</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`);
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

// ─── main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 hk-prerender starting…');

  // Fetch live data (graceful on failure)
  let cats = [], products = [];
  try {
    cats = await fetchAllPages('/products/categories');
    console.log(`  ✓ ${cats.length} categories fetched`);
  } catch (e) {
    console.warn(`  ✗ categories fetch failed: ${e.message}`);
  }
  try {
    products = await fetchAllPages('/products');
    console.log(`  ✓ ${products.length} products fetched`);
  } catch (e) {
    console.warn(`  ✗ products fetch failed: ${e.message}`);
  }

  // Sitemap
  try {
    const xml = buildSitemap(cats, products);
    await fs.writeFile(path.join(DIST, 'sitemap.xml'), xml);
    console.log(`  ✓ dist/sitemap.xml (${xml.length} B, ${cats.length} cats + ${products.length} products + 22 static)`);
  } catch (e) {
    console.warn(`  ✗ sitemap write failed: ${e.message}`);
  }

  // robots.txt — ensure it points at sitemap
  try {
    const robotsPath = path.join(DIST, 'robots.txt');
    let robots = await fs.readFile(robotsPath, 'utf8').catch(() => '');
    if (!robots) {
      robots = `# HackKnow.com — robots.txt\nUser-agent: *\nAllow: /\nDisallow: /wp-admin/\nDisallow: /account\nDisallow: /checkout\nDisallow: /cart\n`;
    }
    if (!/Sitemap:/i.test(robots)) {
      robots = robots.trimEnd() + `\n\nSitemap: ${SITE}/sitemap.xml\n`;
      await fs.writeFile(robotsPath, robots);
      console.log('  ✓ robots.txt — Sitemap directive appended');
    } else {
      console.log('  ✓ robots.txt — already references sitemap');
    }
  } catch (e) {
    console.warn(`  ✗ robots.txt: ${e.message}`);
  }

  // Read template AFTER sitemap/robots are settled
  let tmpl;
  try {
    tmpl = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
  } catch (e) {
    console.warn(`  ✗ cannot read dist/index.html — aborting prerender: ${e.message}`);
    return;
  }

  let pages = 0;
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));

  // ── homepage ──
  try {
    await writeRoute('/', applyMeta(tmpl, {
      title: 'HackKnow — Premium Excel Templates, MIS Dashboards & Digital Products | India',
      description: `Buy & download premium Excel dashboards, PowerPoint templates, marketing kits, and digital products. ${products.length}+ templates across ${cats.length} categories. Trusted by 10,000+ Indian professionals.`,
      canonical: `${SITE}/`,
      ogImage: `${SITE}/og-image.jpg`,
      jsonLd: [ORG_LD, WEBSITE_LD],
      noscriptBody: `
        <h1>HackKnow — Premium Digital Templates & Tools</h1>
        <p>India's trusted marketplace for ${products.length}+ premium digital products across ${cats.length} categories. Excel dashboards, PowerPoint templates, website themes, courses, and more. Instant download. Lifetime license. Trusted by 10,000+ Indian professionals.</p>
        <h2>Browse Top Categories</h2>
        <ul>${cats.filter((c) => !c.parent).map((c) => `<li><a href="${SITE}/shop/${c.slug}">${escapeHtml(c.name)} (${c.count} products)</a></li>`).join('')}</ul>
        <h2>Quick Links</h2>
        <ul>
          <li><a href="${SITE}/shop">Shop all templates</a></li>
          <li><a href="${SITE}/courses">Premium courses</a></li>
          <li><a href="${SITE}/roadmaps">Career roadmaps</a></li>
          <li><a href="${SITE}/about">About HackKnow</a></li>
        </ul>`,
    }));
    pages++;
  } catch (e) { console.warn(`  ✗ homepage: ${e.message}`); }

  // ── /shop ──
  try {
    await writeRoute('/shop', applyMeta(tmpl, {
      title: 'Shop — All Digital Templates & Tools · HackKnow',
      description: `Browse ${products.length}+ premium digital products on HackKnow. Excel dashboards, PowerPoint decks, website templates, courses, marketing kits. Instant download. Lifetime license.`,
      canonical: `${SITE}/shop`,
      ogImage: `${SITE}/og-image.jpg`,
      jsonLd: [breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: 'Shop', url: SITE + '/shop' }])],
      noscriptBody: `
        <h1>Shop All Digital Templates · HackKnow</h1>
        <p>All ${products.length} premium digital products available for instant download.</p>
        <h2>Featured Products</h2>
        <ul>${products.slice(0, 60).map((p) => `<li><a href="${SITE}/product/${p.slug}">${escapeHtml(p.name)}</a></li>`).join('')}</ul>`,
    }));
    pages++;
  } catch (e) { console.warn(`  ✗ /shop: ${e.message}`); }

  // ── per-category pages ──
  for (const cat of cats) {
    try {
      const catProducts = products.filter((p) => (p.categories || []).some((c) => c.id === cat.id));
      const parent = cat.parent ? catById[cat.parent] : null;
      const crumbs = [{ name: 'Home', url: SITE + '/' }, { name: 'Shop', url: SITE + '/shop' }];
      if (parent) crumbs.push({ name: parent.name, url: `${SITE}/shop/${parent.slug}` });
      crumbs.push({ name: cat.name, url: `${SITE}/shop/${cat.slug}` });

      const desc = truncate(cat.description, 250) ||
        `Browse premium ${cat.name.toLowerCase()} on HackKnow. ${cat.count} products. Instant download. Lifetime license. Trusted by 10,000+ Indian professionals.`;

      await writeRoute(`/shop/${cat.slug}`, applyMeta(tmpl, {
        title: `Buy ${cat.name} | HackKnow — Premium Digital Templates`,
        description: desc,
        canonical: `${SITE}/shop/${cat.slug}`,
        ogImage: cat.image?.src ? safeHttpsUrl(cat.image.src) || `${SITE}/og-image.jpg` : `${SITE}/og-image.jpg`,
        jsonLd: [
          breadcrumbLd(crumbs),
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: cat.name,
            url: `${SITE}/shop/${cat.slug}`,
            description: desc,
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: catProducts.length,
              itemListElement: catProducts.slice(0, 25).map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${SITE}/product/${p.slug}`,
                name: p.name,
              })),
            },
          },
        ],
        noscriptBody: `
          <p><a href="${SITE}/">Home</a> &rsaquo; <a href="${SITE}/shop">Shop</a> &rsaquo; ${escapeHtml(cat.name)}</p>
          <h1>Buy ${escapeHtml(cat.name)} | HackKnow</h1>
          <p>${escapeHtml(desc)}</p>
          <h2>${catProducts.length} products in this category</h2>
          <ul>${catProducts.slice(0, 50).map((p) => `<li><a href="${SITE}/product/${p.slug}">${escapeHtml(p.name)} — ₹${priceMajor(p).toFixed(0)}</a></li>`).join('')}</ul>`,
      }));
      pages++;
    } catch (e) { console.warn(`  ✗ /shop/${cat.slug}: ${e.message}`); }
  }

  // ── top product pages (top 20 by rating, fallback first 20) ──
  const topProducts = [...products]
    .sort((a, b) => (Number(b.average_rating || 0) - Number(a.average_rating || 0)))
    .slice(0, 20);
  for (const p of topProducts) {
    try {
      const cat = (p.categories && p.categories[0]) ? catById[p.categories[0].id] : null;
      const crumbs = [{ name: 'Home', url: SITE + '/' }, { name: 'Shop', url: SITE + '/shop' }];
      if (cat) crumbs.push({ name: cat.name, url: `${SITE}/shop/${cat.slug}` });
      crumbs.push({ name: p.name, url: `${SITE}/product/${p.slug}` });

      const price = priceMajor(p);
      const desc = truncate(p.short_description || p.description || p.name, 250);
      const img = safeHttpsUrl(p.images?.[0]?.src || '') || `${SITE}/og-image.jpg`;

      await writeRoute(`/product/${p.slug}`, applyMeta(tmpl, {
        title: `${p.name} — ₹${price.toFixed(0)} · HackKnow`,
        description: desc,
        canonical: `${SITE}/product/${p.slug}`,
        ogImage: img,
        jsonLd: [breadcrumbLd(crumbs), productLd(p)],
        noscriptBody: `
          <p><a href="${SITE}/">Home</a> &rsaquo; <a href="${SITE}/shop">Shop</a>${cat ? ` &rsaquo; <a href="${SITE}/shop/${cat.slug}">${escapeHtml(cat.name)}</a>` : ''} &rsaquo; ${escapeHtml(p.name)}</p>
          <h1>${escapeHtml(p.name)}</h1>
          <p><strong>Price:</strong> ₹${price.toFixed(2)} INR · <strong>Availability:</strong> In stock · <strong>Brand:</strong> HackKnow</p>
          ${img ? `<p><img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" style="max-width:100%;height:auto"></p>` : ''}
          <p>${escapeHtml(desc)}</p>
          <p><a href="${SITE}/product/${p.slug}">View product on HackKnow</a></p>`,
      }));
      pages++;
    } catch (e) { console.warn(`  ✗ /product/${p.slug}: ${e.message}`); }
  }

  console.log(`  ✓ ${pages} per-route HTML snapshots written into dist/`);

  // Optional Cloudflare cache purge
  if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID) {
    try {
      const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purge_everything: true }),
      });
      const j = await r.json().catch(() => ({}));
      console.log(`  ${r.ok && j.success ? '✓' : '✗'} Cloudflare purge: ${j.success ? 'OK' : JSON.stringify(j.errors || j)}`);
    } catch (e) {
      console.warn(`  ✗ Cloudflare purge: ${e.message}`);
    }
  } else {
    console.log('  ⓘ Cloudflare purge skipped (set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID env vars to enable)');
  }

  console.log('🎉 hk-prerender done');
}

main().catch((e) => {
  // Never break the build — log and exit 0
  console.warn(`hk-prerender unexpected error: ${e.message}`);
  console.warn(e.stack);
});
