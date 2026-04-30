import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, ExternalLink, Loader2, Newspaper } from 'lucide-react';
import { fetchReleases, fetchReleaseTypes, type HKRelease } from '@/lib/hk-content';

const TYPE_COLOR: Record<string, string> = {
  'tool-launch':  'bg-hack-yellow text-hack-black',
  'ai-update':    'bg-purple-100 text-purple-900',
  'championship': 'bg-orange-100 text-orange-900',
  'form-deadline':'bg-red-100 text-red-900',
  'conference':   'bg-blue-100 text-blue-900',
  'announcement': 'bg-emerald-100 text-emerald-900',
};

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
  const [items, setItems] = useState<HKRelease[]>([]);
  const [types, setTypes] = useState<{ slug: string; name: string; count: number }[]>([]);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const [r, t] = await Promise.all([fetchReleases(activeType ?? undefined), fetchReleaseTypes()]);
        if (alive) { setItems(r.items); setTypes(t.items); }
      } catch (e) { if (alive) setErr((e as Error).message); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [activeType]);

  const grouped = useMemo(() => {
    const m = new Map<string, HKRelease[]>();
    for (const it of items) {
      const k = monthKey(it.release_date);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return Array.from(m.entries());
  }, [items]);

  return (
    <div className="min-h-screen bg-[#fffbea]">
      <div className="bg-hack-black text-white py-12 lg:py-16">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <Link to="/" className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange mb-5 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-hack-yellow/15 border border-hack-yellow/30 text-hack-yellow text-xs font-mono uppercase tracking-widest rounded-full mb-4">
              <Newspaper className="w-3.5 h-3.5" /> Netflix-style release calendar
            </div>
            <h1 className="font-display font-bold text-4xl lg:text-6xl mb-3">Hacked News</h1>
            <p className="text-white/60 text-base max-w-2xl mb-6">
              New tools, AI updates, championship dates, form deadlines — sab ek jagah, date-wise.
              No twitter doomscroll required.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveType(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider border-[2px] ${activeType === null ? 'bg-hack-yellow text-hack-black border-white' : 'bg-transparent text-white/70 border-white/20 hover:border-white/40'}`}>
                All
              </button>
              {types.map(t => (
                <button key={t.slug} onClick={() => setActiveType(t.slug)}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider border-[2px] ${activeType === t.slug ? 'bg-hack-yellow text-hack-black border-white' : 'bg-transparent text-white/70 border-white/20 hover:border-white/40'}`}>
                  {t.name}{t.count > 0 ? ` · ${t.count}` : ''}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-hack-black/60"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : err ? (
            <div className="bg-red-50 border-[2px] border-red-200 text-red-700 rounded-xl p-4 text-sm">{err}</div>
          ) : items.length === 0 ? (
            <div className="bg-white border-[2px] border-dashed border-hack-black/30 rounded-2xl p-10 text-center text-hack-black/55 text-sm">
              No releases yet{activeType ? ' for this filter' : ''}. Check back soon.
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
                    {list.map(it => (
                      <a key={it.id} href={it.source_url || '#'} target={it.source_url ? '_blank' : undefined} rel="noopener noreferrer"
                        className="bg-white border-[3px] border-hack-black rounded-2xl p-5 shadow-[5px_5px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition flex flex-col">
                        {it.image && (
                          <div className="aspect-video mb-3 -mx-5 -mt-5 overflow-hidden border-b-[3px] border-hack-black bg-hack-yellow/30">
                            <img src={it.image} alt={it.title} loading="lazy" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {it.release_type && (
                            <span className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded border border-hack-black ${TYPE_COLOR[it.release_type] || 'bg-white text-hack-black'}`}>
                              {it.release_type.replace(/-/g, ' ')}
                            </span>
                          )}
                          {it.release_date && <span className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded bg-hack-black text-hack-yellow">{fmt(it.release_date)}</span>}
                        </div>
                        <h3 className="font-display font-bold text-lg leading-tight mb-2">{it.title}</h3>
                        <p className="text-hack-black/65 text-sm line-clamp-3 flex-grow">{it.excerpt}</p>
                        {it.source_url && (
                          <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold">
                            Open source <ExternalLink className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </a>
                    ))}
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
