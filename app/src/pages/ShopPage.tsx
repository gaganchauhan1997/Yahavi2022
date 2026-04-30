import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, Search, SlidersHorizontal } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useStore } from "@/context/StoreContext";
import { categories as _allCategories } from "@/data/products";
import { isHiddenCat } from "@/lib/hidden-cats";
const categories = _allCategories.filter((c) => !isHiddenCat(c.slug));

import { useDocumentMeta } from '@/lib/useDocumentMeta';
const PRODUCTS_PER_PAGE = 12;

/* ── Numbered Pagination Component ─────────────────────────────────────── */
function Pagination({
  totalPages,
  currentPage,
  onPageChange,
}: {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const [goInput, setGoInput] = useState("");

  if (totalPages <= 1) return null;

  const getRange = () => {
    const delta = 2;
    const start = Math.max(1, currentPage - delta);
    const end = Math.min(totalPages, currentPage + delta);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const range = getRange();
  const showStartEllipsis = !range.includes(1);
  const showEndEllipsis = !range.includes(totalPages);

  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(goInput, 10);
    if (p >= 1 && p <= totalPages) {
      onPageChange(p);
      setGoInput("");
    }
  };

  const btnBase =
    "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-hack-yellow";
  const btnActive = "bg-hack-yellow text-hack-black";
  const btnInactive = "bg-hack-black/5 text-hack-black hover:bg-hack-black/10";
  const btnDisabled = "opacity-40 cursor-not-allowed bg-hack-black/5 text-hack-black";

  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {/* Prev */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnInactive} gap-1 px-3`}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      {/* First page */}
      {showStartEllipsis && (
        <>
          <button onClick={() => onPageChange(1)} className={`${btnBase} ${btnInactive}`}>1</button>
          <span className="px-1 text-hack-black/40">…</span>
        </>
      )}

      {/* Page numbers */}
      {range.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`${btnBase} ${p === currentPage ? btnActive : btnInactive}`}
        >
          {p}
        </button>
      ))}

      {/* Last page */}
      {showEndEllipsis && (
        <>
          <span className="px-1 text-hack-black/40">…</span>
          <button onClick={() => onPageChange(totalPages)} className={`${btnBase} ${btnInactive}`}>
            {totalPages}
          </button>
        </>
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${btnBase} ${currentPage === totalPages ? btnDisabled : btnInactive} gap-1 px-3`}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Go to page */}
      {totalPages > 5 && (
        <form
          onSubmit={handleGo}
          className="ml-2 flex items-center gap-2 rounded-lg bg-hack-black/5 px-3 py-1"
        >
          <span className="text-xs text-hack-black/50">Go to</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={goInput}
            onChange={(e) => setGoInput(e.target.value)}
            placeholder="—"
            className="w-12 rounded bg-white px-1.5 py-0.5 text-center text-sm font-mono focus:outline-none focus:ring-1 focus:ring-hack-yellow"
          />
          <button
            type="submit"
            className="text-xs font-bold text-hack-black hover:text-hack-yellow transition-colors"
          >
            Go
          </button>
        </form>
      )}
    </div>
  );
}

function parsePrice(price?: string): number {
  if (!price) return 0;
  const numeric = price.replace(/[^0-9.]/g, "");
  return Number.parseFloat(numeric) || 0;
}

