/**
 * Frontend RSS aggregator — 60+ tech / AI / dev / business / India feeds.
 *
 * Two-tier strategy:
 *  1. Primary proxy = rss2json (fast, returns thumbnails, free up to 10k/day).
 *  2. Fallback     = AllOrigins (raw XML), parsed in-browser when rss2json
 *                    quota is exhausted or returns an error.
 *
 * Per-feed AbortController + per-feed timeout — one slow feed never kills
 * the whole batch. Result: a single bad source = empty list for that source
 * only, every other source still renders.
 */

import type { HKRelease } from './hk-content';

export interface FrontendFeed {
  key: string;          // unique short id
  name: string;         // display name
  url: string;          // raw RSS/Atom URL
  color?: string;       // optional badge tint
  category?: 'ai' | 'tech' | 'dev' | 'startup' | 'security' | 'design' | 'business';
}

/** Curated 60+ feed list — all public RSS/Atom feeds. */
export const FRONTEND_FEEDS: FrontendFeed[] = [
  // ── AI / ML ─────────────────────────────────────────────
  { key: 'openai-blog',     name: 'OpenAI Blog',          url: 'https://openai.com/news/rss.xml',                            color: '#10a37f', category: 'ai' },
  { key: 'huggingface',     name: 'Hugging Face',         url: 'https://huggingface.co/blog/feed.xml',                       color: '#ff9d00', category: 'ai' },
  { key: 'google-ai',       name: 'Google Research',      url: 'https://blog.research.google/feeds/posts/default',           color: '#4285f4', category: 'ai' },
  { key: 'deepmind',        name: 'DeepMind',             url: 'https://deepmind.google/blog/rss.xml',                       color: '#3367d6', category: 'ai' },
  { key: 'anthropic',       name: 'Anthropic',            url: 'https://www.anthropic.com/news/rss.xml',                     color: '#cc785c', category: 'ai' },
  { key: 'mit-ai',          name: 'MIT AI News',          url: 'https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml', color: '#a31f34', category: 'ai' },
  { key: 'aws-ml',          name: 'AWS Machine Learning', url: 'https://aws.amazon.com/blogs/machine-learning/feed/',        color: '#ff9900', category: 'ai' },
  { key: 'nvidia-ai',       name: 'NVIDIA AI Blog',       url: 'https://blogs.nvidia.com/blog/category/deep-learning/feed/', color: '#76b900', category: 'ai' },
  { key: 'mit-tech-review', name: 'MIT Technology Review',url: 'https://www.technologyreview.com/feed/',                     color: '#a31f34', category: 'ai' },
  { key: 'analytics-india', name: 'Analytics India Mag',  url: 'https://analyticsindiamag.com/feed/',                        color: '#00a651', category: 'ai' },

  // ── Big Tech News ───────────────────────────────────────
  { key: 'techcrunch',      name: 'TechCrunch',           url: 'https://techcrunch.com/feed/',                               color: '#0a9928', category: 'tech' },
  { key: 'verge',           name: 'The Verge',            url: 'https://www.theverge.com/rss/index.xml',                     color: '#5200ff', category: 'tech' },
  { key: 'wired',           name: 'Wired',                url: 'https://www.wired.com/feed/rss',                             color: '#000000', category: 'tech' },
  { key: 'arstechnica',     name: 'Ars Technica',         url: 'https://feeds.arstechnica.com/arstechnica/index',            color: '#ff4e00', category: 'tech' },
  { key: 'engadget',        name: 'Engadget',             url: 'https://www.engadget.com/rss.xml',                           color: '#1bb6ff', category: 'tech' },
  { key: 'mashable-tech',   name: 'Mashable Tech',        url: 'https://mashable.com/feeds/rss/tech',                        color: '#00aeef', category: 'tech' },
  { key: 'venturebeat',     name: 'VentureBeat',          url: 'https://venturebeat.com/feed/',                              color: '#e1112c', category: 'tech' },
  { key: 'bbc-tech',        name: 'BBC Tech',             url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',           color: '#bb1919', category: 'tech' },
  { key: 'zdnet',           name: 'ZDNet',                url: 'https://www.zdnet.com/news/rss.xml',                         color: '#e62232', category: 'tech' },
  { key: 'computerworld',   name: 'Computerworld',        url: 'https://www.computerworld.com/index.rss',                    color: '#0096d6', category: 'tech' },
  { key: 'slashdot',        name: 'Slashdot',             url: 'https://rss.slashdot.org/Slashdot/slashdotMain',             color: '#006666', category: 'tech' },
  { key: 'ieee-spectrum',   name: 'IEEE Spectrum',        url: 'https://spectrum.ieee.org/feeds/feed.rss',                   color: '#00629b', category: 'tech' },

  // ── Developer / Engineering ─────────────────────────────
  { key: 'github-blog',     name: 'GitHub Blog',          url: 'https://github.blog/feed/',                                  color: '#24292e', category: 'dev' },
  { key: 'stackoverflow',   name: 'Stack Overflow Blog',  url: 'https://stackoverflow.blog/feed/',                           color: '#f48024', category: 'dev' },
  { key: 'dev-to',          name: 'DEV.to',               url: 'https://dev.to/feed',                                        color: '#0a0a0a', category: 'dev' },
  { key: 'hashnode',        name: 'Hashnode',             url: 'https://hashnode.com/rss',                                   color: '#2962ff', category: 'dev' },
  { key: 'css-tricks',      name: 'CSS-Tricks',           url: 'https://css-tricks.com/feed/',                               color: '#ff7a59', category: 'dev' },
  { key: 'smashing',        name: 'Smashing Magazine',    url: 'https://www.smashingmagazine.com/feed/',                     color: '#d33a2c', category: 'dev' },
  { key: 'mdn',             name: 'MDN Web Docs',         url: 'https://developer.mozilla.org/en-US/blog/rss.xml',           color: '#000000', category: 'dev' },
  { key: 'react-blog',      name: 'React Blog',           url: 'https://react.dev/rss.xml',                                  color: '#61dafb', category: 'dev' },
  { key: 'nodejs',          name: 'Node.js',              url: 'https://nodejs.org/en/feed/blog.xml',                        color: '#339933', category: 'dev' },
  { key: 'vercel',          name: 'Vercel',               url: 'https://vercel.com/atom',                                    color: '#000000', category: 'dev' },
  { key: 'netlify',         name: 'Netlify',              url: 'https://www.netlify.com/blog/index.xml',                     color: '#00c7b7', category: 'dev' },
  { key: 'cloudflare',      name: 'Cloudflare Blog',      url: 'https://blog.cloudflare.com/rss/',                           color: '#f38020', category: 'dev' },
  { key: 'docker',          name: 'Docker Blog',          url: 'https://www.docker.com/blog/feed/',                          color: '#2496ed', category: 'dev' },
  { key: 'kubernetes',      name: 'Kubernetes Blog',      url: 'https://kubernetes.io/feed.xml',                             color: '#326ce5', category: 'dev' },

  // ── Security ────────────────────────────────────────────
  { key: 'krebs',           name: 'Krebs on Security',    url: 'https://krebsonsecurity.com/feed/',                          color: '#cc0000', category: 'security' },
  { key: 'thehackernews',   name: 'The Hacker News',      url: 'https://feeds.feedburner.com/TheHackersNews',                color: '#e02020', category: 'security' },
  { key: 'darkreading',     name: 'Dark Reading',         url: 'https://www.darkreading.com/rss.xml',                        color: '#1a1a1a', category: 'security' },
  { key: 'bleeping',        name: 'Bleeping Computer',    url: 'https://www.bleepingcomputer.com/feed/',                     color: '#003366', category: 'security' },
  { key: 'schneier',        name: 'Schneier on Security', url: 'https://www.schneier.com/feed/atom/',                        color: '#cc0000', category: 'security' },

  // ── Startup / Business ──────────────────────────────────
  { key: 'ycombinator',     name: 'Y Combinator Blog',    url: 'https://www.ycombinator.com/blog/rss.xml',                   color: '#ff6600', category: 'startup' },
  { key: 'a16z',            name: 'a16z',                 url: 'https://a16z.com/feed/',                                     color: '#000000', category: 'startup' },
  { key: 'firstround',      name: 'First Round Review',   url: 'https://review.firstround.com/feed.xml',                     color: '#fd5200', category: 'startup' },
  { key: 'entrackr',        name: 'Entrackr',             url: 'https://entrackr.com/feed',                                  color: '#1a73e8', category: 'startup' },
  { key: 'yourstory',       name: 'YourStory',            url: 'https://yourstory.com/feed',                                 color: '#ff007a', category: 'startup' },
  { key: 'inc42',           name: 'Inc42',                url: 'https://inc42.com/feed/',                                    color: '#ff6f00', category: 'startup' },
  { key: 'hbr',             name: 'Harvard Business Review', url: 'https://hbr.org/resources/css/feeds/all/feed_rss.xml',    color: '#a51c30', category: 'business' },
  { key: 'forbes-tech',     name: 'Forbes Innovation',    url: 'https://www.forbes.com/innovation/feed2/',                   color: '#0a4d8c', category: 'business' },

  // ── Design / Product ────────────────────────────────────
  { key: 'producthunt',     name: 'Product Hunt',         url: 'https://www.producthunt.com/feed',                           color: '#da552f', category: 'design' },
  { key: 'figma',           name: 'Figma Blog',           url: 'https://www.figma.com/blog/rss/',                            color: '#a259ff', category: 'design' },
  { key: 'webflow',         name: 'Webflow Blog',         url: 'https://webflow.com/blog/rss.xml',                           color: '#4353ff', category: 'design' },

  // ── India focus ─────────────────────────────────────────
  { key: 'gadgets360',      name: 'Gadgets 360',          url: 'https://gadgets360.com/rss/news',                            color: '#cc0000', category: 'tech' },
  { key: 'ndtv-gadgets',    name: 'NDTV Gadgets',         url: 'https://gadgets.ndtv.com/rss/news',                          color: '#cc0000', category: 'tech' },
  { key: 'business-std-tech', name: 'Business Standard Tech', url: 'https://www.business-standard.com/rss/technology-103.rss', color: '#003366', category: 'business' },
  { key: 'et-tech',         name: 'Economic Times Tech',  url: 'https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms', color: '#ed193f', category: 'business' },
  { key: 'toi-tech',        name: 'TOI Tech',             url: 'https://timesofindia.indiatimes.com/rssfeeds/66949542.cms',  color: '#ed1c24', category: 'tech' },
  { key: 'ht-tech',         name: 'Hindustan Times Tech', url: 'https://www.hindustantimes.com/feeds/rss/technology/rssfeed.xml', color: '#0066b3', category: 'tech' },

  // ── Hacker News ─────────────────────────────────────────
  { key: 'hn-frontpage',    name: 'Hacker News',          url: 'https://hnrss.org/frontpage',                                color: '#ff6600', category: 'tech' },
  { key: 'hn-best',         name: 'Hacker News (Best)',   url: 'https://hnrss.org/best',                                     color: '#ff6600', category: 'tech' },
];

/** rss2json response shape (just the bits we need) */
interface Rss2JsonItem  { title: string; link: string; pubDate: string; description?: string; thumbnail?: string; enclosure?: { link?: string }; }
interface Rss2JsonResp  { status: string; feed?: { title?: string; image?: string }; items?: Rss2JsonItem[]; }

const PROXY_PRIMARY  = 'https://api.rss2json.com/v1/api.json';
const PROXY_FALLBACK = 'https://api.allorigins.win/raw';

/** Strip HTML tags + collapse whitespace for excerpts. */
function stripHtml(s?: string, max = 220): string {
  if (!s) return '';
  return s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Pull first <img src="..."> out of HTML description as a thumbnail fallback. */
function extractImg(html?: string): string {
  if (!html) return '';
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return m ? m[1] : '';
}

/**
 * Convert a raw item into HKRelease shape so the news page renders it.
 * IMPORTANT: populate both the canonical fields the page reads
 * (`source_url`, `image`, `summary`) AND the legacy aliases
 * (`cta_url`, `cover`, `excerpt`) so any consumer keeps working.
 */
function toRelease(feed: FrontendFeed, item: Rss2JsonItem, idx: number): HKRelease {
  const thumb = item.thumbnail || item.enclosure?.link || extractImg(item.description) || '';
  const text  = stripHtml(item.description);
  return {
    id: 1_000_000 + (feed.key.charCodeAt(0) * 1000) + idx,
    slug: `${feed.key}-${idx}`,
    title: item.title || '(untitled)',
    summary: text,                                       // ← page reads this
    excerpt: text,                                       // ← legacy alias
    type: 'rss',
    type_label: feed.category ? feed.category.toUpperCase() : 'NEWS',
    release_date: item.pubDate || new Date().toISOString(),
    image: thumb || null,                                // ← page reads this
    cover: thumb,                                        // ← legacy alias
    source_url: item.link,                               // ← page reads this
    cta_url: item.link,                                  // ← legacy alias
    cta_label: 'Read article',
    rss_source: feed.name,
    rss_source_key: feed.key,
    rss_color: feed.color,
  };
}

/** Lightweight RSS/Atom parser for the AllOrigins fallback. */
function parseRawXml(xml: string): Rss2JsonItem[] {
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) return [];
    const out: Rss2JsonItem[] = [];
    // RSS 2.0
    doc.querySelectorAll('item').forEach((el) => {
      const enc = el.querySelector('enclosure');
      out.push({
        title:       el.querySelector('title')?.textContent?.trim() || '',
        link:        el.querySelector('link')?.textContent?.trim() || '',
        pubDate:     el.querySelector('pubDate')?.textContent?.trim() || '',
        description: el.querySelector('description')?.textContent?.trim() || '',
        enclosure:   enc ? { link: enc.getAttribute('url') || '' } : undefined,
      });
    });
    // Atom
    if (out.length === 0) {
      doc.querySelectorAll('entry').forEach((el) => {
        const linkEl = el.querySelector('link[rel="alternate"], link');
        out.push({
          title:       el.querySelector('title')?.textContent?.trim() || '',
          link:        linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || '',
          pubDate:     el.querySelector('updated, published')?.textContent?.trim() || '',
          description: el.querySelector('summary, content')?.textContent?.trim() || '',
        });
      });
    }
    return out;
  } catch { return []; }
}

