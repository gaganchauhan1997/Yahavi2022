import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Briefcase, Clock, GraduationCap, Loader2, Map } from 'lucide-react';
import { fetchRoadmaps, type HKRoadmap } from '@/lib/hk-content';

import { useDocumentMeta } from '@/lib/useDocumentMeta';
const DIFF_COLOR: Record<string, string> = {
  beginner:     'bg-emerald-200 text-emerald-900 border-emerald-900',
  intermediate: 'bg-orange-200 text-orange-900 border-orange-900',
  advanced:     'bg-red-200 text-red-900 border-red-900',
};

export default function RoadmapsPage() {
  useDocumentMeta({
    title: "Developer Roadmaps 2026 – Python, AI, Frontend, Backend | Hackknow",
    description: "Step-by-step learning roadmaps for Python, AI, Frontend, Backend, DevOps and more. Tools, hours and career outcomes laid out clearly.",
  });
  const [items, setItems] = useState<HKRoadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetchRoadmaps();
        if (alive) setItems(r.items);
      } catch (e) { if (alive) setErr((e as Error).message); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="min-h-screen bg-[#fffbea]">
      <div className="bg-hack-black text-white py-12 lg:py-16">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Link to="/" className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange mb-5 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-hack-yellow/15 border border-hack-yellow/30 text-hack-yellow text-xs font-mono uppercase tracking-widest rounded-full mb-4">
              <Map className="w-3.5 h-3.5" /> roadmap.sh-style — but neobrutal
            </div>
            <h1 className="font-display font-bold text-4xl lg:text-6xl mb-4">Career Roadmaps</h1>
            <p className="text-white/60 text-base max-w-2xl">
              No "watch 50 YouTube playlists" energy. Pick a goal, follow the steps —
              every section has topics, prerequisites and learning outcomes.
            </p>
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
              Roadmaps coming soon.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {items.map(r => {
                const topicCount = (r.sections || []).reduce((acc, s) => acc + (s.topics?.length || 0), 0);
                return (
                  <Link key={r.id} to={`/roadmaps/${r.slug}`}
                    className="bg-white border-[3px] border-hack-black rounded-2xl p-6 shadow-[6px_6px_0_#000] hover:shadow-[3px_3px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition flex flex-col">
                    <h3 className="font-display font-bold text-2xl mb-2">{r.title}</h3>
                    <p className="text-hack-black/65 text-sm mb-4 line-clamp-2">{r.excerpt}</p>
                    <div className="flex flex-wrap gap-2 text-xs font-mono uppercase tracking-wider mb-4">
                      {r.career && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-hack-yellow border border-hack-black rounded-md">
                          <Briefcase className="w-3 h-3" />{r.career}
                        </span>
                      )}
                      {r.difficulty && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 border rounded-md ${DIFF_COLOR[r.difficulty] || 'bg-white text-hack-black border-hack-black'}`}>
                          <GraduationCap className="w-3 h-3" />{r.difficulty}
                        </span>
                      )}
                      {!!r.hours_estimated && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-hack-black text-hack-yellow rounded-md">
                          <Clock className="w-3 h-3" />{r.hours_estimated}h
                        </span>
                      )}
                      {topicCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-hack-black rounded-md">
                          {(r.sections || []).length} sections · {topicCount} topics
                        </span>
                      )}
                    </div>
                    <span className="mt-auto inline-flex items-center gap-1 text-sm font-bold">
                      Open roadmap <ArrowRight className="w-4 h-4" strokeWidth={3} />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
