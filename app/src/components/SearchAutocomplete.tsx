import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Loader2, ArrowUpRight } from "lucide-react";
import { fetchGraphQL } from "@/lib/graphql-client";
import { rewriteWpUrl } from "@/lib/utils";

const SEARCH_QUERY = `
  query SearchProducts($q: String!) {
    products(first: 8, where: { search: $q, orderby: { field: TITLE, order: ASC } }) {
      nodes {
        id
        databaseId
        slug
        name
        image { sourceUrl }
        productCategories(first: 1) { nodes { name slug } }
        ... on SimpleProduct { price }
      }
    }
  }
`;

interface SuggestionNode {
  id: string;
  databaseId?: number;
  slug: string;
  name: string;
  image?: { sourceUrl?: string };
  price?: string;
  productCategories?: { nodes: { name: string; slug: string }[] };
}

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onSubmit: (q: string) => void;
  onPickResult?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchAutocomplete({
  query,
  onQueryChange,
  onSubmit,
  onPickResult,
  placeholder = "Search templates, dashboards, assets...",
  autoFocus,
}: Props) {
  const [results, setResults] = useState<SuggestionNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  /* Debounced fetch — re-runs whenever query stabilises for 220 ms. */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const data = await fetchGraphQL(SEARCH_QUERY, { q });
        const nodes: SuggestionNode[] = (data?.products?.nodes ?? []) as SuggestionNode[];
        setResults(nodes);
        setActiveIdx(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query]);

  /* Close dropdown on outside click. */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    onSubmit(q);
  };

  const pick = (slug: string) => {
    setOpen(false);
    onPickResult?.();
    navigate(`/product/${slug}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      pick(results[activeIdx].slug);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={wrapRef} className="relative max-w-2xl mx-auto">
      <form onSubmit={submit}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-hack-black/40" />
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => { onQueryChange(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="w-full pl-12 pr-12 py-3 bg-hack-black/5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-hack-yellow"
            autoFocus={autoFocus}
            aria-label="Search products"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-hack-black/50 animate-spin" />
          )}
        </div>
      </form>

      {showDropdown && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border-[2.5px] border-hack-black shadow-[6px_6px_0_0_#1A1A1A] overflow-hidden z-[60] max-h-[70vh] overflow-y-auto"
        >
          {!loading && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-hack-black/60">
              No matches for <strong>“{query.trim()}”</strong>. Try a different keyword.
            </div>
          )}

          {results.length > 0 && (
            <ul className="divide-y divide-hack-black/10">
              {results.map((r, idx) => {
                const cat = r.productCategories?.nodes?.[0];
                const img = rewriteWpUrl(r.image?.sourceUrl) || "";
                const isActive = idx === activeIdx;
                return (
                  <li key={r.id} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => pick(r.slug)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        isActive ? "bg-hack-yellow/40" : "hover:bg-hack-black/5"
                      }`}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover border-2 border-hack-black shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-hack-black/10 border-2 border-hack-black shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-hack-black truncate">{r.name}</div>
                        <div className="text-[11px] text-hack-black/60 font-mono truncate">
                          {cat ? cat.name : "Product"}
                          {r.price ? <> · {r.price}</> : null}
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-hack-black/50 shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {results.length > 0 && (
            <button
              type="button"
              onClick={() => submit()}
              className="w-full px-4 py-3 text-center text-sm font-bold text-hack-black bg-hack-yellow border-t-[2.5px] border-hack-black hover:bg-hack-yellow/80 transition-colors"
            >
              View all results for “{query.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
