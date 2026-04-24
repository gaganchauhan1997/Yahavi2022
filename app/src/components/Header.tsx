import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, ShoppingCart, Menu, X, Heart, User } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { categories } from "@/data/products";

export default function Header() {
  const { state, dispatch, cartCount } = useStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      dispatch({ type: "SET_SEARCH", query: searchQuery.trim() });
      navigate("/shop");
      setIsSearchOpen(false);
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "glass border-b border-hack-black/10 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Left: Menu + Logo */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
                className="p-2 -ml-2 hover:bg-hack-black/5 rounded-full transition-colors lg:block hidden"
                aria-label="Open categories"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 -ml-2 hover:bg-hack-black/5 rounded-full transition-colors lg:hidden"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
              <Link
                to="/"
                className="font-display font-bold text-xl lg:text-2xl tracking-tight"
              >
                HACKKNOW
              </Link>
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-widest text-hack-black/50 -ml-1">
                Digital Marketplace
              </span>
            </div>

            {/* Center: Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8">
              <Link
                to="/shop"
                className="text-sm font-medium hover:text-hack-magenta transition-colors"
              >
                Shop
              </Link>
              <Link
                to="/shop?filter=new"
                className="text-sm font-medium hover:text-hack-magenta transition-colors"
              >
                New Arrivals
              </Link>
              <Link
                to="/shop?filter=bestseller"
                className="text-sm font-medium hover:text-hack-magenta transition-colors"
              >
                Best Sellers
              </Link>
              <Link
                to="/shop/free-resources"
                className="text-sm font-medium hover:text-hack-magenta transition-colors"
              >
                Freebies
              </Link>
              <Link
                to="/about"
                className="text-sm font-medium hover:text-hack-magenta transition-colors"
              >
                About
              </Link>
            </nav>

            {/* Right: Search + Cart + Wishlist */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 hover:bg-hack-black/5 rounded-full transition-colors"
                aria-label="Search"
              >
                {isSearchOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>
              <Link
                to="/account/wishlist"
                className="p-2 hover:bg-hack-black/5 rounded-full transition-colors relative hidden sm:block"
              >
                <Heart className="w-5 h-5" />
                {state.wishlist.length > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-hack-magenta text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {state.wishlist.length}
                  </span>
                )}
              </Link>
              <Link
                to="/account"
                className="p-2 hover:bg-hack-black/5 rounded-full transition-colors hidden sm:block"
              >
                <User className="w-5 h-5" />
              </Link>
              <button
                onClick={() => dispatch({ type: "TOGGLE_CART" })}
                className="p-2 hover:bg-hack-black/5 rounded-full transition-colors relative"
                aria-label="Open cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-hack-yellow text-hack-black text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {isSearchOpen && (
          <div className="border-t border-hack-black/10 bg-hack-white/95 backdrop-blur-sm">
            <form
              onSubmit={handleSearch}
              className="w-full px-4 sm:px-6 lg:px-8 py-4"
            >
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-hack-black/40" />
                <input
                  type="text"
                  placeholder="Search templates, dashboards, assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-hack-black/5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-hack-yellow"
                  autoFocus
                />
              </div>
            </form>
          </div>
        )}
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-hack-white pt-20">
          <div className="px-6 py-8 space-y-6">
            <Link
              to="/shop"
              className="block text-2xl font-display font-bold"
            >
              Shop All
            </Link>
            <Link
              to="/shop?filter=new"
              className="block text-2xl font-display font-bold"
            >
              New Arrivals
            </Link>
            <Link
              to="/shop?filter=bestseller"
              className="block text-2xl font-display font-bold"
            >
              Best Sellers
            </Link>
            <div className="border-t border-hack-black/10 pt-6">
              <p className="text-xs font-mono uppercase tracking-widest text-hack-black/50 mb-4">
                Categories
              </p>
              <div className="space-y-3">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/shop/${cat.slug}`}
                    className="flex items-center justify-between text-lg"
                  >
                    <span>{cat.title}</span>
                    <span className="text-sm text-hack-black/50 font-mono">
                      {cat.itemCount.toLocaleString()}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="border-t border-hack-black/10 pt-6 space-y-3">
              <Link to="/about" className="block text-lg">
                About
              </Link>
              <Link to="/support" className="block text-lg">
                Support
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
