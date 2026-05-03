import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Map, Home, ShoppingBag, GraduationCap, Compass,
  BookOpen, Newspaper, Star, Heart, ShoppingCart, User as UserIcon,
  Shield, Award, Briefcase, Sparkles, Database, Code,
} from 'lucide-react';
import { FEATURED_ARTICLES } from '@/content/featured-articles';

const SITE = 'https://www.hackknow.com';
const WP = 'https://shop.hackknow.com/wp-json/wp/v2';
const HK_API = 'https://www.hackknow.com/wp-json/hackknow/v1';

// ─── Static structure: every page on the site, organized by purpose ─────
type Item = {
  label: string;
  to: string;
  desc: string;        // What it does (one sentence)
  audience?: string;   // Who it's for
  tag?: string;        // Optional pill (NEW, LIVE, FREE, etc.)
};
type Section = {
  id: string;
  title: string;
  blurb: string;
  Icon: typeof Home;
  items: Item[];
};

const SECTIONS: Section[] = [
  {
    id: 'main',
    title: 'Main Pages',
    blurb: 'The pages every visitor uses to navigate the site.',
    Icon: Home,
    items: [
      { label: 'Home',          to: '/',              desc: 'Landing page with featured templates, courses, and category navigation.',                       audience: 'Everyone' },
      { label: 'Shop',          to: '/shop',          desc: 'Browse all 233+ premium templates by category — Excel, PowerPoint, Word, Web, and more.',     audience: 'Buyers' },
      { label: 'Courses',       to: '/courses',       desc: 'Premium video courses — Excel, Python, Power BI, Data Analytics tracks.',                       audience: 'Learners' },
      { label: 'Roadmaps',      to: '/roadmaps',      desc: 'Step-by-step career roadmaps for 12+ tech and analytics roles.',                                audience: 'Career switchers' },
      { label: 'MIS Templates', to: '/mis-templates', desc: 'Curated collection of MIS, dashboard, and reporting templates for Indian SMEs.',                audience: 'MIS executives' },
      { label: 'Blog',          to: '/blog',          desc: 'Long-form guides, tutorials, and industry insights for Indian professionals.',                  audience: 'Readers' },
      { label: 'Hacked News',   to: '/hacked-news',   desc: 'Live tech news aggregator — 60+ RSS sources merged with citation grouping. Auto-refresh.',     audience: 'Tech enthusiasts', tag: 'LIVE' },
      { label: 'Brainxercise',  to: '/brainxercise',  desc: 'Daily logic puzzles and skill exercises for analysts and developers.',                          audience: 'Self-learners' },
      { label: 'About',         to: '/about',         desc: 'The HackKnow story, mission, founding team, and what we stand for.',                            audience: 'Everyone' },
      { label: 'Community',     to: '/community',     desc: 'Join 5,000+ members across WhatsApp, Telegram, and Discord groups.',                            audience: 'Members' },
      { label: 'FAQ',           to: '/faq',           desc: '18 frequently asked questions covering purchases, products, sellers, and technical issues.',    audience: 'Everyone' },
    ],
  },
  {
    id: 'shop-categories',
    title: 'Shop Categories',
    blurb: 'Each category page shows products, ratings, and instant-download badges. URL pattern: /shop/<category>.',
    Icon: ShoppingBag,
    items: [
      { label: 'Excel Templates',          to: '/shop/excel-templates',          desc: 'Dashboards, trackers, calculators — everything Excel.', audience: 'Excel users' },
      { label: 'Excel Accounting',         to: '/shop/excel-accounting',         desc: 'Bookkeeping, invoicing, tax, and finance templates.',   audience: 'Accountants' },
      { label: 'Excel MIS & Dashboards',   to: '/shop/excel-mis',                desc: 'Monthly MIS reports, KPI dashboards, executive views.', audience: 'MIS executives' },
      { label: 'Excel HR & Payroll',       to: '/shop/excel-hr',                 desc: 'Payroll, attendance, leave, attrition templates.',      audience: 'HR teams' },
      { label: 'Excel Sales & CRM',        to: '/shop/excel-sales',              desc: 'Sales pipeline, CRM, lead trackers, commission calc.',  audience: 'Sales teams' },
      { label: 'Excel Inventory',          to: '/shop/excel-inventory',          desc: 'Stock tracking, reorder, warehouse, SKU management.',   audience: 'Trading & D2C' },
      { label: 'Excel Project Management', to: '/shop/excel-project',            desc: 'Gantt charts, project trackers, timelines, status.',    audience: 'Project managers' },
      { label: 'PowerPoint Decks',         to: '/shop/powerpoint-decks',         desc: 'Pitch decks, investor updates, sales decks, all-hands.',audience: 'Founders & teams' },
      { label: 'Word Templates',           to: '/shop/word-templates',           desc: 'Resumes, contracts, proposals, letterheads.',           audience: 'Professionals' },
      { label: 'Website Templates',        to: '/shop/website-templates',        desc: 'Landing pages, portfolio sites, business templates.',   audience: 'Creators' },
      { label: 'Custom Dashboards',        to: '/shop/custom-dashboards',        desc: 'High-end interactive dashboards for specific industries.',audience: 'Premium buyers' },
      { label: 'Premium Bundles',          to: '/shop/premium',                  desc: 'Multi-template bundles at discounted pricing.',         audience: 'Power users', tag: 'BUNDLE' },
      { label: 'Free Resources',           to: '/shop/free-resources',           desc: '100+ free templates and starter files. No login required.', audience: 'Everyone',     tag: 'FREE' },
    ],
  },
  {
    id: 'account',
    title: 'Account & Purchasing',
    blurb: 'Everything related to logging in, buying, and managing your downloads. Razorpay handles all payments — UPI, cards, netbanking, wallets.',
    Icon: UserIcon,
    items: [
      { label: 'Login',            to: '/login',            desc: 'Sign in with email and password.',                                          audience: 'Existing users' },
      { label: 'Sign Up',          to: '/signup',           desc: 'Create a free HackKnow account in 30 seconds.',                             audience: 'New users' },
      { label: 'Forgot Password',  to: '/forgot-password',  desc: 'Reset your password via email.',                                            audience: 'Existing users' },
      { label: 'Cart',             to: '/cart',             desc: 'Review the items you have selected before checkout.',                       audience: 'Buyers' },
      { label: 'Checkout',         to: '/checkout',         desc: 'Razorpay-powered secure payment. UPI, cards, netbanking, EMI, wallets.',    audience: 'Buyers',           tag: 'SECURE' },
      { label: 'My Account',       to: '/account',          desc: 'Order history, downloads, subscriptions, profile settings.',                audience: 'Customers' },
      { label: 'Wallet',           to: '/wallet',           desc: 'HackKnow credits balance and transaction history.',                          audience: 'Customers' },
    ],
  },
  {
    id: 'engage',
    title: 'Engage & Get Help',
    blurb: 'Talk to us, join the community, or get involved.',
    Icon: Heart,
    items: [
      { label: 'Support',           to: '/support',           desc: 'Help centre — guides, troubleshooting, contact form.',                  audience: 'Customers' },
      { label: 'Contact',           to: '/contact',           desc: 'Phone, email, and message form. Response within 24 hours.',             audience: 'Everyone' },
      { label: 'Affiliate Program', to: '/affiliate',         desc: 'Earn 30-50% commission referring new customers. Free to join.',          audience: 'Marketers', tag: 'EARN' },
      { label: 'Sponsor a Cause',   to: '/sponsor',           desc: 'Sponsor a learner or contribute to free education for underprivileged students.', audience: 'Sponsors', tag: 'GIVE' },
      { label: 'Become a Vendor',   to: '/become-a-vendor',   desc: 'Sell your own digital templates on HackKnow. 70% revenue share.',         audience: 'Creators',  tag: 'SELL' },
      { label: 'Verify Certificate',to: '/verify',            desc: 'Verify a HackKnow course completion certificate.',                       audience: 'Recruiters', tag: 'TRUST' },
      { label: 'Testimonials',      to: '/testimonials',      desc: 'Real reviews and success stories from 10,000+ customers.',               audience: 'Researchers' },
    ],
  },
  {
    id: 'legal',
    title: 'Trust, Legal & Policies',
    blurb: 'Transparent policies. We are PCI-DSS-compliant via Razorpay; we never store payment details on our servers.',
    Icon: Shield,
    items: [
      { label: 'Privacy Policy', to: '/privacy',        desc: 'How we collect, use, and protect your personal data. GDPR-aligned.',  audience: 'Everyone' },
      { label: 'Refund Policy',  to: '/refund-policy',  desc: '7-day refund window for materially defective templates.',              audience: 'Buyers' },
      { label: 'Terms of Use',   to: '/terms',          desc: 'Standard terms governing your use of HackKnow.',                       audience: 'Everyone' },
      { label: 'DMCA',           to: '/dmca',           desc: 'Copyright takedown procedure for content owners.',                     audience: 'Content owners' },
    ],
  },
];

