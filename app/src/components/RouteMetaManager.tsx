import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Per-route SEO manager:
 *   • <title>
 *   • <meta name="description">
 *   • <link rel="canonical">
 *   • <meta property="og:url|og:title|og:description">
 *   • <meta name="twitter:title|twitter:description">
 *   • <script type="application/ld+json" data-rmm="breadcrumb"> (BreadcrumbList)
 *
 * Mounted once inside <Router>. Listens to pathname changes.
 * Real product/course pages may overwrite document.title later — that's fine,
 * the OG/canonical tags are already correct (URL-based).
 *
 * Note: NotFoundPage manages its own robots=noindex via a separate effect
 * with cleanup on unmount, so this manager does NOT touch the robots tag.
 */

const SITE = 'https://www.hackknow.com';
const DEFAULT_OG_IMAGE = `${SITE}/og-image.jpg`;
const DEFAULT_DESC =
  'Buy & download premium Excel dashboards, PowerPoint templates, marketing kits, and digital products. 233+ templates across 28 categories. Trusted by 10,000+ Indian professionals.';

type Meta = { title: string; description?: string };

const STATIC_META: Record<string, Meta> = {
  '/':              { title: 'HackKnow — Premium Excel Templates, MIS Dashboards & Digital Products | India',
                      description: DEFAULT_DESC },
  '/shop':          { title: 'Shop — All Digital Templates & Tools · HackKnow',
                      description: 'Browse 233+ premium digital products: Excel dashboards, PowerPoint decks, website templates, courses, marketing kits, and more. Instant download.' },
  '/cart':          { title: 'Your Cart · HackKnow' },
  '/checkout':      { title: 'Checkout — Secure Razorpay Payment · HackKnow' },
  '/order-pending': { title: 'Order Pending · HackKnow' },
  '/about':         { title: 'About HackKnow — India\'s Digital Marketplace for Creators',
                      description: 'HackKnow is India\'s premium marketplace for digital templates, courses, and tools. Made in India. Built for the world.' },
  '/community':     { title: 'Community · HackKnow' },
  '/support':       { title: 'Support — Help Center · HackKnow' },
  '/contact':       { title: 'Contact HackKnow — Get in Touch',
                      description: 'Reach the HackKnow team for product support, vendor partnership, sponsorship, or any questions about our digital marketplace.' },
  '/affiliate':     { title: 'Affiliate Program · HackKnow — Earn 30% Per Sale',
                      description: 'Join the HackKnow affiliate program. Earn 30% commission on every sale. Lifetime cookie. Monthly payouts via UPI / bank transfer.' },
  '/affiliate/learn-more': { title: 'Affiliate Program · HackKnow — Earn 30% Per Sale',
                      description: 'Join the HackKnow affiliate program. Earn 30% commission on every sale. Lifetime cookie. Monthly payouts via UPI / bank transfer.' },
  '/blog':          { title: 'Blog — Tutorials, Insights & Updates · HackKnow',
                      description: 'Read the HackKnow blog for tutorials on Excel, PowerPoint, MIS reporting, productivity, and digital business.' },
  '/faq':           { title: 'Frequently Asked Questions · HackKnow' },
  '/privacy':       { title: 'Privacy Policy · HackKnow' },
  '/refund-policy': { title: 'Refund Policy · HackKnow — 7-Day Money Back' },
  '/terms':         { title: 'Terms & Conditions · HackKnow' },
  '/signup':        { title: 'Create your free HackKnow account',
                      description: 'Sign up free to access 100+ free digital templates, save your favourites, track downloads, and get member-only deals.' },
  '/login':         { title: 'Sign in to HackKnow' },
  '/forgot-password': { title: 'Reset your password · HackKnow' },
  '/reset-password':  { title: 'Reset your password · HackKnow' },
  '/account':       { title: 'My Account · HackKnow' },
  '/mis-templates': { title: 'MIS Templates — Excel Dashboards & Reports · HackKnow',
                      description: 'Premium MIS reporting templates: sales dashboards, HR analytics, finance reports, inventory tracking. Pre-built Excel + Power BI files.' },
  '/courses':       { title: 'Premium Courses — Excel, MIS, Career Skills · HackKnow',
                      description: 'Self-paced premium courses on Excel mastery, MIS reporting, dashboards, business analytics, and career-ready skills. Lifetime access.' },
  '/roadmaps':      { title: 'Career Roadmaps — Step-by-Step Skill Paths · HackKnow',
                      description: 'Curated career roadmaps: Python developer, data analyst, MIS executive, full-stack developer, and more. Free, structured learning.' },
  '/hacked-news':   { title: 'Hacked News — Live Cybersecurity & Tech News · HackKnow',
                      description: 'Live aggregated news from 60+ trusted security and tech sources. Auto-refreshing every 5 minutes. Multi-source citations on every story.' },
  '/verify':        { title: 'Verify Certificate · HackKnow' },
  '/brainxercise':  { title: 'Brainxercise — Daily Brain Training · HackKnow' },
  '/sponsor':       { title: 'Sponsor HackKnow — Reach 10,000+ Indian Professionals',
                      description: 'Sponsor a category, course, or featured slot on HackKnow. Targeted reach to Indian professionals in MIS, finance, HR, marketing.' },
  '/become-a-vendor': { title: 'Become a Vendor — Sell on HackKnow',
                      description: 'List your digital templates, courses, or tools on HackKnow. Reach 10,000+ buyers. 70% revenue share. No upfront cost.' },
  '/testimonials':  { title: 'What Our Customers Say · HackKnow' },
  '/wallet':        { title: 'Wallet · HackKnow' },
};

