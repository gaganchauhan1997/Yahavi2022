import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, ExternalLink, Loader2, Newspaper, Radio, RefreshCcw, Wifi } from 'lucide-react';
import { fetchAllNews, type HKRelease } from '@/lib/hk-content';
import {
  fetchFrontendNews,
  FRONTEND_SOURCES,
  groupCitations,
  type CitedRelease,
} from '@/lib/hk-rss';

import { useDocumentMeta } from '@/lib/useDocumentMeta';

const TYPE_COLOR: Record<string, string> = {
  'tool-release':  'bg-hack-yellow text-hack-black',
  'tool-launch':   'bg-hack-yellow text-hack-black',
  'ai-update':     'bg-purple-100 text-purple-900',
  'championship':  'bg-orange-100 text-orange-900',
  'hackathon':     'bg-orange-100 text-orange-900',
  'form-deadline': 'bg-red-100 text-red-900',
  'conference':    'bg-blue-100 text-blue-900',
  'announcement':  'bg-emerald-100 text-emerald-900',
  'rss':           'bg-slate-100 text-slate-800',
};

const SOURCE_FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'curated',   label: 'HackKnow Picks' },
  { key: 'live',      label: 'Live RSS' },
  { key: 'ai',        label: 'AI' },
  { key: 'tech',      label: 'Tech' },
  { key: 'dev',       label: 'Dev' },
  { key: 'security',  label: 'Security' },
  { key: 'startup',   label: 'Startup' },
  { key: 'business',  label: 'Business' },
  { key: 'design',    label: 'Design' },
];

const FRONTEND_KEY_TO_CAT = new Map(FRONTEND_SOURCES.map(s => [s.key, s.category]));

/** Auto-refresh interval — 5 minutes (only fires when tab is visible). */
const AUTO_REFRESH_MS = 5 * 60 * 1000;

function fmt(d: string): string {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function monthKey(d: string): string {
  if (!d) return 'Unknown';
  try { return new Date(d).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); }
  catch { return 'Unknown'; }
}