// ─── Featured articles (statically known) ──────────────────────────────
const FEATURED_BLOG_ITEMS: Item[] = FEATURED_ARTICLES.map(a => ({
  label: a.title,
  to: `/blog/${a.slug}`,
  desc: a.excerpt,
  audience: a.category,
  tag: 'NEW',
}));

// ─── How major features work (for the user to understand the site) ────
type Feature = {
  title: string;
  Icon: typeof Sparkles;
  bullets: string[];
};
const FEATURES: Feature[] = [
  {
    title: 'How a purchase works',
    Icon: ShoppingCart,
    bullets: [
      'Browse Shop or any category page; click any product card.',
      'On the product page, click "Add to Cart" or "Buy Now".',
      'Cart drawer opens. Click "Checkout" to proceed.',
      'Razorpay popup loads. Pay with UPI, card, netbanking, EMI, or wallet.',
      'On success, you are redirected to a thank-you page with a download button.',
      'The same download is also added to your account under "My Downloads" — accessible forever.',
    ],
  },
  {
    title: 'Yahavi AI assistant',
    Icon: Sparkles,
    bullets: [
      'Chat bubble at the bottom-right of every page.',
      'Ask questions about products, courses, your account, or anything HackKnow-related.',
      'Replies in English. Trained on HackKnow catalogue + knowledge base.',
      'History is saved per user; sanitiser filters non-English replies.',
    ],
  },
  {
    title: 'Hacked News (live tech news)',
    Icon: Newspaper,
    bullets: [
      'Aggregates 60+ RSS feeds — Indian and global tech sources.',
      'Three-tier proxy ladder (codetabs / allorigins / rss2json) for reliability.',
      'Auto-refresh every 5 minutes when the tab is visible.',
      'Citation grouping: same story from multiple sources collapses to a single card with up to 6 source chips.',
      'URL sanitiser blocks any javascript: or vbscript: links from feeds (security hardened).',
    ],
  },
  {
    title: 'Courses & Roadmaps',
    Icon: GraduationCap,
    bullets: [
      'Courses: chapter-by-chapter video lessons with downloads, quizzes, and certificates.',
      'Roadmaps: opinionated step-by-step learning paths for 12+ tech roles.',
      'Each roadmap links to recommended courses and templates inside HackKnow.',
      'Progress is saved per user; certificates are verifiable at /verify.',
    ],
  },
  {
    title: 'Affiliate program',
    Icon: Award,
    bullets: [
      'Sign up free at /affiliate. Get a personal referral link in seconds.',
      'Earn 30% commission on first orders, 10% recurring on subscriptions.',
      'Real-time dashboard: clicks, conversions, payouts.',
      'Monthly payout via UPI / bank transfer (₹500 minimum).',
    ],
  },
  {
    title: 'Sell on HackKnow (vendor)',
    Icon: Briefcase,
    bullets: [
      'Apply at /become-a-vendor with samples of your templates.',
      'Approval typically within 5 working days.',
      '70% revenue share to the creator. Zero listing fees.',
      'HackKnow handles payments, hosting, downloads, support, and refunds.',
    ],
  },
];

