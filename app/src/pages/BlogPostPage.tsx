import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react';

const WP = 'https://shop.hackknow.com/wp-json/wp/v2';

type WpPost = {
  id: number;
  slug: string;
  date: string;
  modified: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  featured_media: number;
  categories: number[];
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url?: string; alt_text?: string; media_details?: { sizes?: Record<string, { source_url: string }> } }>;
    'wp:term'?: Array<Array<{ id: number; name: string; slug: string }>>;
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
  try { return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return iso.slice(0, 10); }
}
function pickHero(p: WpPost): { src: string; alt: string } {
  const m = p._embedded?.['wp:featuredmedia']?.[0];
  if (!m) return { src: '', alt: '' };
  const sizes = m.media_details?.sizes || {};
  const src = sizes['1536x1536']?.source_url || sizes['large']?.source_url || m.source_url || '';
  return { src, alt: m.alt_text || '' };
}

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<WpPost | null>(null);
  const [related, setRelated] = useState<WpPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true);
    setPost(null);
    setRelated([]);
    const ctrl = new AbortController();
    const url = `${WP}/posts?slug=${encodeURIComponent(slug)}&_embed=wp:featuredmedia,wp:term`;
    fetch(url, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json() as Promise<WpPost[]>;
      })
      .then(async (arr) => {
        if (!alive) return;
        if (!arr || arr.length === 0) { setError('Article not found'); return; }
        const p = arr[0];
        setPost(p);
        setError(null);
        // Fetch related (same category, excluding self)
        const cat = p.categories?.[0];
        if (cat) {
          try {
            const rr = await fetch(`${WP}/posts?per_page=4&exclude=${p.id}&categories=${cat}&_embed=wp:featuredmedia&_fields=id,slug,title,date,_links,_embedded`, { signal: ctrl.signal });
            if (rr.ok && alive) setRelated(await rr.json());
          } catch { /* ignore */ }
        }
        // Update document title for browser tab (SSR also sets title server-side)
        try { document.title = decodeHtml(stripHtml(p.title.rendered)) + ' | HackKnow Blog'; } catch { /* ignore */ }
        // Scroll to top on load
        try { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); } catch { window.scrollTo(0, 0); }
      })
      .catch((e) => { if (alive && e.name !== 'AbortError') setError(e.message || 'Failed to load'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; ctrl.abort(); };
  }, [slug]);

  if (loading && !post) {
    return (
      <div className="min-h-screen bg-hack-white">
        <div className="bg-hack-black text-hack-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
            <div className="h-4 w-32 bg-white/10 rounded mb-6" />
            <div className="h-10 w-3/4 bg-white/10 rounded mb-4" />
            <div className="h-6 w-1/2 bg-white/10 rounded" />
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 bg-hack-black/10 rounded w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-hack-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h1 className="font-display font-bold text-3xl mb-4">Article Not Found</h1>
          <p className="text-hack-black/60 mb-6">{error || 'The article you\'re looking for doesn\'t exist or has been moved.'}</p>
          <Link to="/blog" className="inline-flex items-center gap-2 px-6 py-3 bg-hack-yellow text-hack-black rounded-full font-bold hover:bg-hack-yellow/90 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const hero = pickHero(post);
  const title = decodeHtml(stripHtml(post.title.rendered));
  const category = post._embedded?.['wp:term']?.[0]?.[0];

  return (
    <div className="min-h-screen bg-hack-white">
      {/* Hero */}
      <div className="bg-hack-black text-hack-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
          <Link to="/blog" className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange transition-colors mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
          {category && (
            <Link
              to="/blog"
              className="inline-flex items-center gap-1 px-3 py-1 bg-hack-yellow/20 text-hack-yellow text-xs font-bold rounded-full mb-4"
            >
              <Tag className="w-3 h-3" /> {category.name}
            </Link>
          )}
          <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-4 leading-tight">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-hack-white/60">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDate(post.date)}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{readTime(post.content.rendered)}</span>
          </div>
        </div>
        {hero.src && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-0">
            <div className="aspect-[16/9] overflow-hidden rounded-t-3xl bg-hack-black/40">
              <img src={hero.src} alt={hero.alt || title} className="w-full h-full object-cover" loading="eager" decoding="async" />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div
          className="hk-blog-prose prose prose-lg max-w-none
                     prose-headings:font-display prose-headings:font-bold
                     prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                     prose-p:text-hack-black/80 prose-p:leading-relaxed
                     prose-a:text-hack-magenta prose-a:font-semibold prose-a:no-underline hover:prose-a:underline
                     prose-strong:text-hack-black
                     prose-li:text-hack-black/80
                     prose-ol:list-decimal prose-ul:list-disc"
          dangerouslySetInnerHTML={{ __html: post.content.rendered }}
        />

        {/* Share / CTA */}
        <div className="mt-12 p-6 lg:p-8 rounded-2xl bg-gradient-to-br from-hack-yellow/20 to-hack-magenta/10 border border-hack-yellow/30 text-center">
          <h3 className="font-display font-bold text-xl mb-2">Loved this article?</h3>
          <p className="text-hack-black/70 mb-4 text-sm">Browse 233+ premium templates starting at ₹19 — instant download, lifetime access.</p>
          <Link to="/shop" className="inline-flex items-center gap-2 px-6 py-3 bg-hack-black text-hack-yellow rounded-full font-bold hover:bg-hack-magenta hover:text-white transition-colors">
            Browse the Shop →
          </Link>
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <h2 className="font-display font-bold text-2xl mb-6">More from the blog</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((r) => {
              const m = r._embedded?.['wp:featuredmedia']?.[0];
              const sizes = m?.media_details?.sizes || {};
              const src = sizes['medium_large']?.source_url || sizes['medium']?.source_url || m?.source_url || '';
              return (
                <Link key={r.id} to={`/blog/${r.slug}`} className="group block bg-white rounded-2xl overflow-hidden border border-hack-black/5 card-hover">
                  <div className="aspect-[16/10] overflow-hidden bg-hack-black/5">
                    {src ? (
                      <img src={src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-hack-yellow to-hack-orange" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-display font-bold text-sm line-clamp-2 group-hover:text-hack-magenta transition-colors">
                      {decodeHtml(stripHtml(r.title.rendered))}
                    </h3>
                    <p className="text-xs text-hack-black/40 mt-2">{formatDate(r.date)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogPostPage;
