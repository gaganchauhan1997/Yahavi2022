import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Check, ChevronDown, ChevronRight, Clock, Loader2, GraduationCap } from 'lucide-react';
import { fetchRoadmap, type HKRoadmap } from '@/lib/hk-content';

const DIFF_COLOR: Record<string, string> = {
  beginner:     'bg-emerald-200 text-emerald-900',
  intermediate: 'bg-orange-200 text-orange-900',
  advanced:     'bg-red-200 text-red-900',
};

export default function RoadmapDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [rm, setRm] = useState<HKRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const r = await fetchRoadmap(slug);
        if (!alive) return;
        setRm(r);
        // Open first 2 sections by default
        setOpen(Object.fromEntries((r.sections || []).slice(0, 2).map((_, i) => [i, true])));
      } catch (e) { if (alive) setErr((e as Error).message); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fffbea]">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
  if (err || !rm) return (
    <div className="min-h-screen bg-[#fffbea] py-20 px-4 text-center">
      <p className="text-hack-black/65 mb-4">{err || 'Roadmap not found.'}</p>
      <Link to="/roadmaps" className="text-hack-black underline">← Back to Roadmaps</Link>
    </div>
  );

  const totalTopics = (rm.sections || []).reduce((acc, s) => acc + (s.topics?.length || 0), 0);

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
            {rm.excerpt && <p className="text-white/70 text-base mb-4">{rm.excerpt}</p>}
            <div className="flex flex-wrap gap-2 text-xs font-mono uppercase tracking-wider">
              {rm.career && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-hack-yellow text-hack-black border-[2px] border-white rounded-full">
                  <Briefcase className="w-3 h-3" />{rm.career}
                </span>
              )}
              {rm.difficulty && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 border-[2px] border-white rounded-full ${DIFF_COLOR[rm.difficulty] || 'bg-white/10 text-white'}`}>
                  <GraduationCap className="w-3 h-3" />{rm.difficulty}
                </span>
              )}
              {!!rm.hours_estimated && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 text-white border border-white/20 rounded-full">
                  <Clock className="w-3 h-3" />{rm.hours_estimated}h
                </span>
              )}
              {totalTopics > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 text-white border border-white/20 rounded-full">
                  {totalTopics} topics
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          {/* PREREQ */}
          {rm.requirements?.length > 0 && (
            <div className="mb-6 bg-white border-[3px] border-hack-black rounded-2xl p-5 shadow-[5px_5px_0_#000]">
              <h3 className="font-display font-bold text-lg mb-2">Before you start</h3>
              <ul className="space-y-1.5 text-sm text-hack-black/75">
                {rm.requirements.map((r, i) => (
                  <li key={i} className="flex gap-2"><Check className="w-3.5 h-3.5 text-hack-yellow mt-1 shrink-0" /> {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* OUTCOMES */}
          {rm.outcomes?.length > 0 && (
            <div className="mb-8 bg-hack-yellow border-[3px] border-hack-black rounded-2xl p-5 shadow-[5px_5px_0_#000]">
              <h3 className="font-display font-bold text-lg mb-2">After completing this roadmap</h3>
              <ul className="space-y-1.5 text-sm text-hack-black">
                {rm.outcomes.map((o, i) => (
                  <li key={i} className="flex gap-2"><Check className="w-3.5 h-3.5 text-hack-black mt-1 shrink-0" /> {o}</li>
                ))}
              </ul>
            </div>
          )}

          {/* SECTIONS TIMELINE */}
          {(rm.sections?.length || 0) === 0 ? (
            <div className="bg-white border-[2px] border-dashed border-hack-black/30 rounded-2xl p-10 text-center text-hack-black/55 text-sm">
              No sections published yet.
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-10">
              <div className="absolute left-2 sm:left-4 top-0 bottom-0 w-[3px] bg-hack-black" />
              {rm.sections.map((sec, i) => {
                const isOpen = !!open[i];
                return (
                  <div key={`${i}-${sec.title}`} className="relative mb-5">
                    <div className="absolute -left-6 sm:-left-10 top-3 w-9 h-9 sm:w-11 sm:h-11 bg-hack-yellow border-[3px] border-hack-black rounded-full flex items-center justify-center font-display font-bold text-sm shadow-[3px_3px_0_#000]">
                      {i + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))}
                      className="w-full text-left bg-white border-[3px] border-hack-black rounded-2xl p-5 shadow-[5px_5px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-display font-bold text-lg leading-tight">{sec.title}</div>
                          <div className="text-xs font-mono text-hack-black/55 mt-1">{sec.topics?.length || 0} topics</div>
                        </div>
                        {isOpen ? <ChevronDown className="w-5 h-5 shrink-0 mt-0.5" /> : <ChevronRight className="w-5 h-5 shrink-0 mt-0.5" />}
                      </div>
                      {isOpen && (sec.topics || []).length > 0 && (
                        <ul className="mt-4 space-y-2">
                          {sec.topics.map((t, j) => (
                            <li key={j} className="flex gap-3 items-start py-1.5 border-t border-hack-black/10 first:border-t-0 first:pt-0">
                              <span className="shrink-0 w-6 h-6 bg-hack-black text-hack-yellow rounded-md flex items-center justify-center text-[10px] font-mono font-bold">
                                {j + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="font-mono text-sm font-bold text-hack-black">{t.name}</div>
                                {t.description && (
                                  <div className="text-xs text-hack-black/65 mt-0.5">{t.description}</div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
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
