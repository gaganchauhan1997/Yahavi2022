import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useStore } from "@/context/StoreContext";
import { useMemo, useState } from "react";

type FilterType = "all" | "bestseller" | "new" | "free";

export default function TrendingSection() {
  const { state } = useStore();
  const allProducts = state.products;
  const loading = state.loading;
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const filteredProducts = useMemo(() => {
    switch (activeFilter) {
      case "bestseller":
        return allProducts.filter((p) => p.isBestseller);
      case "new":
        return allProducts.filter((p) => p.isNew);
      case "free":
        return allProducts.filter((p) => p.isFree);
      default:
        return allProducts;
    }
  }, [activeFilter, allProducts]);

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All Products" },
    { key: "bestseller", label: "Best Sellers" },
    { key: "new", label: "New Arrivals" },
    { key: "free", label: "Free Resources" },
  ];

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10 lg:mb-14">
          <div>
            <span className="inline-block text-xs font-mono uppercase tracking-widest text-hack-orange mb-3">
              Trending Now
            </span>
            <h2 className="font-display font-bold text-3xl lg:text-5xl tracking-tight">
              Discover Premium
              <br />
              <span className="text-gradient">Digital Assets</span>
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-sm font-medium hover:text-hack-magenta transition-colors whitespace-nowrap"
          >
            View All Products
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar pb-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter.key
                  ? "bg-hack-black text-hack-white"
                  : "bg-hack-black/5 text-hack-black/70 hover:bg-hack-black/10"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading && filteredProducts.length === 0 ? (
          <div className="flex items-center gap-2 text-hack-black/60 py-10">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading products…
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border-[2px] border-dashed border-hack-black/30 rounded-2xl p-10 text-center text-hack-black/55 text-sm">
            No products to show in this filter yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6">
            {filteredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