export default function HackedNewsPage() {
  useDocumentMeta({
    title: 'Hacked News – Latest AI & Tech Releases | Hackknow',
    description: 'Live tech & AI news from TechCrunch, The Verge, GitHub Blog, Hugging Face, MIT Tech Review and 60+ more — auto-refreshed and grouped by story so you see every citation in one place.',
  });

  const [items, setItems]     = useState<CitedRelease[]>([]);
  const [counts, setCounts]   = useState<{ curated: number; live: number; total: number }>({ curated: 0, live: 0, total: 0 });
  const [health, setHealth]   = useState<{ ok: number; total: number; lastRefreshed: number }>({ ok: 0, total: 0, lastRefreshed: 0 });
  const [filter, setFilter]   = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr]         = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Refs for cross-effect coordination without re-binding listeners.
  const lastRefreshedRef = useRef(0);     // mirrors health.lastRefreshed for the visibility handler
  const reqIdRef         = useRef(0);     // monotonically-increasing fetch id (latest-wins)

  // ── Fetch (initial + on refreshKey bump) ────────────────────────────
  useEffect(() => {
    let alive = true;
    const myReqId = ++reqIdRef.current;
    (async () => {
      // Distinguish first load (full splash) from background refresh (silent).
      if (items.length === 0) setLoading(true); else setRefreshing(true);
      setErr(null);
      try {
        // Fan out: backend curated + 60+ frontend RSS feeds in parallel.
        const [backend, frontend] = await Promise.all([
          fetchAllNews(60).catch(() => ({ items: [] as HKRelease[], total: 0, curated: 0, live: 0 })),
          fetchFrontendNews({ perFeed: 3, limit: 240, perFeedTimeoutMs: 6000 })
            .catch(() => ({ items: [] as HKRelease[], liveCount: 0, totalCount: 0, perSource: [] })),
        ]);

        // Latest-wins: if another refresh started while we were awaiting,
        // discard our results entirely (no half-state, no flash).
        if (!alive || myReqId !== reqIdRef.current) return;

        // De-dupe identical links/titles, then group near-identical stories.
        const seen = new Set<string>();
        const merged: HKRelease[] = [];
        for (const it of [...backend.items, ...frontend.items]) {
          const k = ((it.source_url || it.cta_url || '') + '|' + (it.title || '')).toLowerCase().trim();
          if (k && seen.has(k)) continue;
          if (k) seen.add(k);
          merged.push(it);
        }
        merged.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
        const grouped = groupCitations(merged);

        if (!alive || myReqId !== reqIdRef.current) return;
        setItems(grouped);
        setCounts({
          curated: backend.curated || backend.items.length,
          live:    (backend.live || 0) + frontend.items.length,
          total:   grouped.length,
        });
        const now = Date.now();
        setHealth({ ok: frontend.liveCount, total: frontend.totalCount, lastRefreshed: now });
        lastRefreshedRef.current = now;
      } catch (e) { if (alive && myReqId === reqIdRef.current) setErr((e as Error).message); }
      finally { if (alive && myReqId === reqIdRef.current) { setLoading(false); setRefreshing(false); } }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // ── Auto-refresh every 5 minutes (only when tab is visible) ─────────
  // Empty deps: handler reads `lastRefreshedRef.current` so it never goes stale.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        setRefreshKey(k => k + 1);
      }
    }, AUTO_REFRESH_MS);
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      // First-ever focus before any fetch finished → don't double-fire.
      if (lastRefreshedRef.current === 0) return;
      if (Date.now() - lastRefreshedRef.current > 2 * 60 * 1000) {
        setRefreshKey(k => k + 1);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all')     return items;
    if (filter === 'curated') return items.filter(it => it.rss_source_key === 'curated' || !it.rss_source_key);
    if (filter === 'live')    return items.filter(it => it.rss_source_key && it.rss_source_key !== 'curated');
    const want = filter;
    return items.filter(it => {
      const cat = it.rss_source_key ? FRONTEND_KEY_TO_CAT.get(it.rss_source_key) : undefined;
      return cat === want;
    });
  }, [filter, items]);

  const grouped = useMemo(() => {
    const m = new Map<string, CitedRelease[]>();
    for (const it of filtered) {
      const k = monthKey(it.release_date);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return Array.from(m.entries());
  }, [filtered]);

  const lastRefreshLabel = health.lastRefreshed
    ? new Date(health.lastRefreshed).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className="min-h-screen bg-[#fffbea]">
      <div className="bg-hack-black text-white py-12 lg:py-16">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <Link to="/" className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange mb-5 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-hack-yellow/15 border border-hack-yellow/30 text-hack-yellow text-xs font-mono uppercase tracking-widest rounded-full mb-4">
              <Newspaper className="w-3.5 h-3.5" /> Live tech news + curated picks
            </div>
            <h1 className="font-display font-bold text-4xl lg:text-6xl mb-3">Hacked News</h1>
            <p className="text-white/60 text-base max-w-2xl mb-4">
              All your tech &amp; AI news in one place — TechCrunch, The Verge, dev.to, Hacker News, GitHub Blog
              and 60+ more, sorted by date and grouped so you can see every citation per story.
              Plus HackKnow&rsquo;s curated picks (championships, form deadlines, AI updates).
              Auto-refreshes every 5 minutes — no doomscroll required.
            </p>

            {/* Source health row */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-white/55 mb-5">
              <span className="inline-flex items-center gap-1.5">
                <Wifi className={`w-3.5 h-3.5 ${health.ok > 0 ? 'text-emerald-400' : 'text-white/30'}`} />
                {health.ok} / {health.total} sources live
              </span>
              <span>·</span>
              <span>last refresh {lastRefreshLabel}</span>
              {refreshing && <span className="inline-flex items-center gap-1 text-hack-yellow"><Loader2 className="w-3 h-3 animate-spin" /> refreshing…</span>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {SOURCE_FILTERS.map(s => {
                const active = filter === s.key;
                const count = s.key === 'all' ? counts.total : s.key === 'curated' ? counts.curated : counts.live;
                return (
                  <button key={s.key} onClick={() => setFilter(s.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider border-[2px] inline-flex items-center gap-1.5 ${active ? 'bg-hack-yellow text-hack-black border-white' : 'bg-transparent text-white/70 border-white/20 hover:border-white/40'}`}>
                    {s.key === 'live' && <Radio className="w-3 h-3" />}
                    {s.label}
                    {!loading && <span className="opacity-70">· {count}</span>}
                  </button>
                );
              })}
              <button onClick={() => setRefreshKey(k => k + 1)} disabled={loading || refreshing}
                title="Force refresh feeds now"
                className="ml-2 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider border-[2px] border-white/20 text-white/70 hover:border-white/40 inline-flex items-center gap-1.5 disabled:opacity-40">
                <RefreshCcw className={`w-3 h-3 ${(loading || refreshing) ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          {loading && items.length === 0 ? (
            <div className="flex items-center gap-2 text-hack-black/60"><Loader2 className="w-4 h-4 animate-spin" /> Loading live feeds…</div>
          ) : err ? (
            <div className="bg-red-50 border-[2px] border-red-200 text-red-700 rounded-xl p-4 text-sm">{err}</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border-[2px] border-dashed border-hack-black/30 rounded-2xl p-10 text-center text-hack-black/55 text-sm">
              No items for this filter yet.
            </div>
          ) : (
            <div className="space-y-10">
              {grouped.map(([month, list]) => (
                <div key={month}>
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-5 h-5 text-hack-black" />
                    <h2 className="font-display font-bold text-2xl">{month}</h2>
                    <span className="text-xs font-mono text-hack-black/50">{list.length} {list.length === 1 ? 'item' : 'items'}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map(it => {
                      const isCurated = it.rss_source_key === 'curated' || !it.rss_source_key;
                      const href = it.source_url || it.cta_url || '';
                      return (
                        <article key={it.id}
                          className="bg-white border-[3px] border-hack-black rounded-2xl p-5 shadow-[5px_5px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition flex flex-col">
                          <a href={href || '#'} target={href ? '_blank' : undefined} rel="noopener noreferrer"
                            className="flex flex-col flex-grow no-underline text-inherit"
                            onClick={(e) => { if (!href) e.preventDefault(); }}>
                            {it.image && (
                              <div className="aspect-video mb-3 -mx-5 -mt-5 overflow-hidden border-b-[3px] border-hack-black bg-hack-yellow/30">
                                <img src={it.image} alt={it.title} loading="lazy" className="w-full h-full object-cover"
                                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {it.rss_source && (
                                <span className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded border border-hack-black"
                                      style={{ background: it.rss_color || (isCurated ? '#FFCB05' : '#fff'), color: isCurated ? '#000' : '#fff' }}>
                                  {isCurated ? '★ ' : ''}{it.rss_source}
                                </span>
                              )}
                              {it.type && it.type !== 'rss' && (
                                <span className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded border border-hack-black ${TYPE_COLOR[it.type] || 'bg-white text-hack-black'}`}>
                                  {it.type.replace(/-/g, ' ')}
                                </span>
                              )}
                              {it.release_date && (
                                <span className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded bg-hack-black text-hack-yellow">
                                  {fmt(it.release_date)}
                                </span>
                              )}
                            </div>
                            <h3 className="font-display font-bold text-lg leading-tight mb-2">{it.title}</h3>
                            <p className="text-hack-black/65 text-sm line-clamp-3 flex-grow">{it.summary}</p>
                            {href && (
                              <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold">
                                Read full <ExternalLink className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </a>

                          {/* Multiple-citation strip */}
                          {it.citations && it.citations.length > 0 && (
                            <div className="mt-3 pt-3 border-t-2 border-dashed border-hack-black/15">
                              <div className="text-[10px] font-mono uppercase tracking-wider text-hack-black/50 mb-2">
                                Also covered by · {it.citations.length}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {it.citations.slice(0, 6).map((c, i) => (
                                  <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                                    className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded border border-hack-black hover:bg-hack-yellow/40 transition"
                                    style={{ background: c.color ? `${c.color}22` : '#fff' }}>
                                    {c.source}
                                  </a>
                                ))}
                                {it.citations.length > 6 && (
                                  <span className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded bg-hack-black/5 text-hack-black/60">
                                    +{it.citations.length - 6} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