const DYNAMIC: { match: RegExp; build: (m: RegExpMatchArray) => Meta }[] = [
  { match: /^\/shop\/(.+)$/,             build: m => ({ title: `${prettify(m[1])} — Templates · HackKnow Shop`,
                                                        description: `Browse premium ${prettify(m[1]).toLowerCase()} on HackKnow. Instant download. Lifetime use license. Trusted by 10,000+ Indian professionals.` }) },
  { match: /^\/product\/(.+)$/,          build: m => ({ title: `${prettify(m[1])} · HackKnow`,
                                                        description: `${prettify(m[1])} — premium digital download from HackKnow. Instant access, lifetime license, secure Razorpay payment.` }) },
  { match: /^\/courses\/cat\/(.+)$/,    build: m => ({ title: `${prettify(m[1])} Courses · HackKnow`,
                                                        description: `Premium ${prettify(m[1]).toLowerCase()} courses on HackKnow. Self-paced. Lifetime access. Certificate on completion.` }) },
  { match: /^\/courses\/(.+)$/,          build: m => ({ title: `${prettify(m[1])} Course · HackKnow`,
                                                        description: `Master ${prettify(m[1]).toLowerCase()} with this premium HackKnow course. Self-paced video lessons, lifetime access, downloadable resources.` }) },
  { match: /^\/blog\/(.+)$/,             build: m => ({ title: `${prettify(m[1])} · HackKnow Blog`,
                                                        description: `${prettify(m[1])} — tutorials and insights on the HackKnow blog.` }) },
  { match: /^\/roadmaps\/(.+)$/,         build: m => ({ title: `${prettify(m[1])} Roadmap · HackKnow`,
                                                        description: `Step-by-step ${prettify(m[1]).toLowerCase()} career roadmap with curated learning resources, projects, and milestones.` }) },
  { match: /^\/brainxercise\/(.+)$/,     build: m => ({ title: `${prettify(m[1])} · Brainxercise · HackKnow` }) },
  { match: /^\/account\/(.+)$/,          build: m => ({ title: `${prettify(m[1])} · My Account · HackKnow` }) },
];

function prettify(slug: string): string {
  return decodeURIComponent(slug.split('/')[0] || slug)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function upsertMeta(selector: string, attr: string, attrVal: string, content: string) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertBreadcrumbLD(pathname: string) {
  const id = 'rmm-breadcrumb-ld';
  let el = document.getElementById(id) as HTMLScriptElement | null;
  // Build crumbs from pathname segments
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) {
    if (el) el.remove();
    return;
  }
  const items = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
    ...segs.map((seg, i) => ({
      '@type': 'ListItem',
      position: i + 2,
      name: prettify(seg),
      item: SITE + '/' + segs.slice(0, i + 1).join('/'),
    })),
  ];
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(json);
}

export default function RouteMetaManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    let meta: Meta | null = STATIC_META[pathname] ?? null;
    if (!meta) {
      for (const d of DYNAMIC) {
        const m = pathname.match(d.match);
        if (m) { meta = d.build(m); break; }
      }
    }
    const title = meta?.title ?? 'HackKnow — Premium Digital Products';
    const description = meta?.description ?? DEFAULT_DESC;
    const canonical = SITE + pathname;

    document.title = title;
    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertCanonical(canonical);

    // Open Graph
    upsertMeta('meta[property="og:url"]',         'property', 'og:url',         canonical);
    upsertMeta('meta[property="og:title"]',       'property', 'og:title',       title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:image"]',       'property', 'og:image',       DEFAULT_OG_IMAGE);

    // Twitter
    upsertMeta('meta[name="twitter:title"]',       'name', 'twitter:title',       title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    upsertMeta('meta[name="twitter:image"]',       'name', 'twitter:image',       DEFAULT_OG_IMAGE);

    // BreadcrumbList JSON-LD
    upsertBreadcrumbLD(pathname);
  }, [pathname]);
  return null;
}
