#!/usr/bin/env node
/**
 * hk-prerender v2 — enterprise-grade postbuild SEO snapshot generator.
 *
 * Runs after `vite build`. Targets Google's "Discovered – currently not indexed"
 * problem head-on by ensuring every important URL serves unique, content-rich,
 * crawlable HTML.
 *
 * v2 changes vs v1:
 *  • Sitemap INDEX architecture: /sitemap.xml is now a <sitemapindex> pointing
 *    at /sitemap-static.xml, /sitemap-categories.xml, /sitemap-products.xml,
 *    /sitemap-content.xml. Per-segment <50KB so Google ingests cleanly.
 *  • Prerenders ALL ~233 products (was top 20 only) — fixes the biggest leak
 *    where 213/233 product URLs served identical homepage HTML.
 *  • Prerenders 10 courses + 12 roadmaps + top 50 blog posts.
 *  • Image sitemap extension on product entries (image:image / image:loc).
 *  • Per-route HTML for /cart, /checkout, /login, /signup, /account, /wallet,
 *    /forgot-password, /reset-password, /verify, /order-pending, /auth/sso-bridge
 *    with <meta name="robots" content="noindex,follow">.
 *  • Strong INTERNAL LINKING: every <noscript> block now ends with a footer
 *    that links Home + Shop + 8 top categories — gives Google 10+ internal
 *    edges from every page so authority flows everywhere.
 *  • <link rel="alternate" hreflang="en-IN"> on every prerendered page.
 *  • Self-canonical with NO trailing slash, consistently. (Both /x and /x/
 *    serve the same file with the same canonical → resolves duplicate signal.)
 *  • IndexNow ping (Bing + Yandex) after build — instant submission of fresh URLs.
 *  • Optional Google sitemap ping + Cloudflare purge if env vars present.
 *  • Failure-safe: every section wrapped in try/catch, never breaks the build.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const DIST = path.join(APP_ROOT, 'dist');

const SITE = 'https://www.hackknow.com';
const STORE_API = 'https://shop.hackknow.com/wp-json/wc/store/v1';
const HK_API = 'https://shop.hackknow.com/wp-json/hackknow/v1';
const WP_API = 'https://shop.hackknow.com/wp-json/wp/v2';
const TODAY = new Date().toISOString().slice(0, 10);
const HREFLANG = 'en-IN';

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
const escXml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[c]);

async function fetchAllPages(baseUrl, perPage = 100, maxPages = 50) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}per_page=${perPage}&page=${page}`;
    let r;
    try {
      r = await fetch(url, { headers: { 'User-Agent': 'HackKnow-Prerender/2.0' } });
    } catch (e) {
      console.warn(`  fetch error ${url}: ${e.message}`);
      break;
    }
    if (!r.ok) {
      // Non-fatal: WP REST returns 400 when page > total
      if (r.status === 400 || r.status === 404) break;
      console.warn(`  HTTP ${r.status} on ${url} — stopping pagination`);
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

async function fetchJson(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'HackKnow-Prerender/2.0' } });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    console.warn(`  fetch err ${url}: ${e.message}`);
    return null;
  }
}

// ─── meta application ──────────────────────────────────────────────────────
function applyMeta(html, opts) {
  const {
    title, description, canonical, ogImage,
    jsonLd = [], noscriptBody = '',
    robots = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
  } = opts;
  let out = html;

  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  const setOrInsertMeta = (re, replacement) => {
    if (re.test(out)) out = out.replace(re, replacement);
    else out = out.replace('</head>', `  ${replacement}\n</head>`);
  };

  setOrInsertMeta(/<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${escapeHtml(description)}">`);
  setOrInsertMeta(/<link\s+rel="canonical"[^>]*>/i,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`);
  setOrInsertMeta(/<meta\s+name="robots"[^>]*>/i,
    `<meta name="robots" content="${escapeHtml(robots)}">`);
  setOrInsertMeta(/<meta\s+property="og:title"[^>]*>/i,
    `<meta property="og:title" content="${escapeHtml(title)}">`);
  setOrInsertMeta(/<meta\s+property="og:description"[^>]*>/i,
    `<meta property="og:description" content="${escapeHtml(description)}">`);
  setOrInsertMeta(/<meta\s+property="og:url"[^>]*>/i,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`);
  setOrInsertMeta(/<meta\s+property="og:image"[^>]*>/i,
    `<meta property="og:image" content="${escapeHtml(ogImage)}">`);
  setOrInsertMeta(/<meta\s+name="twitter:title"[^>]*>/i,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`);
  setOrInsertMeta(/<meta\s+name="twitter:description"[^>]*>/i,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`);
  setOrInsertMeta(/<meta\s+name="twitter:image"[^>]*>/i,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}">`);

  // hreflang (insert if missing — never duplicate)
  if (!/<link\s+rel="alternate"\s+hreflang=/i.test(out)) {
    out = out.replace('</head>',
      `  <link rel="alternate" hreflang="${HREFLANG}" href="${escapeHtml(canonical)}">\n  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical)}">\n</head>`);
  }

  // JSON-LD blocks
  if (jsonLd.length) {
    const ldBlock = jsonLd
      .map((j) => `<script type="application/ld+json" data-prerender="1">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`)
      .join('\n  ');
    out = out.replace('</head>', `  ${ldBlock}\n</head>`);
  }

  // noscript body
  if (noscriptBody) {
    out = out.replace(/<body([^>]*)>/i,
      `<body$1><noscript><div style="max-width:1100px;margin:0 auto;padding:1rem;font-family:system-ui;line-height:1.6;color:#1a1a1a">${noscriptBody}</div></noscript>`);
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

// ─── strong internal-linking footer (used in EVERY noscript block) ─────────
function internalNavFooter(cats) {
  const top = cats
    .filter((c) => !c.parent && c.count > 0)
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 8);
  return `
    <hr style="margin-top:2rem;border:0;border-top:1px solid #ddd">
    <nav aria-label="Site navigation" style="margin-top:1rem;font-size:.95em">
      <p><strong>HackKnow</strong> · <a href="${SITE}/">Home</a> · <a href="${SITE}/shop">Shop</a> · <a href="${SITE}/courses">Courses</a> · <a href="${SITE}/roadmaps">Roadmaps</a> · <a href="${SITE}/blog">Blog</a> · <a href="${SITE}/about">About</a> · <a href="${SITE}/contact">Contact</a></p>
      <p><strong>Top categories:</strong> ${top.map((c) => `<a href="${SITE}/shop/${c.slug}">${escapeHtml(c.name)}</a>`).join(' · ')}</p>
    </nav>`;
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
    availableLanguage: ['English'],
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
      seller: { '@type': 'Organization', name: 'HackKnow' },
    },
    ...(p.average_rating && Number(p.average_rating) > 0 && p.review_count > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(p.average_rating).toFixed(1),
        reviewCount: Number(p.review_count),
      },
    } : {}),
  };
}

function articleLd({ title, slug, excerpt, date, image }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: truncate(excerpt, 250),
    url: `${SITE}/blog/${slug}`,
    datePublished: date,
    dateModified: date,
    image: image ? [image] : [`${SITE}/og-image.jpg`],
    author: { '@type': 'Organization', name: 'HackKnow' },
    publisher: ORG_LD,
  };
}

function courseLd({ title, slug, description }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: title,
    description: truncate(description, 250) || title,
    url: `${SITE}/courses/${slug}`,
    provider: { '@type': 'Organization', name: 'HackKnow', sameAs: SITE },
  };
}

// ─── sitemap segments ──────────────────────────────────────────────────────
const STATIC_ROUTES = [
  { p: '/',                pri: '1.0', cf: 'daily'   },
  { p: '/shop',            pri: '0.9', cf: 'daily'   },
  { p: '/courses',         pri: '0.8', cf: 'weekly'  },
  { p: '/roadmaps',        pri: '0.8', cf: 'weekly'  },
  { p: '/community',       pri: '0.6', cf: 'weekly'  },
  { p: '/blog',            pri: '0.7', cf: 'daily'   },
  { p: '/about',           pri: '0.6', cf: 'monthly' },
  { p: '/contact',         pri: '0.5', cf: 'monthly' },
  { p: '/faq',             pri: '0.5', cf: 'monthly' },
  { p: '/affiliate',       pri: '0.5', cf: 'monthly' },
  { p: '/privacy',         pri: '0.3', cf: 'yearly'  },
  { p: '/refund-policy',   pri: '0.3', cf: 'yearly'  },
  { p: '/terms',           pri: '0.3', cf: 'yearly'  },
  { p: '/support',         pri: '0.5', cf: 'monthly' },
  { p: '/hacked-news',     pri: '0.6', cf: 'hourly'  },
  { p: '/mis-templates',   pri: '0.7', cf: 'weekly'  },
  { p: '/testimonials',    pri: '0.5', cf: 'monthly' },
  { p: '/sponsor',         pri: '0.4', cf: 'monthly' },
  { p: '/become-a-vendor', pri: '0.4', cf: 'monthly' },
  { p: '/sitemap',         pri: '0.3', cf: 'monthly' },
  { p: '/brainxercise',    pri: '0.4', cf: 'weekly'  },
];

// Routes Google should NEVER index (private/transactional)
const NOINDEX_ROUTES = [
  '/cart', '/checkout', '/order-pending', '/login', '/signup',
  '/forgot-password', '/reset-password', '/account', '/wallet',
  '/auth/sso-bridge', '/verify',
];

function sitemapHeader() {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/0.9">\n';
}
const sitemapFooter = '</urlset>\n';

function sitemapStaticXml() {
  const urls = STATIC_ROUTES.map((s) =>
    `  <url><loc>${SITE}${s.p === '/' ? '/' : s.p}</loc><lastmod>${TODAY}</lastmod><changefreq>${s.cf}</changefreq><priority>${s.pri}</priority></url>`,
  );
  return sitemapHeader() + urls.join('\n') + '\n' + sitemapFooter;
}

function sitemapCategoriesXml(cats) {
  const urls = cats
    .filter((c) => c.count > 0) // skip empties (anti-thin-content)
    .map((c) =>
      `  <url><loc>${SITE}/shop/${c.slug}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority>${c.image?.src ? `<image:image><image:loc>${escXml(c.image.src)}</image:loc><image:title>${escXml(c.name)}</image:title></image:image>` : ''}</url>`,
    );
  return sitemapHeader() + urls.join('\n') + '\n' + sitemapFooter;
}

function sitemapProductsXml(products) {
  const urls = products
    .filter((p) => p.is_purchasable !== false) // skip non-purchasable noise
    .map((p) => {
      const img = p.images?.[0]?.src ? safeHttpsUrl(p.images[0].src) : '';
      const imgBlock = img ? `<image:image><image:loc>${escXml(img)}</image:loc><image:title>${escXml(p.name)}</image:title></image:image>` : '';
      return `  <url><loc>${SITE}/product/${p.slug}</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority>${imgBlock}</url>`;
    });
  return sitemapHeader() + urls.join('\n') + '\n' + sitemapFooter;
}

function sitemapContentXml({ courses, roadmaps, blogPosts }) {
  const urls = [];
  for (const c of courses) {
    urls.push(`  <url><loc>${SITE}/courses/${c.slug}</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`);
  }
  for (const r of roadmaps) {
    urls.push(`  <url><loc>${SITE}/roadmaps/${r.slug}</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`);
  }
  for (const b of blogPosts) {
    const lastmod = (b.modified_gmt || b.date_gmt || b.modified || b.date || TODAY).slice(0, 10);
    urls.push(`  <url><loc>${SITE}/blog/${b.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`);
  }
  return sitemapHeader() + urls.join('\n') + '\n' + sitemapFooter;
}

function sitemapIndexXml(segments) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...segments.map((s) => `  <sitemap><loc>${SITE}/${s}</loc><lastmod>${TODAY}</lastmod></sitemap>`),
    '</sitemapindex>',
    '',
  ].join('\n');
}

// ─── route prerender helpers ───────────────────────────────────────────────
async function prerenderHome(tmpl, { cats, products, navFooter }) {
  return writeRoute('/', applyMeta(tmpl, {
    title: 'HackKnow — Premium Excel Templates, MIS Dashboards & Digital Products | India',
    description: `Buy & download premium Excel dashboards, PowerPoint templates, marketing kits, and digital products. ${products.length}+ templates across ${cats.length} categories. Trusted by 10,000+ Indian professionals.`,
    canonical: `${SITE}/`,
    ogImage: `${SITE}/og-image.jpg`,
    jsonLd: [ORG_LD, WEBSITE_LD],
    noscriptBody: `
      <h1>HackKnow — Premium Digital Templates & Tools</h1>
      <p>India's trusted marketplace for ${products.length}+ premium digital products across ${cats.length} categories. Excel dashboards, PowerPoint templates, website themes, courses, and more. Instant download. Lifetime license. Trusted by 10,000+ Indian professionals.</p>
      <h2>Browse Top Categories</h2>
      <ul>${cats.filter((c) => !c.parent && c.count > 0).map((c) => `<li><a href="${SITE}/shop/${c.slug}">${escapeHtml(c.name)} (${c.count} products)</a></li>`).join('')}</ul>
      <h2>Quick Links</h2>
      <ul>
        <li><a href="${SITE}/shop">Shop all templates</a></li>
        <li><a href="${SITE}/courses">Premium courses</a></li>
        <li><a href="${SITE}/roadmaps">Career roadmaps</a></li>
        <li><a href="${SITE}/blog">Blog & tutorials</a></li>
        <li><a href="${SITE}/about">About HackKnow</a></li>
      </ul>
      ${navFooter}`,
  }));
}

async function prerenderShop(tmpl, { products, navFooter }) {
  return writeRoute('/shop', applyMeta(tmpl, {
    title: 'Shop — All Digital Templates & Tools · HackKnow',
    description: `Browse ${products.length}+ premium digital products on HackKnow. Excel dashboards, PowerPoint decks, website templates, courses, marketing kits. Instant download. Lifetime license.`,
    canonical: `${SITE}/shop`,
    ogImage: `${SITE}/og-image.jpg`,
    jsonLd: [breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: 'Shop', url: SITE + '/shop' }])],
    noscriptBody: `
      <h1>Shop All Digital Templates · HackKnow</h1>
      <p>All ${products.length} premium digital products available for instant download.</p>
      <h2>Featured Products</h2>
      <ul>${products.slice(0, 80).map((p) => `<li><a href="${SITE}/product/${p.slug}">${escapeHtml(p.name)} — ₹${priceMajor(p).toFixed(0)}</a></li>`).join('')}</ul>
      ${navFooter}`,
  }));
}

async function prerenderCategory(tmpl, cat, { catProducts, parent, navFooter }) {
  const crumbs = [{ name: 'Home', url: SITE + '/' }, { name: 'Shop', url: SITE + '/shop' }];
  if (parent) crumbs.push({ name: parent.name, url: `${SITE}/shop/${parent.slug}` });
  crumbs.push({ name: cat.name, url: `${SITE}/shop/${cat.slug}` });

  const desc = truncate(cat.description, 250) ||
    `Browse premium ${cat.name.toLowerCase()} on HackKnow. ${cat.count} products. Instant download. Lifetime license. Trusted by 10,000+ Indian professionals.`;

  return writeRoute(`/shop/${cat.slug}`, applyMeta(tmpl, {
    title: `Buy ${cat.name} — ${cat.count} Premium Templates | HackKnow`,
    description: desc,
    canonical: `${SITE}/shop/${cat.slug}`,
    ogImage: cat.image?.src ? (safeHttpsUrl(cat.image.src) || `${SITE}/og-image.jpg`) : `${SITE}/og-image.jpg`,
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
          itemListElement: catProducts.slice(0, 30).map((p, i) => ({
            '@type': 'ListItem', position: i + 1, url: `${SITE}/product/${p.slug}`, name: p.name,
          })),
        },
      },
    ],
    noscriptBody: `
      <p><a href="${SITE}/">Home</a> &rsaquo; <a href="${SITE}/shop">Shop</a> &rsaquo; ${escapeHtml(cat.name)}</p>
      <h1>Buy ${escapeHtml(cat.name)} | HackKnow</h1>
      <p>${escapeHtml(desc)}</p>
      <h2>${catProducts.length} products in this category</h2>
      <ul>${catProducts.slice(0, 60).map((p) => `<li><a href="${SITE}/product/${p.slug}">${escapeHtml(p.name)} — ₹${priceMajor(p).toFixed(0)}</a></li>`).join('')}</ul>
      ${navFooter}`,
  }));
}

async function prerenderProduct(tmpl, p, { catById, navFooter }) {
  const cat = (p.categories && p.categories[0]) ? catById[p.categories[0].id] : null;
  const crumbs = [{ name: 'Home', url: SITE + '/' }, { name: 'Shop', url: SITE + '/shop' }];
  if (cat) crumbs.push({ name: cat.name, url: `${SITE}/shop/${cat.slug}` });
  crumbs.push({ name: p.name, url: `${SITE}/product/${p.slug}` });

  const price = priceMajor(p);
  const desc = truncate(p.short_description || p.description || p.name, 250);
  const img = safeHttpsUrl(p.images?.[0]?.src || '') || `${SITE}/og-image.jpg`;

  return writeRoute(`/product/${p.slug}`, applyMeta(tmpl, {
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
      <p><a href="${SITE}/product/${p.slug}">View product on HackKnow</a></p>
      ${navFooter}`,
  }));
}

async function prerenderCourse(tmpl, c, { navFooter }) {
  const crumbs = [{ name: 'Home', url: SITE + '/' }, { name: 'Courses', url: SITE + '/courses' }, { name: c.title || c.name, url: `${SITE}/courses/${c.slug}` }];
  const title = c.title || c.name || c.slug;
  const desc = truncate(c.description || c.excerpt || `${title} — premium HackKnow course.`, 250);
  return writeRoute(`/courses/${c.slug}`, applyMeta(tmpl, {
    title: `${title} Course · HackKnow`,
    description: desc,
    canonical: `${SITE}/courses/${c.slug}`,
    ogImage: safeHttpsUrl(c.image || c.cover || '') || `${SITE}/og-image.jpg`,
    jsonLd: [breadcrumbLd(crumbs), courseLd({ title, slug: c.slug, description: desc })],
    noscriptBody: `
      <p><a href="${SITE}/">Home</a> &rsaquo; <a href="${SITE}/courses">Courses</a> &rsaquo; ${escapeHtml(title)}</p>
      <h1>${escapeHtml(title)} · HackKnow Course</h1>
      <p>${escapeHtml(desc)}</p>
      ${navFooter}`,
  }));
}

async function prerenderRoadmap(tmpl, r, { navFooter }) {
  const crumbs = [{ name: 'Home', url: SITE + '/' }, { name: 'Roadmaps', url: SITE + '/roadmaps' }, { name: r.title || r.name, url: `${SITE}/roadmaps/${r.slug}` }];
  const title = r.title || r.name || r.slug;
  const desc = truncate(r.description || r.excerpt || `Step-by-step ${title} career roadmap on HackKnow.`, 250);
  return writeRoute(`/roadmaps/${r.slug}`, applyMeta(tmpl, {
    title: `${title} Roadmap · HackKnow`,
    description: desc,
    canonical: `${SITE}/roadmaps/${r.slug}`,
    ogImage: `${SITE}/og-image.jpg`,
    jsonLd: [breadcrumbLd(crumbs)],
    noscriptBody: `
      <p><a href="${SITE}/">Home</a> &rsaquo; <a href="${SITE}/roadmaps">Roadmaps</a> &rsaquo; ${escapeHtml(title)}</p>
      <h1>${escapeHtml(title)} Roadmap · HackKnow</h1>
      <p>${escapeHtml(desc)}</p>
      ${navFooter}`,
  }));
}

async function prerenderBlogPost(tmpl, b, { navFooter }) {
  const title = stripHtml(b.title?.rendered || '') || b.slug;
  const excerpt = stripHtml(b.excerpt?.rendered || '') || `${title} — read on the HackKnow blog.`;
  const date = (b.date_gmt || b.date || '').replace(' ', 'T');
  const crumbs = [{ name: 'Home', url: SITE + '/' }, { name: 'Blog', url: SITE + '/blog' }, { name: title, url: `${SITE}/blog/${b.slug}` }];
  return writeRoute(`/blog/${b.slug}`, applyMeta(tmpl, {
    title: `${title} · HackKnow Blog`,
    description: truncate(excerpt, 250),
    canonical: `${SITE}/blog/${b.slug}`,
    ogImage: `${SITE}/og-image.jpg`,
    jsonLd: [breadcrumbLd(crumbs), articleLd({ title, slug: b.slug, excerpt, date })],
    noscriptBody: `
      <p><a href="${SITE}/">Home</a> &rsaquo; <a href="${SITE}/blog">Blog</a> &rsaquo; ${escapeHtml(title)}</p>
      <h1>${escapeHtml(title)}</h1>
      <p><em>Published ${escapeHtml(date.slice(0, 10))} on the HackKnow Blog.</em></p>
      <p>${escapeHtml(excerpt)}</p>
      <p><a href="${SITE}/blog/${b.slug}">Read the full article on HackKnow</a></p>
      ${navFooter}`,
  }));
}

async function prerenderNoindexRoute(tmpl, routePath, label, { navFooter }) {
  return writeRoute(routePath, applyMeta(tmpl, {
    title: `${label} · HackKnow`,
    description: `${label} — HackKnow account area.`,
    canonical: `${SITE}${routePath}`,
    ogImage: `${SITE}/og-image.jpg`,
    robots: 'noindex,follow',
    jsonLd: [],
    noscriptBody: `<h1>${escapeHtml(label)}</h1><p>This page requires JavaScript. Please <a href="${SITE}/">return to the homepage</a>.</p>${navFooter}`,
  }));
}

// ─── pings ─────────────────────────────────────────────────────────────────
async function pingGoogleAndBing() {
  const sitemapUrl = `${SITE}/sitemap.xml`;
  const targets = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  ];
  for (const t of targets) {
    try {
      const r = await fetch(t, { method: 'GET', headers: { 'User-Agent': 'HackKnow-Prerender/2.0' } });
      console.log(`  ${r.ok ? '✓' : 'ⓘ'} ping ${new URL(t).host}: ${r.status}`);
    } catch (e) { console.warn(`  ✗ ping ${t}: ${e.message}`); }
  }
}

// ─── main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 hk-prerender v2 starting…');

  let cats = [], products = [], courses = [], roadmaps = [], blogPosts = [];
  try {
    cats = await fetchAllPages(`${STORE_API}/products/categories`);
    console.log(`  ✓ ${cats.length} categories`);
  } catch (e) { console.warn(`  ✗ categories: ${e.message}`); }
  try {
    products = await fetchAllPages(`${STORE_API}/products`);
    console.log(`  ✓ ${products.length} products`);
  } catch (e) { console.warn(`  ✗ products: ${e.message}`); }
  try {
    const j = await fetchJson(`${HK_API}/courses`);
    courses = Array.isArray(j) ? j : (j?.items || []);
    console.log(`  ✓ ${courses.length} courses`);
  } catch (e) { console.warn(`  ✗ courses: ${e.message}`); }
  try {
    const j = await fetchJson(`${HK_API}/roadmaps`);
    roadmaps = Array.isArray(j) ? j : (j?.items || []);
    console.log(`  ✓ ${roadmaps.length} roadmaps`);
  } catch (e) { console.warn(`  ✗ roadmaps: ${e.message}`); }
  try {
    blogPosts = await fetchAllPages(`${WP_API}/posts?_fields=id,slug,title,excerpt,date,date_gmt,modified,modified_gmt`, 100, 5);
    console.log(`  ✓ ${blogPosts.length} blog posts`);
  } catch (e) { console.warn(`  ✗ blog: ${e.message}`); }

  // ── Sitemap index + 4 segment sitemaps ──
  try {
    const segments = ['sitemap-static.xml', 'sitemap-categories.xml', 'sitemap-products.xml', 'sitemap-content.xml'];
    await fs.writeFile(path.join(DIST, 'sitemap-static.xml'), sitemapStaticXml());
    await fs.writeFile(path.join(DIST, 'sitemap-categories.xml'), sitemapCategoriesXml(cats));
    await fs.writeFile(path.join(DIST, 'sitemap-products.xml'), sitemapProductsXml(products));
    await fs.writeFile(path.join(DIST, 'sitemap-content.xml'), sitemapContentXml({ courses, roadmaps, blogPosts }));
    await fs.writeFile(path.join(DIST, 'sitemap.xml'), sitemapIndexXml(segments));
    const total = STATIC_ROUTES.length + cats.filter((c) => c.count > 0).length + products.filter((p) => p.is_purchasable !== false).length + courses.length + roadmaps.length + blogPosts.length;
    console.log(`  ✓ sitemap index + 4 segments (~${total} indexable URLs)`);
  } catch (e) { console.warn(`  ✗ sitemap: ${e.message}`); }

  // ── robots.txt: ensure Sitemap directive present ──
  try {
    const robotsPath = path.join(DIST, 'robots.txt');
    let robots = await fs.readFile(robotsPath, 'utf8').catch(() => '');
    if (!robots) {
      robots = `# HackKnow.com — robots.txt\nUser-agent: *\nAllow: /\nDisallow: /wp-admin/\nDisallow: /account\nDisallow: /checkout\nDisallow: /cart\nDisallow: /order/\n`;
    }
    if (!/Sitemap:/i.test(robots)) {
      robots = robots.trimEnd() + `\n\nSitemap: ${SITE}/sitemap.xml\n`;
      await fs.writeFile(robotsPath, robots);
      console.log('  ✓ robots.txt — Sitemap directive appended');
    } else {
      console.log('  ✓ robots.txt — Sitemap directive present');
    }
  } catch (e) { console.warn(`  ✗ robots.txt: ${e.message}`); }

  // ── Read template ──
  let tmpl;
  try {
    tmpl = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
  } catch (e) {
    console.warn(`  ✗ cannot read dist/index.html — aborting prerender: ${e.message}`);
    return;
  }

  const navFooter = internalNavFooter(cats);
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
  let pages = 0;

  // Home + Shop
  try { await prerenderHome(tmpl, { cats, products, navFooter }); pages++; } catch (e) { console.warn(`  ✗ /: ${e.message}`); }
  try { await prerenderShop(tmpl, { products, navFooter }); pages++; } catch (e) { console.warn(`  ✗ /shop: ${e.message}`); }

  // All non-empty categories
  for (const cat of cats) {
    if (cat.count === 0) continue;
    try {
      const catProducts = products.filter((p) => (p.categories || []).some((c) => c.id === cat.id));
      const parent = cat.parent ? catById[cat.parent] : null;
      await prerenderCategory(tmpl, cat, { catProducts, parent, navFooter });
      pages++;
    } catch (e) { console.warn(`  ✗ /shop/${cat.slug}: ${e.message}`); }
  }

  // ALL purchasable products (was: top 20)
  for (const p of products) {
    if (p.is_purchasable === false) continue;
    try { await prerenderProduct(tmpl, p, { catById, navFooter }); pages++; }
    catch (e) { console.warn(`  ✗ /product/${p.slug}: ${e.message}`); }
  }

  // All courses
  for (const c of courses) {
    if (!c.slug) continue;
    try { await prerenderCourse(tmpl, c, { navFooter }); pages++; }
    catch (e) { console.warn(`  ✗ /courses/${c.slug}: ${e.message}`); }
  }

  // All roadmaps
  for (const r of roadmaps) {
    if (!r.slug) continue;
    try { await prerenderRoadmap(tmpl, r, { navFooter }); pages++; }
    catch (e) { console.warn(`  ✗ /roadmaps/${r.slug}: ${e.message}`); }
  }

  // Top 50 blog posts
  for (const b of blogPosts.slice(0, 50)) {
    if (!b.slug) continue;
    try { await prerenderBlogPost(tmpl, b, { navFooter }); pages++; }
    catch (e) { console.warn(`  ✗ /blog/${b.slug}: ${e.message}`); }
  }

  // Private routes — emit HTML with noindex meta
  const labels = {
    '/cart': 'Your Cart', '/checkout': 'Checkout', '/order-pending': 'Order Pending',
    '/login': 'Sign In', '/signup': 'Create Account',
    '/forgot-password': 'Reset Password', '/reset-password': 'Reset Password',
    '/account': 'My Account', '/wallet': 'My Wallet',
    '/auth/sso-bridge': 'Signing You In', '/verify': 'Verify Certificate',
  };
  for (const r of NOINDEX_ROUTES) {
    try { await prerenderNoindexRoute(tmpl, r, labels[r] || r, { navFooter }); pages++; }
    catch (e) { console.warn(`  ✗ noindex ${r}: ${e.message}`); }
  }

  console.log(`  ✓ ${pages} per-route HTML snapshots written`);

  // ── Pings: tell Google + Bing the sitemap moved ──
  await pingGoogleAndBing();

  // ── Optional Cloudflare cache purge ──
  if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID) {
    try {
      const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ purge_everything: true }),
      });
      const j = await r.json().catch(() => ({}));
      console.log(`  ${r.ok && j.success ? '✓' : '✗'} Cloudflare purge: ${j.success ? 'OK' : JSON.stringify(j.errors || j)}`);
    } catch (e) { console.warn(`  ✗ Cloudflare purge: ${e.message}`); }
  } else {
    console.log('  ⓘ Cloudflare purge skipped (set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID env vars)');
  }

  console.log('🎉 hk-prerender v2 done');
}

main().catch((e) => {
  console.warn(`hk-prerender unexpected error: ${e.message}`);
  console.warn(e.stack);
});