/** Outcome of a single feed fetch (used to compute per-feed health). */
export interface FeedFetchResult {
  feed: FrontendFeed;
  ok: boolean;
  via: 'rss2json' | 'allorigins' | 'none';
  items: HKRelease[];
}

/** Per-feed AbortController + timeout. One slow feed cannot kill the batch. */
async function fetchOne(
  feed: FrontendFeed,
  perFeed: number,
  perFeedTimeoutMs: number,
): Promise<FeedFetchResult> {
  // ----- attempt 1: rss2json -----
  const ctl1 = new AbortController();
  const t1 = setTimeout(() => ctl1.abort(), perFeedTimeoutMs);
  try {
    const u = `${PROXY_PRIMARY}?rss_url=${encodeURIComponent(feed.url)}&count=${perFeed}`;
    const r = await fetch(u, { signal: ctl1.signal });
    if (r.ok) {
      const j = (await r.json()) as Rss2JsonResp;
      if (j.status === 'ok' && Array.isArray(j.items) && j.items.length) {
        return { feed, ok: true, via: 'rss2json', items: j.items.slice(0, perFeed).map((it, i) => toRelease(feed, it, i)) };
      }
    }
  } catch { /* fall through */ }
  finally { clearTimeout(t1); }

  // ----- attempt 2: AllOrigins raw XML -----
  const ctl2 = new AbortController();
  const t2 = setTimeout(() => ctl2.abort(), perFeedTimeoutMs);
  try {
    const u = `${PROXY_FALLBACK}?url=${encodeURIComponent(feed.url)}`;
    const r = await fetch(u, { signal: ctl2.signal });
    if (r.ok) {
      const xml = await r.text();
      const items = parseRawXml(xml).slice(0, perFeed);
      if (items.length) {
        return { feed, ok: true, via: 'allorigins', items: items.map((it, i) => toRelease(feed, it, i)) };
      }
    }
  } catch { /* fall through */ }
  finally { clearTimeout(t2); }

  return { feed, ok: false, via: 'none', items: [] };
}

