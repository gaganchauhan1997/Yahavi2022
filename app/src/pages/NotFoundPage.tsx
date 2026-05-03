import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

const POPULAR = [
  { to: '/',              label: 'Home' },
  { to: '/shop',          label: 'Shop' },
  { to: '/courses',       label: 'Courses' },
  { to: '/roadmaps',      label: 'Roadmaps' },
  { to: '/blog',          label: 'Blog' },
  { to: '/mis-templates', label: 'MIS Templates' },
  { to: '/hacked-news',   label: 'Hacked News' },
  { to: '/contact',       label: 'Contact' },
];

export default function NotFoundPage() {
  useEffect(() => {
    document.title = 'Page Not Found · HackKnow';
    // SEO: tell crawlers not to index 404 routes (kills duplicate-content risk on typo URLs)
    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const created = !robots;
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    const prev = robots.getAttribute('content');
    robots.setAttribute('content', 'noindex, nofollow');
    return () => {
      if (created) robots?.remove();
      else if (prev !== null) robots?.setAttribute('content', prev);
    };
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-20 bg-white">
      <div className="max-w-2xl w-full text-center">
        <div className="text-[110px] md:text-[140px] leading-none font-display font-extrabold text-hack-yellow drop-shadow-[3px_3px_0_rgba(0,0,0,0.85)] select-none">
          404
        </div>
        <h1 className="mt-2 text-3xl md:text-4xl font-display font-bold text-hack-black">
          Page not found
        </h1>
        <p className="mt-4 text-hack-black/70 max-w-md mx-auto">
          The page you're looking for has moved, expired, or never existed. Try one of the popular destinations below.
        </p>

        <div className="mt-8 flex flex-wrap gap-2 justify-center">
          {POPULAR.map(p => (
            <Link
              key={p.to}
              to={p.to}
              className="inline-flex items-center px-4 py-2 rounded-full border-[1.5px] border-hack-black/15 bg-white text-sm font-medium text-hack-black hover:bg-hack-yellow hover:border-hack-black transition"
            >
              {p.label}
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-hack-yellow border-[2px] border-hack-black text-hack-black font-bold shadow-[3px_3px_0_rgba(0,0,0,0.85)] hover:translate-y-[-1px] transition"
          >
            <Home className="w-4 h-4" /> Take me home
          </Link>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border-[2px] border-hack-black text-hack-black font-bold shadow-[3px_3px_0_rgba(0,0,0,0.85)] hover:translate-y-[-1px] transition"
          >
            <Search className="w-4 h-4" /> Browse shop
          </Link>
        </div>
      </div>
    </div>
  );
}
