import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { categories } from "@/data/products";

const ACCENT_COLORS = [
  "bg-hack-yellow",
  "bg-hack-magenta",
  "bg-hack-orange",
  "bg-emerald-300",
  "bg-sky-300",
  "bg-violet-300",
];

export default function CategoriesSection() {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-24 bg-hack-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10 lg:mb-14">
          <span className="inline-block px-3 py-1.5 bg-hack-yellow border-[2.5px] border-hack-black rounded-full text-[11px] font-mono font-bold uppercase tracking-widest text-hack-black mb-4 shadow-[3px_3px_0_0_#1A1A1A]">
            Browse Top Categories
          </span>
          <h2 className="font-display font-black text-3xl lg:text-5xl tracking-tight text-hack-black">
            Find the Right Asset
            <br />
            <span className="text-gradient">for Every Need</span>
          </h2>
        </div>

        {/* Category Grid — neo-brutalism */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-7">
          {categories.map((cat, index) => {
            const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];
            return (
              <Link
                key={cat.id}
                to={`/shop/${cat.slug}`}
                className={`group relative rounded-2xl overflow-hidden bg-white border-[3px] border-hack-black shadow-[6px_6px_0_0_#1A1A1A] hover:shadow-[3px_3px_0_0_#1A1A1A] hover:translate-x-[3px] hover:translate-y-[3px] transition-all duration-200 ${
                  index === 0 ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                {/* Image — clean, no dark overlay */}
                <div className="aspect-[16/10] overflow-hidden border-b-[3px] border-hack-black">
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>

                {/* Content — light bg, bold black text */}
                <div className="p-4 lg:p-5 flex items-center justify-between gap-3 bg-white">
                  <div className="min-w-0">
                    <h3 className="font-display font-black text-lg lg:text-xl text-hack-black mb-0.5 truncate">
                      {cat.title}
                    </h3>
                    <p className="text-hack-black/60 text-xs lg:text-sm font-mono font-semibold">
                      {cat.itemCount.toLocaleString()}+ items
                    </p>
                  </div>
                  <div
                    className={`shrink-0 w-11 h-11 rounded-xl ${accent} flex items-center justify-center border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#1A1A1A] group-hover:rotate-12 transition-transform`}
                  >
                    <ArrowUpRight className="w-5 h-5 text-hack-black" strokeWidth={2.75} />
                  </div>
                </div>

                {/* Subcategories chips — show on hover */}
                <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  {cat.subcategories.slice(0, 3).map((sub) => (
                    <span
                      key={sub.slug}
                      className="px-2.5 py-1 bg-hack-yellow border-[2px] border-hack-black rounded-full text-[11px] font-bold text-hack-black shadow-[2px_2px_0_0_#1A1A1A]"
                    >
                      {sub.name}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
