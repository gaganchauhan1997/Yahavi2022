import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, Tag, Star, ChevronRight, Users, Zap,
  Download, Sparkles, X, ListOrdered, Flame, ShieldCheck, TrendingUp,
} from 'lucide-react';
import { getFeaturedArticle, FEATURED_ARTICLES, type FeaturedArticle } from '@/content/featured-articles';

const WP = 'https://shop.hackknow.com/wp-json/wp/v2';
const SITE = 'https://www.hackknow.com';

type WpPost = {
  id: number;
  slug: string;
  date: string;
  modified: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  featured_media: number;
  categories: number[];
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url?: string; alt_text?: string; media_details?: { sizes?: Record<string, { source_url: string }> } }>;
    'wp:term'?: Array<Array<{ id: number; name: string; slug: string }>>;
  };
};

type RenderedPost = {
  source: 'wp' | 'featured';
  title: string;
  contentHtml: string;
  excerpt: string;
  category: string;
  date: string;
  modified?: string;
  hero: { src: string; alt: string };
  heroGradient?: string;
  featured?: FeaturedArticle;
};

// ─── Tiny utils (preserved from prior version) ─────────────────────────────
function decodeHtml(s: string): string {
  if (typeof window === 'undefined') return s;
  const t = document.createElement('textarea');
  t.innerHTML = s;
  return t.value;
}
function stripHtml(s: string): string {
  return decodeHtml(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}
function readTime(html: string): string {
  const words = stripHtml(html).split(/\s+/).length;
  return Math.max(2, Math.round(words / 220)) + ' min read';
}
function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return iso.slice(0, 10); }
}
function pickHero(p: WpPost): { src: string; alt: string } {
  const m = p._embedded?.['wp:featuredmedia']?.[0];
  if (!m) return { src: '', alt: '' };
  const sizes = m.media_details?.sizes || {};
  const src = sizes['1536x1536']?.source_url || sizes['large']?.source_url || m.source_url || '';
  return { src, alt: m.alt_text || '' };
}