/** Aggregate result returned to the news page. */
export interface FrontendNewsResult {
  items: HKRelease[];
  liveCount: number;       // sources that returned ≥1 item
  totalCount: number;      // sources we tried
  perSource: { key: string; name: string; ok: boolean; itemCount: number }[];
}

/**
 * Pull from N feeds in parallel and return a sorted list + per-source health.
 * Uses Promise.allSettled so one rejection cannot abort siblings.
 */
export async function fetchFrontendNews(opts: {
  feedKeys?: string[];     // restrict to a subset; default = all
  perFeed?: number;        // items per feed; default 3
  limit?: number;          // overall cap; default 200
  perFeedTimeoutMs?: number; // per-feed timeout; default 6s
} = {}): Promise<FrontendNewsResult> {
  const list = opts.feedKeys?.length
    ? FRONTEND_FEEDS.filter(f => opts.feedKeys!.includes(f.key))
    : FRONTEND_FEEDS;
  const perFeed = opts.perFeed ?? 3;
  const limit   = opts.limit   ?? 200;
  const perFeedTimeoutMs = opts.perFeedTimeoutMs ?? 6000;

  const settled = await Promise.allSettled(
    list.map(f => fetchOne(f, perFeed, perFeedTimeoutMs))
  );
  const results: FeedFetchResult[] = settled.map((s, i) =>
    s.status === 'fulfilled'
      ? s.value
      : { feed: list[i], ok: false, via: 'none' as const, items: [] }
  );

  const merged = results.flatMap(r => r.items);
  merged.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
  return {
    items: merged.slice(0, limit),
    liveCount:  results.filter(r => r.ok).length,
    totalCount: results.length,
    perSource:  results.map(r => ({
      key: r.feed.key,
      name: r.feed.name,
      ok: r.ok,
      itemCount: r.items.length,
    })),
  };
}

