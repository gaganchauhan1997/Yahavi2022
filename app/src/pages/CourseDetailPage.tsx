import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Check, CheckSquare, Clock, GraduationCap, Loader2, Wrench } from 'lucide-react';
import { fetchCourse, type HKCourse } from '@/lib/hk-content';

import { useDocumentMeta } from '@/lib/useDocumentMeta';
export default function CourseDetailPage() {
  useDocumentMeta({
    title: "Course Detail | Hackknow",
    description: "Course curriculum, requirements, tools and outcomes on Hackknow.",
  });
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<HKCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const c = await fetchCourse(slug);
        if (alive) setCourse(c);
      } catch (e) { if (alive) setErr((e as Error).message); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#fffbea]"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (err || !course) return (
    <div className="min-h-screen bg-[#fffbea] py-20 px-4 text-center">
      <p className="text-hack-black/65 mb-4">{err || 'Course not found.'}</p>
      <Link to="/courses" className="text-hack-black underline">← Back to Courses</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fffbea]">
      {/* HERO */}
      <div className="bg-hack-black text-white py-12 lg:py-16">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Link to="/courses" className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange mb-5 text-sm">
              <ArrowLeft className="w-4 h-4" /> All Courses
            </Link>
            <div className="flex flex-wrap gap-2 mb-4">
              {course.level && <span className="inline-flex items-center gap-1 px-3 py-1 bg-hack-yellow text-hack-black text-xs font-mono uppercase tracking-wider border-[2px] border-white rounded-full"><GraduationCap className="w-3 h-3" />{course.level}</span>}
              {course.duration && <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 text-white text-xs font-mono uppercase tracking-wider border border-white/20 rounded-full"><Clock className="w-3 h-3" />{course.duration}</span>}
              {course.price && <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 text-white text-xs font-mono uppercase tracking-wider border border-white/20 rounded-full"><BookOpen className="w-3 h-3" />{course.price}</span>}
            </div>
            <h1 className="font-display font-bold text-3xl lg:text-5xl mb-4">{course.title}</h1>
            <p className="text-white/70 text-lg">{course.excerpt}</p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chapters */}
          <div className="lg:col-span-2 bg-white border-[3px] border-hack-black rounded-2xl p-6 shadow-[6px_6px_0_#000]">
            <h2 className="font-display font-bold text-2xl mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5" /> Chapters</h2>
            {course.chapters?.length ? (
              <ol className="space-y-3 list-none">
                {course.chapters.map((ch, i) => (
                  <li key={i} className="border-l-[3px] border-hack-yellow pl-4 py-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-display font-bold text-lg">{i + 1}. {ch.title}</span>
                      {ch.duration && <span className="text-xs font-mono text-hack-black/55">{ch.duration}</span>}
                    </div>
                    {ch.lessons && ch.lessons.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm text-hack-black/70">
                        {ch.lessons.map((l, j) => <li key={j} className="flex gap-2"><Check className="w-3.5 h-3.5 text-hack-yellow mt-1 shrink-0" /> {l}</li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            ) : <p className="text-hack-black/55 text-sm">Curriculum coming soon.</p>}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {course.requirements?.length > 0 && (
              <div className="bg-white border-[3px] border-hack-black rounded-2xl p-5 shadow-[5px_5px_0_#000]">
                <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2"><CheckSquare className="w-4 h-4" /> Requirements</h3>
                <ul className="space-y-2 text-sm text-hack-black/75">
                  {course.requirements.map((r, i) => <li key={i} className="flex gap-2"><Check className="w-3.5 h-3.5 text-hack-yellow mt-1 shrink-0" /> {r}</li>)}
                </ul>
              </div>
            )}
            {course.outcomes?.length > 0 && (
              <div className="bg-hack-yellow border-[3px] border-hack-black rounded-2xl p-5 shadow-[5px_5px_0_#000]">
                <h3 className="font-display font-bold text-lg mb-3">You'll be able to</h3>
                <ul className="space-y-2 text-sm text-hack-black">
                  {course.outcomes.map((o, i) => <li key={i} className="flex gap-2"><Check className="w-3.5 h-3.5 mt-1 shrink-0" /> {o}</li>)}
                </ul>
              </div>
            )}
            {course.tools?.length > 0 && (
              <div className="bg-white border-[3px] border-hack-black rounded-2xl p-5 shadow-[5px_5px_0_#000]">
                <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2"><Wrench className="w-4 h-4" /> Tools</h3>
                <div className="flex flex-wrap gap-2">
                  {course.tools.map((t, i) => <span key={i} className="px-2 py-1 bg-hack-black text-hack-yellow text-xs font-mono rounded">{t}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