// ─── Schema injectors (preserved verbatim) ─────────────────────────────────
function injectArticleSchema(slug: string, post: RenderedPost) {
  const id = 'hk-article-ld';
  const json: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': post.featured ? 'Article' : 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.modified || post.date,
    inLanguage: 'en-IN',
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/blog/${slug}` },
    author: { '@type': 'Organization', name: 'HackKnow' },
    publisher: {
      '@type': 'Organization',
      name: 'HackKnow',
      logo: { '@type': 'ImageObject', url: `${SITE}/icon-512.png` },
    },
    image: post.hero.src || `${SITE}/og-image.jpg`,
    articleSection: post.category,
  };
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(json);
}
function injectFaqSchema(faq: { q: string; a: string }[]) {
  const id = 'hk-article-faq-ld';
  const json = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(json);
}
function removeSchema(id: string) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ─── NEW: Notion-style content transformations ────────────────────────────

function slugifyHeading(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'section';
}

/**
 * Parse the article HTML once: assign IDs to H2s for the TOC,
 * and lightly classify segments between <hr/> for CTA insertion.
 */
function buildTocAndAddIds(html: string): { html: string; toc: { id: string; text: string }[] } {
  const toc: { id: string; text: string }[] = [];
  const used = new Set<string>();
  const out = html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (_m, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    let id = slugifyHeading(text);
    let n = 2;
    while (used.has(id)) id = slugifyHeading(text) + '-' + n++;
    used.add(id);
    toc.push({ id, text });
    return `<h2 id="${id}"${attrs || ''}>${inner}</h2>`;
  });
  return { html: out, toc };
}

/** Split content on <hr/> for CTA card insertion every N segments */
function splitOnHr(html: string): string[] {
  return html.split(/<hr\s*\/?>(?:\s*\n)?/i).map(s => s.trim()).filter(Boolean);
}

const CTA_VARIANTS = [
  {
    eyebrow: '🔥 Save 10–20 hours every week',
    title: 'Stop building from scratch.',
    body: 'Ready-made Excel dashboards, MIS reports, and planners — used by 10,000+ Indian SMEs.',
    label: 'Browse Templates',
    href: '/shop/excel-templates',
    bg: 'linear-gradient(135deg, #FFD60A 0%, #FF7700 100%)',
    fg: '#0B0B0F',
    btnBg: '#0B0B0F',
    btnFg: '#FFD60A',
  },
  {
    eyebrow: '⚡ Free productivity starter pack',
    title: 'Try the system before you buy.',
    body: 'Five free templates — weekly planner, daily Top 3, KPI dashboard preview, and more. No signup.',
    label: 'Get Free Pack',
    href: '/shop/free-resources',
    bg: 'linear-gradient(135deg, #00D4FF 0%, #7C3AED 100%)',
    fg: '#FFFFFF',
    btnBg: '#FFFFFF',
    btnFg: '#0B0B0F',
  },
  {
    eyebrow: '💎 Founder bundle',
    title: 'Built for serious operators.',
    body: 'KPI dashboard + cash-flow forecaster + weekly planner. Save 30% vs buying separately.',
    label: 'View Premium',
    href: '/shop/premium',
    bg: 'linear-gradient(135deg, #FF006E 0%, #FB5607 100%)',
    fg: '#FFFFFF',
    btnBg: '#FFFFFF',
    btnFg: '#FF006E',
  },
  {
    eyebrow: '🚀 Become a vendor',
    title: 'Sell your own templates.',
    body: 'Keep 70% revenue. Buyer traffic already there. Zero infrastructure setup.',
    label: 'Apply Now',
    href: '/become-a-vendor',
    bg: 'linear-gradient(135deg, #06FFA5 0%, #00D4FF 100%)',
    fg: '#0B0B0F',
    btnBg: '#0B0B0F',
    btnFg: '#06FFA5',
  },
];

/** Find up to 3 related featured articles in the same category, then fall back to other featured */
function relatedFeatured(currentSlug: string, category: string): FeaturedArticle[] {
  const all = FEATURED_ARTICLES.filter(a => a.slug !== currentSlug);
  const sameCat = all.filter(a => a.category === category);
  const others = all.filter(a => a.category !== category);
  return [...sameCat, ...others].slice(0, 3);
}

// ─── Component ─────────────────────────────────────────────────────────────
const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<RenderedPost | null>(null);
  const [related, setRelated] = useState<WpPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [stickyDismissed, setStickyDismissed] = useState(false);
  const [activeToc, setActiveToc] = useState<string>('');
  const articleRef = useRef<HTMLElement | null>(null);

  // ─── Data load (preserved logic) ─────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    setError(null);
    setRelated([]);
    setStickyDismissed(false);

    const fa = getFeaturedArticle(slug);
    if (fa) {
      const rendered: RenderedPost = {
        source: 'featured',
        title: fa.title,
        contentHtml: fa.contentHtml,
        excerpt: fa.excerpt,
        category: fa.category,
        date: fa.publishDate,
        modified: fa.modifiedDate || fa.publishDate,
        hero: { src: '', alt: fa.title },
        heroGradient: fa.gradient,
        featured: fa,
      };
      setPost(rendered);
      setLoading(false);
      try { document.title = fa.title + ' | HackKnow Blog'; } catch { /* ignore */ }
      try { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); } catch { window.scrollTo(0, 0); }
      injectArticleSchema(slug, rendered);
      if (fa.faq && fa.faq.length) injectFaqSchema(fa.faq);
      return () => {
        removeSchema('hk-article-ld');
        removeSchema('hk-article-faq-ld');
      };
    }

    let alive = true;
    setLoading(true);
    setPost(null);
    const ctrl = new AbortController();
    const url = `${WP}/posts?slug=${encodeURIComponent(slug)}&_embed=wp:featuredmedia,wp:term`;
    fetch(url, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json() as Promise<WpPost[]>;
      })
      .then(async (arr) => {
        if (!alive) return;
        if (!arr || arr.length === 0) { setError('Article not found'); return; }
        const p = arr[0];
        const rendered: RenderedPost = {
          source: 'wp',
          title: decodeHtml(stripHtml(p.title.rendered)),
          contentHtml: p.content.rendered,
          excerpt: decodeHtml(stripHtml(p.excerpt.rendered)),
          category: p._embedded?.['wp:term']?.[0]?.[0]?.name || 'Blog',
          date: p.date,
          modified: p.modified,
          hero: pickHero(p),
        };
        setPost(rendered);
        injectArticleSchema(slug, rendered);
        const cat = p.categories?.[0];
        if (cat) {
          try {
            const rr = await fetch(`${WP}/posts?per_page=4&exclude=${p.id}&categories=${cat}&_embed=wp:featuredmedia&_fields=id,slug,title,date,_links,_embedded`, { signal: ctrl.signal });
            if (rr.ok && alive) setRelated(await rr.json());
          } catch { /* ignore */ }
        }
        try { document.title = rendered.title + ' | HackKnow Blog'; } catch { /* ignore */ }
        try { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); } catch { window.scrollTo(0, 0); }
      })
      .catch((e) => { if (alive && e.name !== 'AbortError') setError(e.message || 'Failed to load'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => {
      alive = false;
      ctrl.abort();
      removeSchema('hk-article-ld');
      removeSchema('hk-article-faq-ld');
    };
  }, [slug]);

  // ─── Reading progress bar + sticky CTA reveal ────────────────────────
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        const pct = max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0;
        setProgress(pct);
        setShowStickyCta(pct > 25 && pct < 92);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [post]);

  // ─── Active TOC item via IntersectionObserver ────────────────────────
  const { html: htmlWithIds, toc } = useMemo(
    () => post ? buildTocAndAddIds(post.contentHtml) : { html: '', toc: [] },
    [post]
  );
  useEffect(() => {
    if (!post || !toc.length) return;
    const obs = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveToc(visible[0].target.id);
    }, { rootMargin: '-100px 0px -60% 0px', threshold: 0.1 });
    toc.forEach(t => { const el = document.getElementById(t.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [post, toc]);

  // ─── Loading / error states ──────────────────────────────────────────
  if (loading && !post) {
    return (
      <div className="min-h-screen bg-hack-white">
        <div className="bg-hack-black text-hack-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
            <div className="h-4 w-32 bg-white/10 rounded mb-6" />
            <div className="h-10 w-3/4 bg-white/10 rounded mb-4" />
            <div className="h-6 w-1/2 bg-white/10 rounded" />
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 bg-hack-black/10 rounded w-full" />
          ))}
        </div>
      </div>
    );
  }
  if (error || !post) {
    return (
      <div className="min-h-screen bg-hack-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h1 className="font-display font-bold text-3xl mb-4">Article Not Found</h1>
          <p className="text-hack-black/60 mb-6">{error || 'The article you\'re looking for doesn\'t exist or has been moved.'}</p>
          <Link to="/blog" className="inline-flex items-center gap-2 px-6 py-3 bg-hack-yellow text-hack-black rounded-full font-bold hover:bg-hack-yellow/90 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  // ─── Notion-block content split + CTA injection ─────────────────────
  const segments = splitOnHr(htmlWithIds);
  const relatedFa = post.featured ? relatedFeatured(slug || '', post.category) : [];

  return (
    <div className="min-h-screen bg-hack-white">
      {/* Notion-style CSS extensions, scoped to .hk-blog-prose */}
      <style>{`
        .hk-progress { position: fixed; top: 0; left: 0; height: 3px; background: linear-gradient(90deg, #FFD60A, #FF006E, #00D4FF); z-index: 60; transition: width 120ms linear; box-shadow: 0 0 12px rgba(255, 0, 110, 0.4); }
        .hk-blog-prose h2:focus, .hk-blog-prose h3:focus { outline: 2px solid #FFD60A; outline-offset: 4px; border-radius: 4px; }
        .hk-blog-prose h2 { position: relative; padding-left: 1rem; border-left: 6px solid #FFD60A; scroll-margin-top: 96px; }
        .hk-blog-prose h2::before { content: ''; position: absolute; left: -6px; top: 0; bottom: 0; width: 6px; background: linear-gradient(180deg, #FFD60A, #FF7700); border-radius: 3px; }
        .hk-blog-prose h3 { position: relative; padding-left: 0.75rem; border-left: 4px solid #00D4FF; scroll-margin-top: 96px; }
        .hk-blog-prose hr { border: 0; height: 1px; margin: 2.5rem 0; background: linear-gradient(90deg, transparent, rgba(0,0,0,0.12), transparent); }
        .hk-blog-prose ul > li { position: relative; padding-left: 0.25rem; }
        .hk-blog-prose ul > li::marker { color: #FF006E; font-weight: 700; }
        .hk-blog-prose ol > li::marker { color: #00D4FF; font-weight: 700; }
        .hk-blog-prose p > strong:first-child { display: inline-block; }
        .hk-blog-prose blockquote { background: linear-gradient(135deg, #FFF4D6 0%, #FFE2B0 100%); border-left: 6px solid #FF7700; border-radius: 12px; padding: 1rem 1.25rem; margin: 1.5rem 0; font-style: normal; }
        .hk-blog-prose blockquote::before { content: '🔥 Pro tip — '; font-weight: 800; color: #B45309; }
        .hk-blog-prose table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid rgba(0,0,0,0.08); border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .hk-blog-prose th { background: #0B0B0F; color: #FFD60A; padding: 0.75rem 1rem; text-align: left; font-weight: 700; font-size: 0.875rem; }
        .hk-blog-prose td { padding: 0.75rem 1rem; border-top: 1px solid rgba(0,0,0,0.06); font-size: 0.95rem; }
        .hk-blog-prose tr:nth-child(even) td { background: rgba(0,0,0,0.015); }
        .hk-blog-prose code { background: rgba(124, 58, 237, 0.1); color: #5B21B6; padding: 0.1em 0.4em; border-radius: 4px; font-size: 0.9em; }
        .hk-blog-prose a { background: linear-gradient(180deg, transparent 70%, rgba(255, 214, 10, 0.5) 70%); padding: 0 2px; transition: background 200ms; }
        .hk-blog-prose a:hover { background: linear-gradient(180deg, transparent 0%, rgba(255, 214, 10, 0.8) 0%); }
        .hk-blog-prose p { margin-top: 0; margin-bottom: 1.1em; }
        details[open] summary .hk-faq-chevron { transform: rotate(90deg); }
        @keyframes hkSlideUp { from { transform: translateY(120%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .hk-sticky-enter { animation: hkSlideUp 280ms cubic-bezier(.2,.9,.3,1.2) both; }
      `}</style>

      {/* Reading progress bar */}
      <div className="hk-progress" style={{ width: progress + '%' }} aria-hidden="true" />

      {/* HERO — bold pain-point, social proof, benefit chips */}
      <div className="bg-hack-black text-hack-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 80% -10%, rgba(255, 214, 10, 0.4), transparent 50%), radial-gradient(ellipse at 0% 110%, rgba(255, 0, 110, 0.3), transparent 50%)',
        }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12">
          <Link to="/blog" className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange transition-colors mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>

          {/* Social proof banner — above the title, immediately visible */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5 text-xs text-hack-white/70">
            <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-hack-yellow" /> Used by 10,000+ Indian professionals</span>
            <span className="inline-flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-hack-yellow" /> Saves 8–20 hrs/week</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-hack-yellow" /> Trusted by SMEs across 28 cities</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {post.source === 'featured' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-hack-yellow text-hack-black text-xs font-bold rounded-full">
                <Star className="w-3 h-3" /> Featured
              </span>
            )}
            <Link to="/blog" className="inline-flex items-center gap-1 px-3 py-1 bg-hack-yellow/20 text-hack-yellow text-xs font-bold rounded-full hover:bg-hack-yellow/30 transition-colors">
              <Tag className="w-3 h-3" /> {post.category}
            </Link>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-6xl mb-5 leading-[1.05] tracking-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-base sm:text-lg text-hack-white/80 max-w-3xl leading-relaxed mb-6">
              {post.excerpt}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-hack-white/60">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDate(post.date)}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{readTime(post.contentHtml)}</span>
            <span className="flex items-center gap-1.5"><ListOrdered className="w-3.5 h-3.5" />{toc.length} sections</span>
          </div>
        </div>

        {(post.hero.src || post.heroGradient) && (
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-0">
            <div className="aspect-[16/9] overflow-hidden rounded-t-3xl bg-hack-black/40" style={!post.hero.src ? { background: post.heroGradient } : undefined}>
              {post.hero.src ? (
                <img src={post.hero.src} alt={post.hero.alt || post.title} className="w-full h-full object-cover" loading="eager" decoding="async" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-hack-black/80 font-display font-black text-3xl sm:text-5xl px-8 text-center drop-shadow-sm">
                    {post.category}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TWO-COLUMN BODY: sticky TOC sidebar (desktop) + article */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-10">
        <article ref={articleRef} className="min-w-0">
          {/* Quick Summary Box — auto-built from first ≤4 H2s, visible on every article */}
          {toc.length >= 3 && (
            <div className="mb-8 rounded-2xl border-2 border-hack-yellow/40 bg-gradient-to-br from-hack-yellow/15 to-hack-orange/5 p-5 lg:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-hack-orange" />
                <span className="font-display font-bold text-sm uppercase tracking-wider text-hack-black/70">Quick Summary</span>
              </div>
              <ul className="space-y-1.5 text-sm sm:text-base text-hack-black/80">
                {toc.slice(0, Math.min(5, toc.length)).map((t) => (
                  <li key={t.id} className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-hack-magenta" />
                    <a href={'#' + t.id} className="hover:text-hack-magenta transition-colors leading-snug">{t.text}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Content rendered as segments split on <hr/>, with CTA cards every 3 segments */}
          <div className="hk-blog-prose prose prose-lg max-w-none
                          prose-headings:font-display prose-headings:font-black
                          prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-5 prose-h2:leading-tight
                          prose-h3:text-xl prose-h3:mt-9 prose-h3:mb-3 prose-h3:leading-snug
                          prose-p:text-hack-black/85 prose-p:leading-relaxed
                          prose-a:text-hack-magenta prose-a:font-semibold prose-a:no-underline
                          prose-strong:text-hack-black prose-strong:font-bold
                          prose-li:text-hack-black/85 prose-li:my-1
                          prose-ol:list-decimal prose-ul:list-disc">
            {segments.map((seg, i) => (
              <Fragment key={i}>
                <div dangerouslySetInnerHTML={{ __html: seg }} />
                {/* Inject a conversion CTA card every 3 segments, but never as the very last block */}
                {((i + 1) % 3 === 0) && i < segments.length - 1 && (
                  <CtaCard variant={CTA_VARIANTS[Math.floor(i / 3) % CTA_VARIANTS.length]} />
                )}
              </Fragment>
            ))}
          </div>

          {/* FAQ — Notion-style accordion */}
          {post.featured?.faq && post.featured.faq.length > 0 && (
            <div className="mt-14">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-5 h-5 text-hack-magenta" />
                <h2 className="font-display font-black text-2xl sm:text-3xl m-0 leading-tight">Frequently Asked Questions</h2>
              </div>
              <div className="space-y-2.5">
                {post.featured.faq.map((item, i) => (
                  <details key={i} className="group bg-white rounded-2xl border border-hack-black/10 hover:border-hack-yellow transition-colors open:border-hack-yellow open:shadow-md">
                    <summary className="flex items-center justify-between gap-3 p-5 cursor-pointer list-none">
                      <span className="font-bold text-hack-black text-base sm:text-lg leading-snug">{item.q}</span>
                      <ChevronRight className="hk-faq-chevron w-5 h-5 text-hack-magenta flex-shrink-0 transition-transform" />
                    </summary>
                    <div className="px-5 pb-5">
                      <p className="text-hack-black/75 leading-relaxed m-0">{item.a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* FINAL CTA — strong close with urgency, benefit, two-button choice */}
          <div className="mt-14 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-7 lg:p-10 text-center" style={{ background: 'linear-gradient(135deg, #0B0B0F 0%, #1F1F2E 100%)' }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-hack-yellow/20 text-hack-yellow rounded-full text-xs font-bold mb-4">
                <Flame className="w-3.5 h-3.5" /> Stop wasting time. Start shipping.
              </div>
              <h3 className="font-display font-black text-2xl sm:text-4xl text-white mb-3 leading-tight">
                Ready-made templates beat 6 months of building from scratch.
              </h3>
              <p className="text-white/70 max-w-2xl mx-auto mb-6 text-sm sm:text-base leading-relaxed">
                233+ premium templates · ₹19 starting price · instant download · lifetime access.
                Used daily by founders, freelancers, and SME teams across India.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/shop" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-hack-yellow text-hack-black rounded-full font-bold hover:bg-white transition-colors text-base shadow-lg">
                  Browse the Shop <ChevronRight className="w-5 h-5" />
                </Link>
                <Link to="/shop/free-resources" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 text-white border border-white/20 rounded-full font-semibold hover:bg-white/20 transition-colors text-base">
                  <Download className="w-5 h-5" /> Free Starter Pack
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-6 text-xs text-white/50">
                <span>✓ Instant download</span>
                <span>✓ Lifetime updates</span>
                <span>✓ 7-day refund</span>
                <span>✓ India-first templates</span>
              </div>
            </div>
          </div>
        </article>

        {/* Sticky TOC sidebar — desktop only */}
        {toc.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="text-xs font-bold uppercase tracking-wider text-hack-black/40 mb-3 flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5" /> On this page
              </div>
              <nav className="space-y-1 border-l-2 border-hack-black/10">
                {toc.map((t) => (
                  <a
                    key={t.id}
                    href={'#' + t.id}
                    onClick={() => {
                      const el = document.getElementById(t.id);
                      if (el) { el.setAttribute('tabindex', '-1'); setTimeout(() => el.focus({ preventScroll: true }), 250); }
                    }}
                    className={`block pl-3 -ml-px py-1.5 text-sm border-l-2 transition-colors ${
                      activeToc === t.id
                        ? 'border-hack-magenta text-hack-magenta font-semibold'
                        : 'border-transparent text-hack-black/60 hover:text-hack-black hover:border-hack-yellow'
                    }`}
                  >
                    {t.text}
                  </a>
                ))}
              </nav>

              {/* Mini sidebar promo */}
              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-hack-yellow/20 to-hack-orange/10 border border-hack-yellow/30">
                <div className="text-xs font-bold text-hack-orange mb-1">⚡ READER OFFER</div>
                <p className="text-sm text-hack-black/80 leading-snug mb-3">5 free templates. No signup. Instant download.</p>
                <Link to="/shop/free-resources" className="inline-flex items-center gap-1 text-sm font-bold text-hack-magenta hover:text-hack-black transition-colors">
                  Get them <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Related — featured for featured posts; WP for WP posts */}
      {post.source === 'featured' && relatedFa.length > 0 && (
        <div className="bg-hack-black/[0.02] border-t border-hack-black/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <h2 className="font-display font-black text-2xl sm:text-3xl mb-6">Keep reading</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedFa.map((r) => (
                <Link key={r.slug} to={`/blog/${r.slug}`} className="group block bg-white rounded-2xl overflow-hidden border border-hack-black/8 hover:border-hack-yellow hover:shadow-lg transition-all">
                  <div className="aspect-[16/9] overflow-hidden flex items-center justify-center" style={{ background: r.gradient || 'linear-gradient(135deg, #FFD60A, #FF7700)' }}>
                    <div className="text-hack-black/80 font-display font-black text-lg px-6 text-center">{r.category}</div>
                  </div>
                  <div className="p-5">
                    <div className="text-xs font-bold text-hack-magenta uppercase tracking-wide mb-2">{r.category}</div>
                    <h3 className="font-display font-bold text-base leading-snug line-clamp-3 group-hover:text-hack-magenta transition-colors mb-2">{r.title}</h3>
                    <p className="text-xs text-hack-black/40 flex items-center gap-2">
                      <Clock className="w-3 h-3" />{r.readMinutes} min read
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      {post.source === 'wp' && related.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <h2 className="font-display font-bold text-2xl mb-6">More from the blog</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((r) => {
              const m = r._embedded?.['wp:featuredmedia']?.[0];
              const sizes = m?.media_details?.sizes || {};
              const src = sizes['medium_large']?.source_url || sizes['medium']?.source_url || m?.source_url || '';
              return (
                <Link key={r.id} to={`/blog/${r.slug}`} className="group block bg-white rounded-2xl overflow-hidden border border-hack-black/5 card-hover">
                  <div className="aspect-[16/10] overflow-hidden bg-hack-black/5">
                    {src ? (
                      <img src={src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-hack-yellow to-hack-orange" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-display font-bold text-sm line-clamp-2 group-hover:text-hack-magenta transition-colors">
                      {decodeHtml(stripHtml(r.title.rendered))}
                    </h3>
                    <p className="text-xs text-hack-black/40 mt-2">{formatDate(r.date)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* STICKY MOBILE CTA — slides in after 25% scroll, dismissable */}
      {showStickyCta && !stickyDismissed && (
        <div className="lg:hidden fixed bottom-3 inset-x-3 z-50 hk-sticky-enter">
          <div className="rounded-2xl shadow-2xl overflow-hidden border border-hack-yellow/50" style={{ background: 'linear-gradient(135deg, #0B0B0F, #1F1F2E)' }}>
            <div className="p-3 flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFD60A, #FF7700)' }}>
                <Zap className="w-5 h-5 text-hack-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-bold leading-tight truncate">Save 10–20 hrs/week</div>
                <div className="text-white/60 text-[11px] truncate">Ready-made templates from ₹19</div>
              </div>
              <Link to="/shop" className="flex-shrink-0 px-3 py-2 bg-hack-yellow text-hack-black rounded-lg text-xs font-bold whitespace-nowrap">
                Browse →
              </Link>
              <button onClick={() => setStickyDismissed(true)} aria-label="Dismiss" className="flex-shrink-0 w-7 h-7 rounded-full text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Reusable inline CTA card component ──────────────────────────────────
type CtaVariant = typeof CTA_VARIANTS[number];
const CtaCard = ({ variant }: { variant: CtaVariant }) => (
  <div className="not-prose my-10 rounded-2xl overflow-hidden shadow-lg" style={{ background: variant.bg, color: variant.fg }}>
    <div className="p-6 lg:p-7 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1.5">{variant.eyebrow}</div>
        <div className="font-display font-black text-xl sm:text-2xl leading-tight mb-1">{variant.title}</div>
        <div className="text-sm sm:text-base opacity-90 leading-relaxed">{variant.body}</div>
      </div>
      <Link to={variant.href} className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold whitespace-nowrap hover:opacity-90 transition-opacity shadow-md" style={{ background: variant.btnBg, color: variant.btnFg }}>
        {variant.label} <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  </div>
);

export default BlogPostPage;
