import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Clock, GraduationCap, Loader2, Tag } from 'lucide-react';
import { fetchCourseCategories, fetchCourses, type HKCategory, type HKCourse } from '@/lib/hk-content';

const CAT_ICON: Record<string, string> = {
  python: '🐍', java: '☕', wordpress: '📝', php: '🐘', 'node-js': '🟢',
  vercel: '▲', netlify: '🌐', 'ai-infrastructure': '🤖',
};

export default function CoursesPage() {
  const { catSlug } = useParams<{ catSlug?: string }>();
  const [cats, setCats] = useState<HKCategory[]>([]);
  const [courses, setCourses] = useState<HKCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const [c, cs] = await Promise.all([
          fetchCourseCategories(),
          fetchCourses(catSlug),
        ]);
        if (!alive) return;
        setCats(c.items);
        setCourses(cs.items);
      } catch (e) {
        if (alive) setErr((e as Error).message);
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [catSlug]);

  const activeCat = catSlug ? cats.find(c => c.slug === catSlug) : null;

  return (
    <div className="min-h-screen bg-[#fffbea]">

      {/* HERO */}
      <div className="bg-hack-black text-white py-12 lg:py-16">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <Link to={catSlug ? '/courses' : '/'} className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange mb-5 text-sm">
              <ArrowLeft className="w-4 h-4" /> {catSlug ? 'All Courses' : 'Back to Home'}
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-hack-yellow/15 border border-hack-yellow/30 text-hack-yellow text-xs font-mono uppercase tracking-widest rounded-full mb-4">
              <GraduationCap className="w-3.5 h-3.5" /> Verified students → 6 months FREE
            </div>
            <h1 className="font-display font-bold text-4xl lg:text-6xl mb-4">
              {activeCat ? activeCat.name : 'Courses'}
            </h1>
            <p className="text-white/60 text-base max-w-2xl">
              {activeCat
                ? activeCat.description || `Hands-on ${activeCat.name} courses — chapters, projects, mentor support.`
                : 'Learn the stack we actually ship with. Pick a track below — every course has chapters, requirements, projects and tool installs.'}
            </p>
          </div>
        </div>
      </div>

      {/* SUB-CAT GRID (only on /courses root) */}
      {!catSlug && (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display font-bold text-2xl mb-6">Pick your track</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {cats.map(c => (
                <Link key={c.id} to={`/courses/cat/${c.slug}`}
                  className="group bg-white border-[3px] border-hack-black rounded-2xl p-5 shadow-[5px_5px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition">
                  <div className="text-4xl mb-3">{CAT_ICON[c.slug] || '📚'}</div>
                  <div className="font-display font-bold text-lg leading-tight mb-1">{c.name}</div>
                  <div className="text-xs text-hack-black/55 font-mono uppercase tracking-wider">
                    {c.count} {c.count === 1 ? 'course' : 'courses'}
                  </div>
                </Link>
              ))}
              {cats.length === 0 && !loading && (
                <div className="col-span-full text-hack-black/50 text-sm">No categories yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COURSE LIST */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display font-bold text-2xl mb-6">
            {catSlug ? `${activeCat?.name || ''} courses` : 'All courses'}
          </h2>
          {loading ? (
            <div className="flex items-center gap-2 text-hack-black/60"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : err ? (
            <div className="bg-red-50 border-[2px] border-red-200 text-red-700 rounded-xl p-4 text-sm">{err}</div>
          ) : courses.length === 0 ? (
            <div className="bg-white border-[2px] border-dashed border-hack-black/30 rounded-2xl p-10 text-center text-hack-black/55 text-sm">
              No courses published yet in this track. Check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map(c => (
                <Link key={c.id} to={`/courses/${c.slug}`}
                  className="bg-white border-[3px] border-hack-black rounded-2xl p-5 shadow-[5px_5px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition flex flex-col">
                  <div className="font-display font-bold text-lg leading-tight mb-2">{c.title}</div>
                  <p className="text-hack-black/65 text-sm mb-4 line-clamp-3 flex-grow">{c.excerpt}</p>
                  <div className="flex flex-wrap gap-2 text-xs font-mono uppercase tracking-wider">
                    {c.level && <span className="inline-flex items-center gap-1 px-2 py-1 bg-hack-yellow border border-hack-black rounded-md"><Tag className="w-3 h-3" />{c.level}</span>}
                    {c.duration && <span className="inline-flex items-center gap-1 px-2 py-1 bg-hack-black text-hack-yellow rounded-md"><Clock className="w-3 h-3" />{c.duration}</span>}
                    {c.price && <span className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-hack-black rounded-md"><BookOpen className="w-3 h-3" />{c.price}</span>}
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-hack-black">
                    View course <ArrowRight className="w-4 h-4" strokeWidth={3} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
