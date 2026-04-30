import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, ExternalLink, Loader2, Newspaper, Radio, RefreshCcw } from 'lucide-react';
import { fetchAllNews, type HKRelease } from '@/lib/hk-content';
import { fetchFrontendNews, FRONTEND_SOURCES } from '@/lib/hk-rss';

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
    title: "Hacked News – Latest AI & Tech Releases | Hackknow",
    description: "Live tech & AI news from TechCrunch, The Verge, GitHub Blog, Hugging Face, MIT Tech Review and more — curated for builders.",
  });
  const [items, setItems] = useState<HKRelease[]>([]);
  const [counts, setCounts] = useState<{ curated: number; live: number; total: number }>({ curated: 0, live: 0, total: 0 });
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        // Fan out: backend curated + 50+ frontend RSS feeds in parallel.
        const [backend, frontend] = await Promise.all([
          fetchAllNews(60).catch(() => ({ items: [] as HKRelease[], total: 0, curated: 0, live: 0 })),
          fetchFrontendNews({ perFeed: 3, limit: 200, timeoutMs: 9000 }).catch(() => [] as HKRelease[]),
        ]);
        // De-dupe by link/title
        const seen = new Set<string>();
        const merged: HKRelease[] = [];
        for (const it of [...backend.items, ...frontend]) {
          const k = (it.cta_url || it.title || '').toLowerCase().trim();
          if (k && seen.has(k)) continue;
          if (k) seen.add(k);
          merged.push(it);
        }
        merged.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
        if (alive) {
          setItems(merged);
          setCounts({
            curated: backend.curated || backend.items.length,
            live:    (backend.live || 0) + frontend.length,
            total:   merged.length,
          });
        }
      } catch (e) { if (alive) setErr((e as Error).message); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [refreshKey]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'curated') return items.filter(it => it.rss_source_key === 'curated' || !it.rss_source_key);
    if (filter === 'live')    return items.filter(it => it.rss_source_key && it.rss_source_key !== 'curated');
    // category-style filters (ai/tech/dev/...): match the rss_source_key against FRONTEND_SOURCES category
    const want = filter;
    return items.filter(it => {
      const cat = it.rss_source_key ? FRONTEND_KEY_TO_CAT.get(it.rss_source_key) : undefined;
      return cat === want;
    });
  }, [filter, items]);

  const grouped = useMemo(() => {
    const m = new Map<string, HKRelease[]>();
    for (const it of filtered) {
      const k = monthKey(it.release_date);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return Array.from(m.entries());
  }, [filtered]);

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
            <p className="text-white/60 text-base max-w-2xl mb-6">
              TechCrunch, The Verge, dev.to, Hacker News, GitHub Blog — sab ek jagah, date-wise.
              Plus HackKnow team ke curated picks (championships, form deadlines, AI updates).
              No twitter doomscroll required.
            </p>
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
              <button onClick={() => setRefreshKey(k => k + 1)} disabled={loading}
                title="Force refresh feeds"
                className="ml-2 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider border-[2px] border-white/20 text-white/70 hover:border-white/40 inline-flex items-center gap-1.5 disabled:opacity-40">
                <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
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
                      return (
                        <a key={it.id} href={it.source_url || '#'} target={it.source_url ? '_blank' : undefined} rel="noopener noreferrer"
                          className="bg-white border-[3px] border-hack-black rounded-2xl p-5 shadow-[5px_5px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition flex flex-col">
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
                          {it.source_url && (
                            <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold">
                              Read full <ExternalLink className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </a>
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
