import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { categories } from "@/data/products";

export default function CategoriesSection() {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <span className="inline-block text-xs font-mono uppercase tracking-widest text-hack-magenta mb-3">
            Browse Top Categories
          </span>
          <h2 className="font-display font-bold text-3xl lg:text-5xl tracking-tight">
            Find the Right Asset
            <br />
            <span className="text-gradient">for Every Need</span>
          </h2>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {categories.map((cat, index) => (
            <Link
              key={cat.id}
              to={`/shop/${cat.slug}`}
              className={`group relative rounded-2xl lg:rounded-3xl overflow-hidden bg-white border border-hack-black/5 card-hover ${
                index === 0 ? "sm:col-span-2 lg:col-span-1" : ""
              }`}
            >
              {/* Background Image */}
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-hack-black/70 via-hack-black/20 to-transparent" />
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-6">
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="font-display font-bold text-lg lg:text-xl text-white mb-1 group-hover:text-hack-yellow transition-colors">
                      {cat.title}
                    </h3>
                    <p className="text-white/60 text-sm font-mono">
                      {cat.itemCount.toLocaleString()}+ items
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-hack-yellow group-hover:text-hack-black transition-colors">
                    <ArrowUpRight className="w-5 h-5 text-white group-hover:text-hack-black" />
                  </div>
                </div>
              </div>

              {/* Subcategories (visible on hover) */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {cat.subcategories.slice(0, 3).map((sub) => (
                  <span
                    key={sub.slug}
                    className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium"
                  >
                    {sub.name}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
