/**
 * HackKnow custom CPT fetchers — Courses, Roadmaps, Hacked News, Live RSS, Verify.
 * All endpoints live under /wp-json/hackknow/v1/* on shop.hackknow.com,
 * proxied through www.hackknow.com via nginx.
 */
import { WP_REST_BASE } from './api-base';
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
  content_html?: string;
  release_date: string;
  date_published?: string;
  type: string;
  source_url?: string;
  image?: string | null;
  tags: string[];
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
async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${WP_REST_BASE}${path}`, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
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
export const fetchCourseCategories = () => get<HKListResp<HKCategory>>('/course-categories');
export const fetchCourses = (cat?: string) =>
  get<HKListResp<HKCourse>>(`/courses${cat ? `?category=${encodeURIComponent(cat)}` : ''}`);
export const fetchCourse = (slug: string) => get<HKCourse>(`/courses/${slug}`);

export const fetchRoadmaps = () => get<HKListResp<HKRoadmap>>('/roadmaps');
export const fetchRoadmap  = (slug: string) => get<HKRoadmap>(`/roadmaps/${slug}`);

export const fetchReleases = (type?: string) =>
  get<HKListResp<HKRelease>>(`/releases${type ? `?type=${encodeURIComponent(type)}` : ''}`);
export const fetchReleaseTypes = () => get<HKListResp<{ slug: string; name: string; count: number }>>('/release-types');

/** Live RSS only (TechCrunch + The Verge + dev.to + Hacker News + GitHub Blog) */
export const fetchLiveNews = (source: string = 'all', limit = 30) =>
  get<HKNewsFeedResp>(`/news/feed?source=${encodeURIComponent(source)}&limit=${limit}`);

/** Admin-curated releases + live RSS, merged + sorted by date */
export const fetchAllNews = (limit = 50) =>
  get<HKNewsAllResp>(`/news/all?limit=${limit}`);

export const fetchVerifyStatus = () => authGet<HKVerifyMe>('/verify/me');
export const submitVerify = (body: {
  type: 'mis' | 'student';
  proof_type: 'linkedin' | 'id' | 'email' | 'other';
  proof_url?: string;
  proof_image?: string;
  notes?: string;
}) => authPost<{ ok: boolean; status: string }>('/verify', body);
