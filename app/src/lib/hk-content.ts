/**
 * HackKnow custom CPT fetchers — Courses, Roadmaps, Hacked News, Verify.
 * All endpoints live under /wp-json/hackknow/v1/* on shop.hackknow.com,
 * proxied through www.hackknow.com via nginx.
 */
import { WP_REST_BASE } from './api-base';
import { getAuthToken } from './auth-token';

/* ── Types ─────────────────────────────────────────────────── */
export interface HKCategory  { id: number; slug: string; name: string; parent: number; description: string; count: number; }
export interface HKListResp<T> { items: T[]; total: number; total_pages: number; page: number; }

export interface HKCourse {
  id: number; slug: string; title: string; excerpt: string; content?: string;
  level: string; duration: string; price: string;
  chapters: { title: string; duration?: string; lessons?: string[] }[];
  requirements: string[]; outcomes: string[]; tools: string[];
  category_slugs: string[]; thumbnail?: string;
}

export interface HKRoadmap {
  id: number; slug: string; title: string; excerpt: string;
  career_outcome: string; total_hours: string;
  nodes: { id: string; title: string; topics?: string[]; resources?: { label: string; url: string }[]; status?: string }[];
  edges: { from: string; to: string }[];
  requirements: string[]; thumbnail?: string;
}

export interface HKRelease {
  id: number; slug: string; title: string; excerpt: string;
  release_date: string; release_type: string; source_url: string;
  image?: string; tags: string[];
}

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

export const fetchVerifyStatus = () => authGet<HKVerifyMe>('/verify/me');
export const submitVerify = (body: {
  type: 'mis' | 'student';
  proof_type: 'linkedin' | 'id' | 'email' | 'other';
  proof_url?: string;
  proof_image?: string;   // base64 data URL
  notes?: string;
}) => authPost<{ ok: boolean; status: string }>('/verify', body);
