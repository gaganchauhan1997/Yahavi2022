/**
 * Frontend RSS aggregator — 50+ tech / AI / dev / business feeds.
 * Uses rss2json public proxy (free, no key needed up to 10k req/day) so
 * we can fetch RSS from the browser without CORS pain.
 *
 * Falls back silently to empty list if a feed times out.
 */

import type { HKRelease } from './hk-content';

export interface FrontendFeed {
  key: string;          // unique short id
  name: string;         // display name
  url: string;          // raw RSS/Atom URL
  color?: string;       // optional badge tint
  category?: 'ai' | 'tech' | 'dev' | 'startup' | 'security' | 'design' | 'business';
}

/** Curated 50+ feed list — all public RSS/Atom feeds. */
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

  // ── Big Tech News ───────────────────────────────────────
  { key: 'techcrunch',      name: 'TechCrunch',           url: 'https://techcrunch.com/feed/',                               color: '#0a9928', category: 'tech' },
  { key: 'verge',           name: 'The Verge',            url: 'https://www.theverge.com/rss/index.xml',                     color: '#5200ff', category: 'tech' },
  { key: 'wired',           name: 'Wired',                url: 'https://www.wired.com/feed/rss',                             color: '#000000', category: 'tech' },
  { key: 'arstechnica',     name: 'Ars Technica',         url: 'https://feeds.arstechnica.com/arstechnica/index',            color: '#ff4e00', category: 'tech' },
  { key: 'engadget',        name: 'Engadget',             url: 'https://www.engadget.com/rss.xml',                           color: '#1bb6ff', category: 'tech' },
  { key: 'mashable-tech',   name: 'Mashable Tech',        url: 'https://mashable.com/feeds/rss/tech',                        color: '#00aeef', category: 'tech' },
  { key: 'venturebeat',     name: 'VentureBeat',          url: 'https://venturebeat.com/feed/',                              color: '#e1112c', category: 'tech' },
  { key: 'ndtv-gadgets',    name: 'NDTV Gadgets',         url: 'https://gadgets.ndtv.com/rss/news',                          color: '#cc0000', category: 'tech' },
  { key: 'inc42',           name: 'Inc42',                url: 'https://inc42.com/feed/',                                    color: '#ff6f00', category: 'tech' },

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

  // ── Startup / Business ──────────────────────────────────
  { key: 'ycombinator',     name: 'Y Combinator Blog',    url: 'https://www.ycombinator.com/blog/rss.xml',                   color: '#ff6600', category: 'startup' },
  { key: 'a16z',            name: 'a16z',                 url: 'https://a16z.com/feed/',                                     color: '#000000', category: 'startup' },
  { key: 'firstround',      name: 'First Round Review',   url: 'https://review.firstround.com/feed.xml',                     color: '#fd5200', category: 'startup' },
  { key: 'entrackr',        name: 'Entrackr',             url: 'https://entrackr.com/feed',                                  color: '#1a73e8', category: 'startup' },
  { key: 'yourstory',       name: 'YourStory',            url: 'https://yourstory.com/feed',                                 color: '#ff007a', category: 'startup' },
  { key: 'forbes-tech',     name: 'Forbes Tech',          url: 'https://www.forbes.com/innovation/feed2/',                   color: '#0a4d8c', category: 'business' },
  { key: 'hbr',             name: 'Harvard Business Review', url: 'https://feeds.hbr.org/harvardbusiness',                   color: '#a51c30', category: 'business' },
  { key: 'mckinsey',        name: 'McKinsey Insights',    url: 'https://www.mckinsey.com/insights/rss',                      color: '#003a5d', category: 'business' },
  { key: 'wsj-tech',        name: 'WSJ Tech',             url: 'https://feeds.a.dj.com/rss/RSSWSJD.xml',                     color: '#0274b6', category: 'business' },
  { key: 'reuters-tech',    name: 'Reuters Tech',         url: 'https://www.reutersagency.com/feed/?best-topics=tech&post_type=best',          color: '#ff8000', category: 'business' },

  // ── Design / Product ────────────────────────────────────
  { key: 'producthunt',     name: 'Product Hunt',         url: 'https://www.producthunt.com/feed',                           color: '#da552f', category: 'design' },
  { key: 'figma',           name: 'Figma Blog',           url: 'https://www.figma.com/blog/rss/',                            color: '#a259ff', category: 'design' },
  { key: 'webflow',         name: 'Webflow Blog',         url: 'https://webflow.com/blog/rss.xml',                           color: '#4353ff', category: 'design' },

  // ── India focus ─────────────────────────────────────────
  { key: 'gadgets360',      name: 'Gadgets 360',          url: 'https://gadgets360.com/rss/news',                            color: '#cc0000', category: 'tech' },
  { key: 'analytics-india', name: 'Analytics India Mag',  url: 'https://analyticsindiamag.com/feed/',                        color: '#00a651', category: 'ai' },
  { key: 'business-std-tech', name: 'Business Standard Tech', url: 'https://www.business-standard.com/rss/technology-103.rss', color: '#003366', category: 'business' },

  // ── Hacker News ─────────────────────────────────────────
  { key: 'hn-frontpage',    name: 'Hacker News',          url: 'https://hnrss.org/frontpage',                                color: '#ff6600', category: 'tech' },
  { key: 'hn-best',         name: 'Hacker News (Best)',   url: 'https://hnrss.org/best',                                     color: '#ff6600', category: 'tech' },
];

