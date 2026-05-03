import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Per-route <title> + meta description manager.
 *
 * Mounted once inside <Router>. Listens to pathname changes and updates
 * document.title + meta[name=description] without each page needing to know.
 *
 * For dynamic routes (/product/:slug, /shop/:category, etc.) we prettify the
 * slug into a human-readable Title Case phrase. Real product titles set later
 * by the page itself (via document.title = ...) will override this — that's
 * intentional.
 */

type Meta = { title: string; description?: string };

const STATIC_META: Record<string, Meta> = {
  '/':              { title: 'HackKnow — Premium Excel Templates, MIS Dashboards & Digital Products | India',
                      description: 'Buy & download premium Excel dashboards, PowerPoint templates, marketing kits, and digital products. 233+ templates across 28 categories. Trusted by 10,000+ Indian professionals.' },
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
  '/affiliate/learn-more': { title: 'Affiliate Program · HackKnow — Earn 30% Per Sale' },
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
  { match: /^\/shop\/(.+)$/,             build: m => ({ title: `${prettify(m[1])} — Templates · HackKnow Shop` }) },
  { match: /^\/product\/(.+)$/,          build: m => ({ title: `${prettify(m[1])} · HackKnow` }) },
  { match: /^\/courses\/cat\/(.+)$/,    build: m => ({ title: `${prettify(m[1])} Courses · HackKnow` }) },
  { match: /^\/courses\/(.+)$/,          build: m => ({ title: `${prettify(m[1])} Course · HackKnow` }) },
  { match: /^\/blog\/(.+)$/,             build: m => ({ title: `${prettify(m[1])} · HackKnow Blog` }) },
  { match: /^\/roadmaps\/(.+)$/,         build: m => ({ title: `${prettify(m[1])} Roadmap · HackKnow` }) },
  { match: /^\/brainxercise\/(.+)$/,     build: m => ({ title: `${prettify(m[1])} · Brainxercise · HackKnow` }) },
  { match: /^\/account\/(.+)$/,          build: m => ({ title: `${prettify(m[1])} · My Account · HackKnow` }) },
];

function prettify(slug: string): string {
  return decodeURIComponent(slug.split('/')[0] || slug)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function setMetaDescription(content: string) {
  let el = document.querySelector('meta[name="description"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'description');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
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
    if (meta?.title) document.title = meta.title;
    if (meta?.description) setMetaDescription(meta.description);
  }, [pathname]);
  return null;
}
