/**
 * Brainxercise REST helpers — talk to /wp-json/hackknow/v1/brainxercise on shop.hackknow.com.
 */
import { WP_REST_BASE } from './api-base';

export interface HKBrainxCard {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  time_limit: number;
  categories: string[];
  thumbnail?: string | null;
}

export interface HKBrainxSheetCells {
  [cellRef: string]: string | number | boolean | null;
}
export interface HKBrainxSheet {
  rows: number;
  cols: number;
  cells: HKBrainxSheetCells;
  headers?: boolean;
  freeze?: string;
}

export interface HKBrainxDetail {
  id: number;
  slug: string;
  title: string;
  description: string;
  question: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  time_limit: number;
  sheet: HKBrainxSheet;
  has_hint: boolean;
  categories: string[];
  thumbnail?: string | null;
}

export interface HKBrainxCheckResult {
  pass: boolean;
  correct: number;
  total: number;
  score: number;
  wrong: string[];
  hint?: string;
}

export interface HKBrainxCat {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface HKBrainxListResp {
  items: HKBrainxCard[];
  total: number;
  total_pages: number;
}

export async function fetchBrainxercises(opts: {
  cat?: string;
  difficulty?: string;
  page?: number;
  per_page?: number;
} = {}): Promise<HKBrainxListResp> {
  const qs = new URLSearchParams();
  if (opts.cat)        qs.set('cat', opts.cat);
  if (opts.difficulty) qs.set('difficulty', opts.difficulty);
  if (opts.page)       qs.set('page', String(opts.page));
  if (opts.per_page)   qs.set('per_page', String(opts.per_page));
  const r = await fetch(`${WP_REST_BASE}/brainxercise${qs.toString() ? `?${qs}` : ''}`, {
    headers: { Accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`Failed to load Brainxercises (${r.status})`);
  return r.json();
}

export async function fetchBrainxercise(slug: string): Promise<HKBrainxDetail> {
  const r = await fetch(`${WP_REST_BASE}/brainxercise/${encodeURIComponent(slug)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`Failed to load Brainxercise (${r.status})`);
  return r.json();
}

export async function checkBrainxercise(slug: string, cells: Record<string, string | number>): Promise<HKBrainxCheckResult> {
  const r = await fetch(`${WP_REST_BASE}/brainxercise/${encodeURIComponent(slug)}/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ cells }),
  });
  if (!r.ok) throw new Error(`Failed to check answer (${r.status})`);
  return r.json();
}

export async function fetchBrainxerciseCats(): Promise<HKBrainxCat[]> {
  const r = await fetch(`${WP_REST_BASE}/brainxercise-cats`, {
    headers: { Accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`Failed to load categories (${r.status})`);
  return r.json();
}

/* ── Cell helpers (Excel-style A1 ↔ {row,col}) ─────────────── */

export function cellRefToRC(ref: string): { r: number; c: number } | null {
  const m = /^([A-Za-z]+)(\d+)$/.exec(ref.trim());
  if (!m) return null;
  let col = 0;
  const letters = m[1].toUpperCase();
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return { r: parseInt(m[2], 10) - 1, c: col - 1 };
}

export function rcToCellRef(r: number, c: number): string {
  let n = c + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s + (r + 1);
}
