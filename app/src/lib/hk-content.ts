/**
 * HackKnow custom CPT fetchers — Courses, Roadmaps, Hacked News, Live RSS, Verify.
 * All endpoints live under /wp-json/hackknow/v1/* on shop.hackknow.com,
 * proxied through www.hackknow.com via nginx.
 */
import { WP_REST_BASE, API_BASE } from './api-base';
import { getAuthToken } from './auth-token';

/* ── Types ─────────────────────────────────────────────────── */
export interface HKCategory  { id: number; slug: string; name: string; parent: number; description: string; count: number; }
export interface HKListResp<T> { items: T[]; total: number; total_pages?: number; page?: number; }

export interface HKCourse {
  id: number; slug: string; title: string; excerpt: string; content?: string;
  level: string; duration: string; price: string;
  chapters: { title: string; duration?: string; lessons?: string[] }[];
  requirements: string[]; outcomes: string[]; tools: string[];
  category_slugs: string[]; thumbnail?: string;
}

/** Roadmap topic (leaf in a section) */
export interface HKRoadmapTopic { name: string; description?: string; level: number; }
/** Roadmap section (group of topics under a "# Header") */
export interface HKRoadmapSection { title: string; topics: HKRoadmapTopic[]; }

export interface HKRoadmap {
  id: number; slug: string; title: string; excerpt: string;
  career?: string | null;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
  hours_estimated?: number;
  requirements: string[];
  outcomes: string[];
  sections: HKRoadmapSection[];
  thumbnail?: string | null;
  date_published?: string;
}

export interface HKRelease {
  id: number | string; slug: string; title: string;
  summary?: string;
  excerpt?: string;
  content_html?: string;
  release_date: string;
  date_published?: string;
  type: string;
  type_label?: string;
  source_url?: string;
  cta_url?: string;
  cta_label?: string;
  image?: string | null;
  cover?: string | null;
  tags?: string[];
  /** "HackKnow" for curated, "TechCrunch" / "DEV.to" / etc for live RSS */
  rss_source?: string;
  rss_source_key?: string;
  rss_color?: string;
}

export interface HKNewsAllResp { items: HKRelease[]; total: number; curated: number; live: number; }
export interface HKNewsFeedResp { items: HKRelease[]; total: number; sources: { key: string; name: string; color: string }[]; cached_for_seconds: number; }

export interface HKVerifyMe {
  status: 'none' | 'pending' | 'approved' | 'rejected';
  type?: 'mis' | 'student' | null;
  proof_type?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  verified_until?: string | null;
}

/* ── Fetch helpers ─────────────────────────────────────────── */
async function getRaw(path: string): Promise<unknown> {
  const r = await fetch(`${WP_REST_BASE}${path}`, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
}
/**
 * Backend list endpoints return either a bare JSON array OR `{ items: [...] }`.
 * This helper normalises both shapes and applies an optional per-item adapter
 * to bridge field-name drift between WP plugin output and frontend types.
 */
async function getList<T>(path: string, mapItem?: (raw: unknown) => T): Promise<HKListResp<T>> {
  const raw = await getRaw(path);
  const arr: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { items?: unknown[] })?.items)
      ? ((raw as { items: unknown[] }).items)
      : [];
  const items = (mapItem ? arr.map(mapItem) : (arr as T[]));
  const total = (raw && typeof (raw as { total?: number }).total === 'number')
    ? (raw as { total: number }).total
    : items.length;
  return { items, total };
}

/* ── Per-resource adapters (tolerate field-name drift between WP plugin & FE types) ─── */
type Bag = Record<string, unknown>;
const asArr = <X = unknown>(v: unknown): X[] => (Array.isArray(v) ? (v as X[]) : []);
const asStr = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

function adaptCategory(r: unknown): HKCategory {
  const o = (r ?? {}) as Bag;
  return {
    id: Number(o.id ?? 0),
    slug: asStr(o.slug),
    name: asStr(o.name),
    parent: Number(o.parent ?? 0),
    description: asStr(o.description),
    count: Number(o.count ?? 0),
  };
}