/** rss2json response shape (just the bits we need) */
interface Rss2JsonItem  { title: string; link: string; pubDate: string; description?: string; thumbnail?: string; enclosure?: { link?: string }; }
interface Rss2JsonResp  { status: string; feed?: { title?: string; image?: string }; items?: Rss2JsonItem[]; }

const PROXY = 'https://api.rss2json.com/v1/api.json';

/** Strip HTML tags + collapse whitespace for excerpts. */
function stripHtml(s?: string, max = 220): string {
  if (!s) return '';
  return s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Convert a raw rss2json item into HKRelease shape so the news page renders it. */
function toRelease(feed: FrontendFeed, item: Rss2JsonItem, idx: number): HKRelease {
  const thumb = item.thumbnail || item.enclosure?.link || '';
  return {
    id: 1_000_000 + (feed.key.charCodeAt(0) * 1000) + idx,
    slug: `${feed.key}-${idx}`,
    title: item.title || '(untitled)',
    excerpt: stripHtml(item.description),
    type: 'rss',
    type_label: feed.category ? feed.category.toUpperCase() : 'NEWS',
    release_date: item.pubDate || new Date().toISOString(),
    cover: thumb,
    cta_url: item.link,
    cta_label: 'Read article',
    rss_source: feed.name,
    rss_source_key: feed.key,
    rss_color: feed.color,
  };
}

/** Fetch a single feed via rss2json (returns [] on any failure). */
async function fetchOne(feed: FrontendFeed, perFeed: number, signal: AbortSignal): Promise<HKRelease[]> {
  try {
    const u = `${PROXY}?rss_url=${encodeURIComponent(feed.url)}&count=${perFeed}`;
    const r = await fetch(u, { signal, cache: 'force-cache' });
    if (!r.ok) return [];
    const j = (await r.json()) as Rss2JsonResp;
    if (j.status !== 'ok' || !Array.isArray(j.items)) return [];
    return j.items.slice(0, perFeed).map((it, i) => toRelease(feed, it, i));
  } catch {
    return [];
  }
}

/** Pull from N feeds in parallel and return a single sorted list. */
export async function fetchFrontendNews(opts: {
  feedKeys?: string[];   // restrict to a subset; default = all
  perFeed?: number;      // items per feed; default 3
  limit?: number;        // overall cap; default 60
  timeoutMs?: number;    // default 8s
} = {}): Promise<HKRelease[]> {
  const list = opts.feedKeys?.length
    ? FRONTEND_FEEDS.filter(f => opts.feedKeys!.includes(f.key))
    : FRONTEND_FEEDS;
  const perFeed = opts.perFeed ?? 3;
  const limit   = opts.limit   ?? 60;
  const timeout = opts.timeoutMs ?? 8000;

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const results = await Promise.all(list.map(f => fetchOne(f, perFeed, ctl.signal)));
    const merged = results.flat();
    merged.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
    return merged.slice(0, limit);
  } finally {
    clearTimeout(t);
  }
}

/** List of available frontend sources for filter UI. */
export const FRONTEND_SOURCES = FRONTEND_FEEDS.map(f => ({
  key: f.key,
  name: f.name,
  color: f.color || '#999',
  category: f.category || 'tech',
}));
