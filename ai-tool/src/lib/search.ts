/**
 * Web search for citations. BYOK — Tavily / Brave / Serper.
 * Falls back to "none" → LLM-only knowledge with authority-domain instructions.
 */

import type { Keys } from './keys';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  source?: string;
}

async function searchTavily(query: string, key: string, n = 6): Promise<SearchResult[]> {
  const r = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: 'advanced',
      max_results: n,
      include_answer: false,
    }),
  });
  if (!r.ok) throw new Error(`Tavily ${r.status}`);
  const d = await r.json();
  return (d.results || []).map((x: { title: string; url: string; content: string; published_date?: string }) => ({
    title: x.title,
    url: x.url,
    snippet: (x.content || '').slice(0, 280),
    publishedDate: x.published_date,
    source: new URL(x.url).hostname.replace(/^www\./, ''),
  }));
}

async function searchBrave(query: string, key: string, n = 6): Promise<SearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${n}`;
  const r = await fetch(url, { headers: { 'X-Subscription-Token': key, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`Brave ${r.status}`);
  const d = await r.json();
  return (d.web?.results || []).map((x: { title: string; url: string; description: string; age?: string }) => ({
    title: x.title,
    url: x.url,
    snippet: (x.description || '').slice(0, 280),
    publishedDate: x.age,
    source: new URL(x.url).hostname.replace(/^www\./, ''),
  }));
}

async function searchSerper(query: string, key: string, n = 6): Promise<SearchResult[]> {
  const r = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: n }),
  });
  if (!r.ok) throw new Error(`Serper ${r.status}`);
  const d = await r.json();
  return (d.organic || []).map((x: { title: string; link: string; snippet: string; date?: string }) => ({
    title: x.title,
    url: x.link,
    snippet: x.snippet,
    publishedDate: x.date,
    source: new URL(x.link).hostname.replace(/^www\./, ''),
  }));
}

export async function searchWeb(query: string, keys: Keys, n = 6): Promise<SearchResult[]> {
  const order = keys.preferredSearch && keys.preferredSearch !== 'none'
    ? [keys.preferredSearch, 'tavily', 'brave', 'serper']
    : ['tavily', 'brave', 'serper'];
  const tried = new Set<string>();
  for (const p of order) {
    if (tried.has(p)) continue;
    tried.add(p);
    try {
      if (p === 'tavily' && keys.tavily) return await searchTavily(query, keys.tavily, n);
      if (p === 'brave' && keys.brave) return await searchBrave(query, keys.brave, n);
      if (p === 'serper' && keys.serper) return await searchSerper(query, keys.serper, n);
    } catch (e) {
      // try next
    }
  }
  return [];
}

export function citationsBlock(results: SearchResult[]): string {
  if (!results.length) return '';
  return results.map((r, i) =>
    `[${i + 1}] ${r.title} — ${r.source || r.url}\n    URL: ${r.url}\n    ${r.snippet}`
  ).join('\n\n');
}