// ─── Live data: pull current course/roadmap titles + recent WP posts ──
type ApiItem = { slug: string; title?: string; name?: string };

function useApi<T>(url: string): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive) { setData(j); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [url]);
  return { data, loading };
}

const SitemapPage = () => {
  const { data: courses } = useApi<ApiItem[]>(`${HK_API}/courses`);
  const { data: roadmaps } = useApi<ApiItem[]>(`${HK_API}/roadmaps`);
  const { data: wpPosts } = useApi<{ slug: string; title: { rendered: string } }[]>(
    `${WP}/posts?per_page=20&_fields=id,slug,title`,
  );

  // ─── Build flat list of all URLs for ItemList JSON-LD ───
  const allUrls = useMemo(() => {
    const urls: string[] = [];
    SECTIONS.forEach((s) => s.items.forEach((i) => urls.push(SITE + i.to)));
    FEATURED_BLOG_ITEMS.forEach((i) => urls.push(SITE + i.to));
    (courses || []).forEach((c) => urls.push(`${SITE}/courses/${c.slug}`));
    (roadmaps || []).forEach((r) => urls.push(`${SITE}/roadmaps/${r.slug}`));
    (wpPosts || []).forEach((p) => urls.push(`${SITE}/blog/${p.slug}`));
    return Array.from(new Set(urls));
  }, [courses, roadmaps, wpPosts]);

  // ─── Inject ItemList JSON-LD for crawlers ───
  useEffect(() => {
    const id = 'hk-sitemap-ld';
    const json = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'HackKnow Sitemap',
      url: `${SITE}/sitemap`,
      description: 'Complete map of every page, category, course, roadmap, and feature on HackKnow.',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: allUrls.length,
        itemListElement: allUrls.slice(0, 100).map((url, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url,
        })),
      },
    };
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(json);
    return () => { const e = document.getElementById(id); if (e) e.remove(); };
  }, [allUrls]);

  // Set page title
  useEffect(() => {
    try { document.title = 'Sitemap — Every Page, Category, and Feature on HackKnow'; } catch { /* ignore */ }
  }, []);

  return (
    <div className="min-h-screen bg-hack-white">
      {/* Header */}
      <div className="bg-hack-black text-hack-white py-16 lg:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange transition-colors mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-hack-yellow/20 flex items-center justify-center">
              <Map className="w-6 h-6 text-hack-yellow" />
            </div>
            <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl">Sitemap</h1>
          </div>
          <p className="text-hack-white/70 text-base sm:text-lg max-w-3xl leading-relaxed">
            Every page, category, course, roadmap, and feature on HackKnow — in one place.
            Use this as a map of the site, or as a launchpad to find anything fast.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs text-hack-white/50">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">{SECTIONS.reduce((n, s) => n + s.items.length, 0)} core pages</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">{(courses?.length || 0)} courses</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">{(roadmaps?.length || 0)} roadmaps</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">{FEATURED_BLOG_ITEMS.length + (wpPosts?.length || 0)} blog articles</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">{FEATURES.length} core features</span>
          </div>
        </div>
      </div>

      {/* In-page TOC */}
      <div className="border-b border-hack-black/5 bg-white sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap gap-2">
          {[
            ...SECTIONS.map(s => ({ id: s.id, title: s.title })),
            { id: 'features', title: 'How it Works' },
            { id: 'blog-featured', title: 'Featured Articles' },
            { id: 'courses', title: 'All Courses' },
            { id: 'roadmaps', title: 'All Roadmaps' },
            { id: 'recent-blog', title: 'Recent Posts' },
          ].map(t => (
            <a key={t.id} href={`#${t.id}`}
               className="px-3 py-1.5 text-xs font-semibold rounded-full bg-hack-black/5 hover:bg-hack-yellow hover:text-hack-black text-hack-black/70 transition-colors">
              {t.title}
            </a>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">

        {SECTIONS.map((sec) => (
          <section key={sec.id} id={sec.id}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-hack-yellow/15 flex items-center justify-center">
                <sec.Icon className="w-5 h-5 text-hack-black" />
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl">{sec.title}</h2>
            </div>
            <p className="text-hack-black/60 mb-6 max-w-3xl">{sec.blurb}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sec.items.map((it) => (
                <Link key={it.to} to={it.to}
                      className="group block p-4 rounded-2xl bg-white border border-hack-black/5 hover:border-hack-yellow hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-display font-bold text-base text-hack-black group-hover:text-hack-magenta transition-colors">
                      {it.label}
                    </h3>
                    {it.tag && (
                      <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full bg-hack-yellow text-hack-black">
                        {it.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-hack-black/60 leading-relaxed mb-2">{it.desc}</p>
                  <div className="flex items-center justify-between text-[11px] text-hack-black/40">
                    <span className="font-mono">{it.to}</span>
                    {it.audience && <span className="italic">{it.audience}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* How major features work */}
        <section id="features">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-hack-yellow/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-hack-black" />
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl">How it Works</h2>
          </div>
          <p className="text-hack-black/60 mb-6 max-w-3xl">
            A quick overview of how the major features on HackKnow actually work — useful both for new visitors and as your own reference.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-5 rounded-2xl bg-white border border-hack-black/5">
                <div className="flex items-center gap-2 mb-3">
                  <f.Icon className="w-5 h-5 text-hack-magenta" />
                  <h3 className="font-display font-bold text-lg">{f.title}</h3>
                </div>
                <ol className="space-y-2 text-sm text-hack-black/70 list-decimal list-inside">
                  {f.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* Featured blog articles */}
        <section id="blog-featured">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-hack-yellow/15 flex items-center justify-center">
              <Star className="w-5 h-5 text-hack-black" />
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl">Featured Articles</h2>
          </div>
          <p className="text-hack-black/60 mb-6 max-w-3xl">
            Long-form, India-first guides written by the HackKnow team. Each article is 1,200-1,800 words with FAQs.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURED_BLOG_ITEMS.map((it) => (
              <Link key={it.to} to={it.to}
                    className="group block p-4 rounded-2xl bg-white border border-hack-black/5 hover:border-hack-yellow hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="font-display font-bold text-base group-hover:text-hack-magenta transition-colors">{it.label}</h3>
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full bg-hack-yellow text-hack-black">{it.tag}</span>
                </div>
                <p className="text-xs text-hack-black/60 mb-2 line-clamp-2">{it.desc}</p>
                <div className="flex items-center justify-between text-[11px] text-hack-black/40">
                  <span className="font-mono truncate">{it.to}</span>
                  <span className="italic shrink-0 ml-2">{it.audience}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* All courses (live) */}
        <section id="courses">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-hack-yellow/15 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-hack-black" />
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl">All Courses</h2>
            {courses && <span className="ml-2 text-sm text-hack-black/50">({courses.length})</span>}
          </div>
          <p className="text-hack-black/60 mb-6 max-w-3xl">Live list pulled from the HackKnow course catalogue. Click any course for chapters, pricing, and reviews.</p>
          {courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {courses.map((c) => (
                <Link key={c.slug} to={`/courses/${c.slug}`}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-white border border-hack-black/5 hover:border-hack-yellow transition-colors">
                  <Code className="w-4 h-4 text-hack-magenta shrink-0" />
                  <span className="text-sm font-semibold text-hack-black/80 group-hover:text-hack-magenta truncate">
                    {c.title || c.name || c.slug}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-sm text-hack-black/50">Loading courses…</div>
          )}
        </section>

        {/* All roadmaps (live) */}
        <section id="roadmaps">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-hack-yellow/15 flex items-center justify-center">
              <Compass className="w-5 h-5 text-hack-black" />
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl">All Roadmaps</h2>
            {roadmaps && <span className="ml-2 text-sm text-hack-black/50">({roadmaps.length})</span>}
          </div>
          <p className="text-hack-black/60 mb-6 max-w-3xl">Step-by-step career paths. Each roadmap shows skills, milestones, and recommended HackKnow courses.</p>
          {roadmaps && roadmaps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {roadmaps.map((r) => (
                <Link key={r.slug} to={`/roadmaps/${r.slug}`}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-white border border-hack-black/5 hover:border-hack-yellow transition-colors">
                  <Compass className="w-4 h-4 text-hack-magenta shrink-0" />
                  <span className="text-sm font-semibold text-hack-black/80 group-hover:text-hack-magenta truncate">
                    {r.title || r.name || r.slug}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-sm text-hack-black/50">Loading roadmaps…</div>
          )}
        </section>

        {/* Recent WP blog posts (live) */}
        <section id="recent-blog">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-hack-yellow/15 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-hack-black" />
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl">Recent Blog Posts</h2>
            {wpPosts && <span className="ml-2 text-sm text-hack-black/50">({wpPosts.length})</span>}
          </div>
          <p className="text-hack-black/60 mb-6 max-w-3xl">Latest posts from the blog. The full archive is at <Link to="/blog" className="text-hack-magenta font-semibold hover:underline">/blog</Link>.</p>
          {wpPosts && wpPosts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {wpPosts.map((p) => (
                <Link key={p.slug} to={`/blog/${p.slug}`}
                      className="group flex items-start gap-3 p-3 rounded-xl bg-white border border-hack-black/5 hover:border-hack-yellow transition-colors">
                  <BookOpen className="w-4 h-4 text-hack-magenta shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-hack-black/80 group-hover:text-hack-magenta line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: p.title.rendered }} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-sm text-hack-black/50">Loading recent posts…</div>
          )}
        </section>

        {/* XML sitemap pointer for crawlers + power users */}
        <section className="p-6 rounded-2xl bg-gradient-to-br from-hack-yellow/15 to-hack-magenta/5 border border-hack-yellow/30">
          <div className="flex items-start gap-3">
            <Database className="w-6 h-6 text-hack-magenta shrink-0 mt-1" />
            <div>
              <h2 className="font-display font-bold text-xl mb-2">Looking for the XML sitemap?</h2>
              <p className="text-sm text-hack-black/70 mb-3">
                The machine-readable sitemap for search engines lives at{' '}
                <a href="/sitemap.xml" className="text-hack-magenta font-semibold hover:underline">/sitemap.xml</a>.
                It contains every URL on the site (currently 380+) with last-modified dates and priorities.
              </p>
              <p className="text-xs text-hack-black/50">
                Search engine operators can also reference our <a href="/robots.txt" className="text-hack-magenta hover:underline">robots.txt</a> and we follow standard crawling conventions.
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default SitemapPage;
