import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api-base";

type Item = {
  platform: string;
  label: string;
  icon: string;
  color: string;
  profile_url: string;
  latest_url: string;
  latest_text: string;
  thumbnail: string;
  when?: string;
  source?: "auto" | "manual";
};

type Resp = { ok: boolean; count: number; items: Item[]; cached?: boolean };

const safeUrl = (u: string): string => {
  if (!u) return "#";
  try {
    const x = new URL(u, window.location.origin);
    if (x.protocol === "http:" || x.protocol === "https:") return x.toString();
  } catch { /* ignore */ }
  return "#";
};

const safeImg = (u: string): string => {
  if (!u) return "";
  try {
    const x = new URL(u);
    if (x.protocol === "https:" || x.protocol === "http:") return x.toString();
  } catch { /* ignore */ }
  return "";
};

export default function SocialFeedStrip() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    fetch(`${API_BASE}/wp-json/hk/v1/social-feed`, { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: Resp) => { if (alive && d?.ok && Array.isArray(d.items)) setItems(d.items); })
      .catch(() => { /* silent: strip just won't render */ })
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; ctrl.abort(); };
  }, []);

  if (!loaded) return null;
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="hk-social-feed-heading"
      className="bg-white border-t-[3px] border-b-[3px] border-hack-black"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-end justify-between mb-4 gap-3">
          <h2 id="hk-social-feed-heading" className="font-display font-bold uppercase text-lg sm:text-2xl tracking-tight">
            Latest from our channels
          </h2>
          <span className="text-xs text-gray-500 hidden sm:block">
            See what we're working on across the web
          </span>
        </div>

        <ul
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory"
          style={{ scrollbarWidth: "thin" }}
        >
          {items.map((it) => {
            const img = safeImg(it.thumbnail);
            const href = safeUrl(it.latest_url || it.profile_url);
            return (
              <li
                key={it.platform}
                className="snap-start shrink-0 w-[240px] sm:w-[260px] bg-white border-[3px] border-hack-black rounded-2xl overflow-hidden shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition"
              >
                <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="block">
                  <div
                    className="h-3"
                    style={{ background: it.color }}
                    aria-hidden="true"
                  />
                  {img ? (
                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                      <img
                        src={img}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  ) : (
                    <div
                      className="aspect-[4/3] flex items-center justify-center text-6xl"
                      style={{ background: `${it.color}14` }}
                      aria-hidden="true"
                    >
                      <span style={{ filter: "saturate(1.2)" }}>{it.icon}</span>
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span aria-hidden="true" className="text-base">{it.icon}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: it.color }}>
                        {it.label}
                      </span>
                      {it.source === "auto" && (
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                          LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-3 leading-snug">
                      {it.latest_text}
                    </p>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
