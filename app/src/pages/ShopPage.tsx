import { useState, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { products, categories } from "@/data/products";

export default function ShopPage() {
  const { category: categorySlug } = useParams<{ category?: string }>();
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const subParam = searchParams.get("sub");

  const [sortBy, setSortBy] = useState<string>("featured");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);

  const currentCategory = categorySlug
    ? categories.find((c) => c.slug === categorySlug)
    : null;

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by category
    if (categorySlug) {
      result = result.filter((p) => p.category === categorySlug);
    }

    // Filter by subcategory
    if (subParam) {
      result = result.filter((p) => p.subcategory === subParam);
    }

    // Filter by URL filter param
    if (filterParam === "bestseller") {
      result = result.filter((p) => p.isBestseller);
    } else if (filterParam === "new") {
      result = result.filter((p) => p.isNew);
    } else if (filterParam === "free") {
      result = result.filter((p) => p.isFree);
    }

    // Filter by price range
    result = result.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    // Sort
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        result.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        break;
      default:
        break;
    }

    return result;
  }, [categorySlug, subParam, filterParam, sortBy, priceRange]);

  const getPageTitle = () => {
    if (currentCategory) return currentCategory.title;
    if (filterParam === "bestseller") return "Best Sellers";
    if (filterParam === "new") return "New Arrivals";
    if (filterParam === "free") return "Free Resources";
    return "All Products";
  };

  return (
    <div className="pt-24 lg:pt-28 pb-20">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 lg:mb-12">
            <div className="flex items-center gap-2 text-sm text-hack-black/50 mb-3">
              <Link to="/" className="hover:text-hack-black transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link
                to="/shop"
                className="hover:text-hack-black transition-colors"
              >
                Shop
              </Link>
              {currentCategory && (
                <>
                  <span>/</span>
                  <span className="text-hack-black">
                    {currentCategory.title}
                  </span>
                </>
              )}
            </div>
            <h1 className="font-display font-bold text-3xl lg:text-5xl tracking-tight mb-3">
              {getPageTitle()}
            </h1>
            <p className="text-hack-black/60">
              {filteredProducts.length} products available
            </p>
          </div>

          <div className="flex gap-8">
            {/* Sidebar Filters (Desktop) */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-28">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display font-bold">Filters</h3>
                  <SlidersHorizontal className="w-4 h-4" />
                </div>

                {/* Categories */}
                <div className="mb-8">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-hack-black/50 mb-3">
                    Categories
                  </h4>
                  <div className="space-y-2">
                    <Link
                      to="/shop"
                      className={`block text-sm ${
                        !categorySlug
                          ? "font-bold text-hack-black"
                          : "text-hack-black/60 hover:text-hack-black"
                      } transition-colors`}
                    >
                      All Products
                    </Link>
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/shop/${cat.slug}`}
                        className={`block text-sm ${
                          categorySlug === cat.slug
                            ? "font-bold text-hack-black"
                            : "text-hack-black/60 hover:text-hack-black"
                        } transition-colors`}
                      >
                        {cat.title}
                        <span className="text-hack-black/40 ml-1 font-mono text-xs">
                          ({cat.itemCount.toLocaleString()})
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="mb-8">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-hack-black/50 mb-3">
                    Price Range
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">${priceRange[0]}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], Number(e.target.value)])
                      }
                      className="flex-1 accent-hack-yellow"
                    />
                    <span className="text-sm font-mono">${priceRange[1]}</span>
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-widest text-hack-black/50 mb-3">
                    Sort By
                  </h4>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 bg-hack-black/5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-hack-yellow"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="newest">Newest First</option>
                  </select>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Mobile Toolbar */}
              <div className="lg:hidden flex items-center justify-between mb-6">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-hack-black/5 rounded-full text-sm"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 bg-hack-black/5 rounded-full text-sm focus:outline-none"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest</option>
                </select>
              </div>

              {/* Mobile Filters */}
              {showFilters && (
                <div className="lg:hidden mb-6 p-4 bg-hack-black/5 rounded-2xl">
                  <h4 className="font-display font-bold mb-3">Categories</h4>
                  <div className="space-y-2 mb-4">
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/shop/${cat.slug}`}
                        className="block text-sm text-hack-black/70"
                      >
                        {cat.title}
                      </Link>
                    ))}
                  </div>
                  <h4 className="font-display font-bold mb-3">Price Range</h4>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([priceRange[0], Number(e.target.value)])
                    }
                    className="w-full accent-hack-yellow"
                  />
                </div>
              )}

              {/* Products Grid */}
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <Search className="w-12 h-12 text-hack-black/20 mx-auto mb-4" />
                  <p className="font-display font-bold text-lg mb-2">
                    No products found
                  </p>
                  <p className="text-sm text-hack-black/50">
                    Try adjusting your filters or browse all products.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