function adaptCourse(r: unknown): HKCourse {
  const o = (r ?? {}) as Bag;
  const durationStr = asStr(o.duration)
    || (o.duration_hours ? `${o.duration_hours}h` : '');
  const priceStr = asStr(o.price)
    || (o.price_rs && Number(o.price_rs) > 0 ? `₹${o.price_rs}` : (o.price_rs === 0 ? 'Free' : ''));
  const categorySlugs: string[] = Array.isArray(o.category_slugs)
    ? (o.category_slugs as string[])
    : asArr<Bag>(o.categories).map(c => asStr((c as Bag).slug)).filter(Boolean);
  return {
    id: Number(o.id ?? 0),
    slug: asStr(o.slug),
    title: asStr(o.title),
    excerpt: asStr(o.excerpt),
    content: typeof o.content === 'string' ? o.content : undefined,
    level: asStr(o.level),
    duration: durationStr,
    price: priceStr,
    chapters: asArr(o.chapters) as HKCourse['chapters'],
    requirements: asArr<string>(o.requirements),
    outcomes: asArr<string>(o.outcomes),
    tools: asArr<string>(o.tools),
    category_slugs: categorySlugs,
    thumbnail: typeof o.thumbnail === 'string' ? o.thumbnail : undefined,
  };
}

function adaptRoadmap(r: unknown): HKRoadmap {
  const o = (r ?? {}) as Bag;
  const career = (o.career ?? o.career_outcome) as string | null | undefined;
  const hours = Number(o.hours_estimated ?? o.estimated_hours ?? 0) || 0;
  const diff = o.difficulty as HKRoadmap['difficulty'] | undefined;
  return {
    id: Number(o.id ?? 0),
    slug: asStr(o.slug),
    title: asStr(o.title),
    excerpt: asStr(o.excerpt),
    career: career || null,
    difficulty: diff || null,
    hours_estimated: hours,
    requirements: asArr<string>(o.requirements),
    outcomes: asArr<string>(o.outcomes),
    sections: asArr(o.sections) as HKRoadmap['sections'],
    thumbnail: (typeof o.thumbnail === 'string' ? o.thumbnail : null),
    date_published: typeof o.date_published === 'string' ? o.date_published : undefined,
  };
}

