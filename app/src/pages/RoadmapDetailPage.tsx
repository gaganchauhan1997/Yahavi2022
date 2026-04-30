import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Check, ChevronDown, ChevronRight, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { fetchRoadmap, type HKRoadmap } from '@/lib/hk-content';

export default function RoadmapDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [rm, setRm] = useState<HKRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetchRoadmap(slug);
        if (alive) {
          setRm(r);
          // Open first 3 steps by default for instant context
          setOpen(Object.fromEntries((r.nodes || []).slice(0, 3).map(n => [n.id, true])));
        }
      } catch (e) { if (alive) setErr((e as Error).message); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#fffbea]"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (err || !rm) return (
    <div className="min-h-screen bg-[#fffbea] py-20 px-4 text-center">
      <p className="text-hack-black/65 mb-4">{err || 'Roadmap not found.'}</p>
      <Link to="/roadmaps" className="text-hack-black underline">← Back to Roadmaps</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fffbea]">
      {/* HERO */}
      <div className="bg-hack-black text-white py-12 lg:py-16">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Link to="/roadmaps" className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange mb-5 text-sm">
              <ArrowLeft className="w-4 h-4" /> All Roadmaps
            </Link>
            <h1 className="font-display font-bold text-3xl lg:text-5xl mb-4">{rm.title}</h1>
            <p className="text-white/70 text-base mb-4">{rm.excerpt}</p>
            <div className="flex flex-wrap gap-2 text-xs font-mono uppercase tracking-wider">
              {rm.career_outcome && <span className="inline-flex items-center gap-1 px-3 py-1 bg-hack-yellow text-hack-black border-[2px] border-white rounded-full"><Briefcase className="w-3 h-3" />{rm.career_outcome}</span>}
              {rm.total_hours && <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 text-white border border-white/20 rounded-full"><Clock className="w-3 h-3" />{rm.total_hours}</span>}
              {rm.nodes?.length > 0 && <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 text-white border border-white/20 rounded-full">{rm.nodes.length} steps</span>}
            </div>
          </div>
        </div>
      </div>

      {/* TIMELINE NODES */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          {rm.requirements?.length > 0 && (
            <div className="mb-8 bg-white border-[3px] border-hack-black rounded-2xl p-5 shadow-[5px_5px_0_#000]">
              <h3 className="font-display font-bold text-lg mb-2">Before you start</h3>
              <ul className="space-y-1.5 text-sm text-hack-black/75">
                {rm.requirements.map((r, i) => <li key={i} className="flex gap-2"><Check className="w-3.5 h-3.5 text-hack-yellow mt-1 shrink-0" /> {r}</li>)}
              </ul>
            </div>
          )}

          {rm.nodes?.length === 0 ? (
            <div className="bg-white border-[2px] border-dashed border-hack-black/30 rounded-2xl p-10 text-center text-hack-black/55 text-sm">
              No steps published yet.
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-10">
              <div className="absolute left-2 sm:left-4 top-0 bottom-0 w-[3px] bg-hack-black" />
              {rm.nodes.map((n, i) => {
                const isOpen = !!open[n.id];
                return (
                  <div key={n.id} className="relative mb-5">
                    <div className="absolute -left-6 sm:-left-10 top-3 w-9 h-9 sm:w-11 sm:h-11 bg-hack-yellow border-[3px] border-hack-black rounded-full flex items-center justify-center font-display font-bold text-sm shadow-[3px_3px_0_#000]">
                      {i + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(o => ({ ...o, [n.id]: !o[n.id] }))}
                      className="w-full text-left bg-white border-[3px] border-hack-black rounded-2xl p-5 shadow-[5px_5px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-display font-bold text-lg leading-tight">{n.title}</div>
                        {isOpen ? <ChevronDown className="w-5 h-5 shrink-0 mt-0.5" /> : <ChevronRight className="w-5 h-5 shrink-0 mt-0.5" />}
                      </div>
                      {isOpen && (
                        <div className="mt-4 space-y-3">
                          {n.topics && n.topics.length > 0 && (
                            <div>
                              <p className="text-xs font-mono uppercase tracking-wider text-hack-black/55 mb-2">Topics</p>
                              <div className="flex flex-wrap gap-2">
                                {n.topics.map((t, j) => <span key={j} className="px-2 py-1 bg-hack-black text-hack-yellow text-xs font-mono rounded">{t}</span>)}
                              </div>
                            </div>
                          )}
                          {n.resources && n.resources.length > 0 && (
                            <div>
                              <p className="text-xs font-mono uppercase tracking-wider text-hack-black/55 mb-2">Resources</p>
                              <ul className="space-y-1">
                                {n.resources.map((r, j) => (
                                  <li key={j}>
                                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-sm text-hack-black underline decoration-hack-yellow decoration-2 underline-offset-2 hover:text-hack-orange">
                                      {r.label} <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
