import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Search } from 'lucide-react';

const WP = 'https://shop.hackknow.com/wp-json/wp/v2';

type WpPost = {
  id: number;
  slug: string;
  date: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  featured_media: number;
  categories: number[];
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url?: string; alt_text?: string; media_details?: { sizes?: Record<string, { source_url: string }> } }>;
    'wp:term'?: Array<Array<{ name: string; slug: string }>>;
  };
};

function decodeHtml(s: string): string {
  if (typeof window === 'undefined') return s;
  const t = document.createElement('textarea');
  t.innerHTML = s;
  return t.value;
}
function stripHtml(s: string): string {
  return decodeHtml(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}
function readTime(html: string): string {
  const words = stripHtml(html).split(/\s+/).length;
  return Math.max(2, Math.round(words / 220)) + ' min read';
}
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso.slice(0, 10); }
}
function pickImage(p: WpPost): string {
  const media = p._embedded?.['wp:featuredmedia']?.[0];
  if (media) {
    const sizes = media.media_details?.sizes || {};
    return sizes['large']?.source_url
        || sizes['medium_large']?.source_url
        || sizes['medium']?.source_url
        || media.source_url
        || '';
  }
  return '';
}
function pickCategory(p: WpPost): string {
  const term = p._embedded?.['wp:term']?.[0]?.[0];
  return term?.name || 'Blog';
}

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #FFD60A 0%, #FF7700 100%)',
  'linear-gradient(135deg, #FF00A0 0%, #FF7700 100%)',
  'linear-gradient(135deg, #1A1A1A 0%, #FFD60A 100%)',
  'linear-gradient(135deg, #FF7700 0%, #FF00A0 100%)',
  'linear-gradient(135deg, #FFD60A 0%, #FF00A0 100%)',
];

const BlogPage = () => {
  const [posts, setPosts] = useState<WpPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const ctrl = new AbortController();
    const url = `${WP}/posts?per_page=12&page=${page}&_embed=wp:featuredmedia,wp:term&_fields=id,slug,date,title,excerpt,featured_media,categories,_links,_embedded`;
    fetch(url, { signal: ctrl.signal })
      .then(async (r) => {
        const tp = r.headers.get('x-wp-totalpages');
        if (tp) setTotalPages(Math.max(1, parseInt(tp, 10) || 1));
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json() as Promise<WpPost[]>;
      })
      .then((data) => { if (alive) { setPosts(data); setError(null); } })
      .catch((e) => { if (alive && e.name !== 'AbortError') setError(e.message || 'Failed to load'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; ctrl.abort(); };
  }, [page]);

  const filtered = useMemo(() => {
    if (!query.trim()) return posts;
    const q = query.toLowerCase();
    return posts.filter((p) =>
      stripHtml(p.title.rendered).toLowerCase().includes(q) ||
      stripHtml(p.excerpt.rendered).toLowerCase().includes(q)
    );
  }, [posts, query]);

  return (
    <div className="min-h-screen bg-hack-white">
      {/* Header */}
      <div className="bg-hack-black text-hack-white py-16 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <h1 className="font-display font-bold text-4xl lg:text-6xl mb-4">HackKnow Blog</h1>
            <p className="text-hack-white/60 text-lg max-w-2xl mx-auto">
              Insights, tips, and resources for digital creators, marketers, and entrepreneurs.
            </p>
            <div className="mt-8 max-w-md mx-auto relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-hack-white/40" />
              <input
                type="search"
                placeholder="Search articles..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-hack-yellow"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Blog Grid */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 mb-8 text-center">
              Couldn&apos;t load posts ({error}). Please refresh.
            </div>
          )}

          {loading && posts.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-hack-black/5 animate-pulse">
                  <div className="aspect-[16/10] bg-hack-black/5" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 w-20 bg-hack-black/10 rounded-full" />
                    <div className="h-6 w-full bg-hack-black/10 rounded" />
                    <div className="h-4 w-3/4 bg-hack-black/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-hack-black/60 py-16">No articles match your search.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((post, idx) => {
                const img = pickImage(post);
                const category = pickCategory(post);
                const grad = FALLBACK_GRADIENTS[idx % FALLBACK_GRADIENTS.length];
                const title = decodeHtml(stripHtml(post.title.rendered));
                const excerpt = decodeHtml(stripHtml(post.excerpt.rendered));
                return (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group block bg-white rounded-2xl overflow-hidden border border-hack-black/5 card-hover"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-hack-black/5" style={!img ? { background: grad } : undefined}>
                      {img ? (
                        <img
                          src={img}
                          alt={title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-hack-black/80 font-display font-bold text-xl px-6 text-center">
                          {category}
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <span className="inline-block px-3 py-1 bg-hack-yellow/20 text-hack-black text-xs font-bold rounded-full mb-3">
                        {category}
                      </span>
                      <h2 className="font-display font-bold text-xl mb-3 line-clamp-2 group-hover:text-hack-magenta transition-colors">
                        {title}
                      </h2>
                      <p className="text-hack-black/60 text-sm mb-4 line-clamp-3">{excerpt}</p>
                      <div className="flex items-center gap-4 text-xs text-hack-black/40">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(post.date)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{readTime(post.excerpt.rendered)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-4 py-2 rounded-full bg-hack-black text-hack-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-hack-magenta transition-colors"
              >
                ← Previous
              </button>
              <span className="text-sm text-hack-black/60">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="px-4 py-2 rounded-full bg-hack-black text-hack-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-hack-magenta transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
