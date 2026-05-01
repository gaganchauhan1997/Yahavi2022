import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Brain, Clock, Loader2, Sparkles, Zap } from 'lucide-react';
import {
  fetchBrainxercises,
  fetchBrainxerciseCats,
  type HKBrainxCard,
  type HKBrainxCat,
} from '@/lib/hk-brainx';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

const DIFF_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  beginner:     { label: 'Beginner',     bg: 'bg-green-200',  text: 'text-green-900' },
  intermediate: { label: 'Intermediate', bg: 'bg-yellow-200', text: 'text-yellow-900' },
  advanced:     { label: 'Advanced',     bg: 'bg-orange-200', text: 'text-orange-900' },
  pro:          { label: 'Pro',          bg: 'bg-red-200',    text: 'text-red-900' },
};

export default function BrainxercisePage() {
  useDocumentMeta({
    title: 'Brainxercise — Excel Practice Quizzes | Hackknow',
    description:
      'Solve real Excel-style problems in your browser. VLOOKUP, Pivot Tables, Formulas, Macros — practice and get instant feedback. Free.',
  });

  const [items, setItems] = useState<HKBrainxCard[]>([]);
  const [cats, setCats] = useState<HKBrainxCat[]>([]);
  const [activeCat, setActiveCat] = useState<string>('');
  const [activeDiff, setActiveDiff] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [list, c] = await Promise.all([
          fetchBrainxercises({ cat: activeCat || undefined, difficulty: activeDiff || undefined, per_page: 24 }),
          fetchBrainxerciseCats(),
        ]);
        if (!alive) return;
        setItems(list.items);
        setCats(c);
      } catch (e) {
        if (alive) setErr((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [activeCat, activeDiff]);

  return (
    <div className="min-h-screen bg-[#fffbea]">
      {/* HERO */}
      <div className="bg-hack-black text-white py-12 lg:py-16">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <Link to="/" className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange mb-5 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-hack-yellow/15 border border-hack-yellow/30 text-hack-yellow text-xs font-mono uppercase tracking-widest rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" /> 100% FREE · NO LOGIN NEEDED
            </div>
            <h1 className="font-display font-bold text-4xl lg:text-6xl mb-4">Brainxercise</h1>
            <p className="text-white/70 text-base max-w-2xl">
              Browser ke andar real Excel sheet kholo. Question solve karo, instant check pao. VLOOKUP, Pivot
              Tables, Formulas — sab kuch practice for free.
            </p>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-4">
            {/* Category pills */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCat('')}
                className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider border-2 border-hack-black ${
                  activeCat === '' ? 'bg-hack-black text-white' : 'bg-white text-hack-black hover:bg-hack-yellow/20'
                }`}
              >
                All Topics
              </button>
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.slug)}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider border-2 border-hack-black ${
                    activeCat === c.slug
                      ? 'bg-hack-black text-white'
                      : 'bg-white text-hack-black hover:bg-hack-yellow/20'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Difficulty pills */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-mono uppercase text-hack-black/55 self-center mr-2">Level:</span>
              {[
                { v: '', l: 'Any' },
                { v: 'beginner', l: 'Beginner' },
                { v: 'intermediate', l: 'Intermediate' },
                { v: 'advanced', l: 'Advanced' },
                { v: 'pro', l: 'Pro' },
              ].map((d) => (
                <button
                  key={d.v}
                  onClick={() => setActiveDiff(d.v)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    activeDiff === d.v
                      ? 'bg-hack-yellow text-hack-black border-hack-black'
                      : 'bg-white text-hack-black/70 border-hack-black/20 hover:border-hack-black/50'
                  }`}
                >
                  {d.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-6xl mx-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-hack-black/30" />
            </div>
          )}
          {err && !loading && (
            <div className="bg-red-50 border-[3px] border-red-500 rounded-2xl p-6 text-center text-red-900 shadow-[5px_5px_0_#000]">
              <p className="font-bold mb-1">Could not load exercises.</p>
              <p className="text-sm font-mono">{err}</p>
            </div>
          )}
          {!loading && !err && items.length === 0 && (
            <div className="bg-white border-[3px] border-hack-black rounded-2xl p-10 text-center shadow-[5px_5px_0_#000]">
              <Brain className="w-12 h-12 mx-auto mb-3 text-hack-black/30" />
              <p className="font-display font-bold text-xl mb-1">No exercises yet.</p>
              <p className="text-sm text-hack-black/55">
                Our team is adding new questions. Check back soon!
              </p>
            </div>
          )}
          {!loading && !err && items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((it) => {
                const d = DIFF_BADGE[it.difficulty] || DIFF_BADGE.beginner;
                return (
                  <Link
                    key={it.id}
                    to={`/brainxercise/${it.slug}`}
                    className="group bg-white border-[3px] border-hack-black rounded-2xl p-5 shadow-[5px_5px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded ${d.bg} ${d.text}`}>
                        {d.label}
                      </span>
                      {it.time_limit > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-hack-black/55">
                          <Clock className="w-3 h-3" />
                          {it.time_limit}s
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-lg leading-tight mb-2 group-hover:underline">
                      {it.title}
                    </h3>
                    {it.excerpt && (
                      <p className="text-sm text-hack-black/65 line-clamp-2 mb-4 flex-1">{it.excerpt}</p>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-hack-black/10">
                      <div className="flex flex-wrap gap-1">
                        {it.categories.slice(0, 2).map((cn) => (
                          <span key={cn} className="text-[10px] font-mono text-hack-black/50 bg-hack-black/[0.04] px-1.5 py-0.5 rounded">
                            {cn}
                          </span>
                        ))}
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-hack-black">
                        Solve <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER STRIP */}
      <div className="bg-hack-yellow border-t-[3px] border-hack-black py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Zap className="w-6 h-6 inline-block mb-2" />
          <p className="font-display font-bold text-lg">
            Apne dost ko challenge karo. Free hai. Unlimited try.
          </p>
        </div>
      </div>
    </div>
  );
}