/* ── ShopPage ─────────────────────────────────────────────────────────── */
export default function ShopPage() {
  useDocumentMeta({
    title: "Shop Premium Templates & Dashboards | Hackknow",
    description: "Browse Excel dashboards, PowerPoint templates, marketing kits, Notion templates and more. India's leading digital marketplace.",
  });
  const { category: categorySlug } = useParams<{ category?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filterParam = searchParams.get("filter");
  const subParam = searchParams.get("sub");
  const { state } = useStore();
  const { products, loading, searchQuery } = state;
  const [sortBy, setSortBy] = useState("featured");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const currentCategory = categorySlug
    ? categories.find((category) => category.slug === categorySlug)
    : null;

  const maxProductPrice = useMemo(() => {
    if (!products.length) return 1000;
    return Math.max(...products.map((product) => parsePrice(product.price)), 1000);
  }, [products]);

  const maxVisiblePrice = selectedMaxPrice ?? maxProductPrice;

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (categorySlug) {
      result = result.filter((product) => {
        if (product.category === categorySlug) return true;
        return product.categories?.includes(categorySlug) ?? false;
      });
    }

    if (subParam) {
      result = result.filter((product) => product.subcategory === subParam);
    }

    if (filterParam === "bestseller") {
      result = result.filter((product) => product.isBestseller);
    } else if (filterParam === "new") {
      result = result.filter((product) => product.isNew);
    } else if (filterParam === "free") {
      result = result.filter((product) => product.isFree);
    }

    if (searchQuery.trim()) {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      result = result.filter((product) =>
        [product.name, product.description, product.shortDescription]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery))
      );
    }

    result = result.filter((product) => parsePrice(product.price) <= maxVisiblePrice);

    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
        break;
      case "price-high":
        result.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
        break;
      case "rating":
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        break;
    }

    return result;
  }, [categorySlug, filterParam, maxVisiblePrice, products, searchQuery, sortBy, subParam]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [categorySlug, filterParam, subParam, searchQuery, sortBy, selectedMaxPrice]);

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageTitle = useMemo(() => {
    if (currentCategory) return currentCategory.title;
    if (filterParam === "bestseller") return "Best Sellers";
    if (filterParam === "new") return "New Arrivals";
    if (filterParam === "free") return "Free Resources";
    if (searchQuery.trim()) return `Search: ${searchQuery.trim()}`;
    return "All Products";
  }, [currentCategory, filterParam, searchQuery]);

  const startItem = filteredProducts.length === 0 ? 0 : (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length);

  return (
    <div className="pb-20 pt-24 lg:pt-28">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 lg:mb-12">
            <div className="mb-3 flex items-center gap-2 text-sm text-hack-black/50">
              <Link to="/" className="transition-colors hover:text-hack-black">
                Home
              </Link>
              <span>/</span>
              <Link to="/shop" className="transition-colors hover:text-hack-black">
                Shop
              </Link>
              {currentCategory && (
                <>
                  <span>/</span>
                  <span className="text-hack-black">{currentCategory.title}</span>
                </>
              )}
            </div>
            <h1 className="mb-3 font-display text-3xl font-bold tracking-tight lg:text-5xl">
              {pageTitle}
            </h1>
            <p className="text-hack-black/60">
              {filteredProducts.length > 0
                ? `Showing ${startItem}–${endItem} of ${filteredProducts.length} products`
                : "0 products available"}
            </p>
          </div>

          <div className="flex gap-8">
            <aside className="hidden w-64 shrink-0 lg:block">
              <div className="sticky top-28">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-display font-bold">Filters</h3>
                  <SlidersHorizontal className="h-4 w-4" />
                </div>

                <div className="mb-8">
                  <h4 className="mb-3 text-xs font-mono uppercase tracking-widest text-hack-black/50">
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
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        to={`/shop/${category.slug}`}
                        className={`block text-sm ${
                          categorySlug === category.slug
                            ? "font-bold text-hack-black"
                            : "text-hack-black/60 hover:text-hack-black"
                        } transition-colors`}
                      >
                        {category.title}
                        <span className="ml-1 font-mono text-xs text-hack-black/40">
                          ({category.itemCount.toLocaleString()})
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <h4 className="mb-3 text-xs font-mono uppercase tracking-widest text-hack-black/50">
                    Price Range
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">₹0</span>
                    <input
                      type="range"
                      min="0"
                      max={maxProductPrice}
                      step={Math.ceil(maxProductPrice / 20)}
                      value={maxVisiblePrice}
                      onChange={(event) => setSelectedMaxPrice(Number(event.target.value))}
                      className="flex-1 accent-hack-yellow"
                    />
                    <span className="text-sm font-mono">₹{maxVisiblePrice}</span>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-xs font-mono uppercase tracking-widest text-hack-black/50">
                    Sort By
                  </h4>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="w-full rounded-lg bg-hack-black/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-hack-yellow"
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

            <div className="flex-1">
              <div className="mb-6 flex items-center justify-between lg:hidden">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 rounded-full bg-hack-black/5 px-4 py-2 text-sm"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </button>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="rounded-full bg-hack-black/5 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest</option>
                </select>
              </div>

              {showFilters && (
                <div className="mb-6 rounded-2xl bg-hack-black/5 p-4 lg:hidden">
                  <h4 className="mb-3 font-display font-bold">Categories</h4>
                  <div className="mb-4 space-y-2">
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        to={`/shop/${category.slug}`}
                        className="block text-sm text-hack-black/70"
                      >
                        {category.title}
                      </Link>
                    ))}
                  </div>
                  <h4 className="mb-3 font-display font-bold">Price Range</h4>
                  <input
                    type="range"
                    min="0"
                    max={maxProductPrice}
                    step={Math.ceil(maxProductPrice / 20)}
                    value={maxVisiblePrice}
                    onChange={(event) => setSelectedMaxPrice(Number(event.target.value))}
                    className="w-full accent-hack-yellow"
                  />
                </div>
              )}

              {loading ? (
                <div className="py-20 text-center">
                  <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-hack-yellow" />
                  <p className="mb-2 font-display text-lg font-bold">Loading products...</p>
                  <p className="text-sm text-hack-black/50">Fetching from our digital marketplace</p>
                </div>
              ) : paginatedProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
                    {paginatedProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  <Pagination
                    totalPages={totalPages}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                  />
                </>
              ) : (
                <div className="py-20 text-center">
                  <Search className="mx-auto mb-4 h-12 w-12 text-hack-black/30" />
                  <p className="mb-2 font-display text-lg font-bold">
                    {products.length === 0 ? "No products available" : "No products match your filters"}
                  </p>
                  <p className="mx-auto mb-6 max-w-md text-sm text-hack-black/70">
                    {products.length === 0
                      ? "We're having trouble loading products. Please check your connection or refresh."
                      : "Try adjusting your filters or browse all products to find what you're looking for."}
                  </p>
                  <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    {products.length === 0 ? (
                      <>
                        <button
                          onClick={() => window.location.reload()}
                          className="rounded-full bg-hack-yellow px-6 py-2.5 font-bold text-hack-black transition-colors hover:bg-hack-yellow/90"
                        >
                          Refresh Page
                        </button>
                        <Link
                          to="/support"
                          className="rounded-full bg-hack-black/5 px-6 py-2.5 font-medium text-hack-black transition-colors hover:bg-hack-black/10"
                        >
                          Contact Support
                        </Link>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setSelectedMaxPrice(null);
                            navigate("/shop");
                          }}
                          className="rounded-full bg-hack-yellow px-6 py-2.5 font-bold text-hack-black transition-colors hover:bg-hack-yellow/90"
                        >
                          Clear Filters
                        </button>
                        <Link
                          to="/shop"
                          className="rounded-full bg-hack-black/5 px-6 py-2.5 font-medium text-hack-black transition-colors hover:bg-hack-black/10"
                        >
                          Browse All Products
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