function adaptRelease(r: unknown): HKRelease {
  const o = (r ?? {}) as Bag;
  return {
    id: (typeof o.id === 'number' || typeof o.id === 'string') ? o.id : 0,
    slug: asStr(o.slug),
    title: asStr(o.title),
    summary: asStr(o.summary || o.excerpt),
    content_html: asStr(o.content_html || o.content),
    release_date: asStr(o.release_date || o.date_published),
    date_published: typeof o.date_published === 'string' ? o.date_published : undefined,
    type: asStr(o.type || o.release_type),
    source_url: asStr(o.source_url),
    image: (typeof o.image === 'string' ? o.image : null),
    tags: asArr<string>(o.tags),
    rss_source: asStr(o.rss_source) || 'HackKnow',
    rss_source_key: asStr(o.rss_source_key) || 'curated',
    rss_color: typeof o.rss_color === 'string' ? o.rss_color : undefined,
  };
}
async function authPost<T>(path: string, body: unknown): Promise<T> {
  const tok = getAuthToken();
  const r = await fetch(`${WP_REST_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json',
               Authorization: tok ? `Bearer ${tok}` : '' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${path} → ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
async function authGet<T>(path: string): Promise<T> {
  const tok = getAuthToken();
  const r = await fetch(`${WP_REST_BASE}${path}`, {
    headers: { Accept: 'application/json', Authorization: tok ? `Bearer ${tok}` : '' },
  });
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
}

/* ── Public APIs ───────────────────────────────────────────── */
export const fetchCourseCategories = () => getList<HKCategory>('/course-categories', adaptCategory);
export const fetchCourses = (cat?: string) =>
  getList<HKCourse>(`/courses${cat ? `?category=${encodeURIComponent(cat)}` : ''}`, adaptCourse);
export const fetchCourse = async (slug: string): Promise<HKCourse> =>
  adaptCourse(await getRaw(`/courses/${slug}`));

export const fetchRoadmaps = () => getList<HKRoadmap>('/roadmaps', adaptRoadmap);
export const fetchRoadmap  = async (slug: string): Promise<HKRoadmap> =>
  adaptRoadmap(await getRaw(`/roadmaps/${slug}`));

export const fetchReleases = (type?: string) =>
  getList<HKRelease>(`/releases${type ? `?type=${encodeURIComponent(type)}` : ''}`, adaptRelease);
export const fetchReleaseTypes = () =>
  getList<{ slug: string; name: string; count: number }>('/release-types');

/** Live RSS only (TechCrunch + The Verge + dev.to + Hacker News + GitHub Blog).
 *  Backend route `/news/feed` may not be registered yet — degrade to empty feed
 *  rather than throwing so the page still renders. */
export const fetchLiveNews = async (source: string = 'all', limit = 30): Promise<HKNewsFeedResp> => {
  try {
    const raw = await getRaw(`/news/feed?source=${encodeURIComponent(source)}&limit=${limit}`);
    if (raw && Array.isArray((raw as HKNewsFeedResp).items)) {
      const r = raw as HKNewsFeedResp;
      return { ...r, items: r.items.map(adaptRelease) };
    }
    if (Array.isArray(raw)) {
      const items = (raw as unknown[]).slice(0, limit).map(adaptRelease);
      return { items, total: items.length, sources: [], cached_for_seconds: 0 };
    }
  } catch (_) { /* fall through to empty */ }
  return { items: [], total: 0, sources: [], cached_for_seconds: 0 };
};

/** Admin-curated releases + live RSS, merged + sorted by date.
 *  Backend route `/news/all` may not be registered — fall back to `/releases`
 *  (admin-curated only) so users still see news instead of an error page. */
export const fetchAllNews = async (limit = 50): Promise<HKNewsAllResp> => {
  // Preferred path: always run items through adaptRelease so future field-name
  // drift on the WP plugin can't reach the page rendering layer.
  try {
    const raw = await getRaw(`/news/all?limit=${limit}`);
    if (raw && Array.isArray((raw as HKNewsAllResp).items)) {
      const r = raw as HKNewsAllResp;
      return { ...r, items: r.items.map(adaptRelease) };
    }
    if (Array.isArray(raw)) {
      const items = (raw as unknown[]).slice(0, limit).map(adaptRelease);
      return { items, total: items.length, curated: items.length, live: 0 };
    }
  } catch (_) { /* fall back below */ }

  // Fallback: curated-only via /releases
  const list = await getList<HKRelease>('/releases', adaptRelease);
  const items = list.items
    .slice()
    .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
    .slice(0, limit);
  return { items, total: items.length, curated: items.length, live: 0 };
};

export const fetchVerifyStatus = () => authGet<HKVerifyMe>('/verify/me');
export const submitVerify = async (body: {
  type: 'mis' | 'student';
  proof_type: 'linkedin' | 'id' | 'email' | 'other';
  proof_url?: string;
  proof_image_base64?: string;
  notes?: string;
}): Promise<{ ok: boolean; status: string; message?: string }> => {
  // NOTE: must NOT hit /wp-json/hackknow/v1/verify — that route is the
  // Razorpay payment-signature callback. We have a dedicated, anonymous
  // endpoint at /wp-json/hk/v1/get-verified (zz-hk-get-verified.php).
  const r = await fetch(`${API_BASE}/wp-json/hk/v1/get-verified`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { const j = await r.json(); if (j && j.message) msg = String(j.message); } catch { /* ignore */ }
    throw new Error(msg);
  }
  return r.json();
};