/** List of available frontend sources for filter UI. */
export const FRONTEND_SOURCES = FRONTEND_FEEDS.map(f => ({
  key: f.key,
  name: f.name,
  color: f.color || '#999',
  category: f.category || 'tech',
}));

/* ────────────────────────────────────────────────────────────────────────── *
 *  Citation grouping
 *  --------------------------------------------------------------------------
 *  Many of the 60 feeds will cover the same story (e.g. an OpenAI launch).
 *  We group near-identical headlines so the user sees ONE card with multiple
 *  source citations — exactly like Google News / Apple News.
 * ────────────────────────────────────────────────────────────────────────── */

/** Words too generic to drive grouping. */
const STOP = new Set([
  'the','a','an','to','of','in','for','on','and','or','with','from','at',
  'by','is','are','was','were','be','as','it','its','this','that','these',
  'those','will','can','new','update','updates','says','said','how','why',
  'what','when','where','who','vs','via','plus','our','your','my','their',
  'breaking','exclusive','report','reports','news','review','launch','launches',
  'now','just','today','yesterday'
]);

/** Build a normalized fingerprint for grouping similar headlines. */
function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP.has(w))
    .slice(0, 5)        // first 5 significant words ≈ the story
    .sort()             // order-independent
    .join('|');
}

export interface CitedRelease extends HKRelease {
  citations?: Array<{ source: string; url: string; color?: string }>;
}

/**
 * Collapse duplicate stories. Keeps the FIRST item (highest sort order)
 * as the canonical card and attaches all other source URLs as `citations`.
 */
export function groupCitations(items: HKRelease[]): CitedRelease[] {
  const buckets = new Map<string, CitedRelease>();
  const out: CitedRelease[] = [];
  for (const it of items) {
    const k = titleKey(it.title || '');
    if (!k || k.split('|').length < 2) {
      // Too generic to group safely — keep as standalone.
      out.push(it as CitedRelease);
      continue;
    }
    const existing = buckets.get(k);
    if (existing) {
      const url = it.source_url || it.cta_url || '';
      if (url && !existing.citations!.some(c => c.url === url)) {
        existing.citations!.push({
          source: it.rss_source || 'Source',
          url,
          color: it.rss_color,
        });
      }
    } else {
      const fresh: CitedRelease = { ...it, citations: [] };
      buckets.set(k, fresh);
      out.push(fresh);
    }
  }
  return out;
}
