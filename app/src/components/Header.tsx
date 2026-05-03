import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Menu, X, Heart, User } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { categories } from "@/data/products";
import { isAuthenticated, logout } from "@/lib/auth";
import InstallButton from "@/components/InstallButton";
import MobileSidebar from "@/components/MobileSidebar";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import TdmSigil from "@/components/TdmSigil";
import WalletBadge from "@/components/WalletBadge";
import VerifiedBadge from "@/components/VerifiedBadge";

const TDM_URL = "https://tdm.hackknow.com/";

export default function Header() {
  const { state, dispatch, cartCount } = useStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const submitSearch = (q: string) => {
    dispatch({ type: "SET_SEARCH", query: q });
    navigate("/shop");
    setIsSearchOpen(false);
  };

  return (
    <>
      <header
        className={`fixed left-0 right-0 z-50 bg-white border-b border-hack-black/10 transition-[top,box-shadow] duration-300 ${
          isScrolled ? "shadow-md" : "shadow-sm"
        }`}
        style={{ top: 'var(--hk-ann-h, 0px)' }}
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
                <Menu className="w-5 h-5 text-hack-black" />
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 -ml-2 hover:bg-hack-black/5 rounded-full transition-colors lg:hidden"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-hack-black" />
                ) : (
                  <Menu className="w-5 h-5 text-hack-black" />
                )}
              </button>
              <Link
                to="/"
                onClick={closeMobileMenu}
                aria-label="HackKnow home"
                className="flex items-center gap-2 group"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-hack-yellow text-hack-black border-2 border-hack-black font-display font-extrabold text-xl lg:text-2xl shadow-[3px_3px_0_0_#0A0A0A] group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
                >
                  H
                </span>
                <span className="font-display font-bold text-xl lg:text-2xl tracking-tight text-hack-black">
                  HACKKNOW
                </span>
              </Link>
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-widest text-hack-black/50 -ml-1">
                Digital Marketplace
              </span>
            </div>

            {/* Center: Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-6">
              <Link to="/shop" onClick={closeMobileMenu}
                className="text-sm font-bold text-hack-black hover:text-hack-magenta transition-colors">
                Shop
              </Link>
              <Link to="/courses" onClick={closeMobileMenu}
                className="text-sm font-bold text-hack-black hover:text-hack-magenta transition-colors">
                Courses
              </Link>
              <Link to="/roadmaps" onClick={closeMobileMenu}
                className="text-sm font-bold text-hack-black hover:text-hack-magenta transition-colors">
                Roadmaps
              </Link>
              <Link to="/hacked-news" onClick={closeMobileMenu}
                className="text-sm font-bold text-hack-black hover:text-hack-magenta transition-colors">
                News
              </Link>
              <Link to="/mis-templates" onClick={closeMobileMenu}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-hack-black hover:text-hack-magenta transition-colors">
                MIS
                <span className="px-1.5 py-0.5 bg-hack-yellow border border-hack-black rounded text-[10px] font-mono">90% OFF</span>
              </Link>
              <Link to="/testimonials" onClick={closeMobileMenu}
                className="text-sm font-bold text-hack-black hover:text-hack-magenta transition-colors">
                Reviews
              </Link>
              <Link to="/sponsor" onClick={closeMobileMenu}
                className="text-sm font-bold text-hack-black hover:text-hack-magenta transition-colors">
                Sponsor
              </Link>
              <Link to="/about" onClick={closeMobileMenu}
                className="text-sm font-bold text-hack-black hover:text-hack-magenta transition-colors">
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
                  <X className="w-5 h-5 text-hack-black" />
                ) : (
                  <Search className="w-5 h-5 text-hack-black" />
                )}
              </button>
              <Link
                to="/account/wishlist"
                onClick={closeMobileMenu}
                className="p-2 hover:bg-hack-black/5 rounded-full transition-colors relative hidden sm:block"
              >
                <Heart className="w-5 h-5 text-hack-black" />
                {state.wishlist.length > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-hack-magenta text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {state.wishlist.length}
                  </span>
                )}
              </Link>
              <VerifiedBadge variant="header" />
              <WalletBadge />
              <Link
                to="/account"
                onClick={closeMobileMenu}
                className="p-2 hover:bg-hack-black/5 rounded-full transition-colors hidden sm:block"
              >
                <User className="w-5 h-5 text-hack-black" />
              </Link>
              <InstallButton />
              <button
                onClick={() => dispatch({ type: "TOGGLE_CART" })}
                className="p-2 hover:bg-hack-black/5 rounded-full transition-colors relative"
                aria-label="Open cart"
              >
                <ShoppingCart className="w-5 h-5 text-hack-black" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-hack-yellow text-hack-black text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
              <a
                href={TDM_URL}
                aria-label="The Dead Man — HackKnow's AI"
                title="The Dead Man — Ask what you want the most"
                className="ml-1 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-hack-black border-2 border-hack-black shadow-[3px_3px_0_0_#FFB800] hover:shadow-[1px_1px_0_0_#FFB800] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <TdmSigil size={22} />
                <span className="hidden md:flex flex-col leading-none -mt-0.5">
                  <span className="font-display font-extrabold text-sm text-white tracking-wider">TDM</span>
                  <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-hack-yellow mt-0.5">
                    Ask · Get · Done
                  </span>
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Search Bar — AJAX autocomplete dropdown */}
        {isSearchOpen && (
          <div className="border-t border-hack-black/10 bg-white">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
              <SearchAutocomplete
                query={searchQuery}
                onQueryChange={setSearchQuery}
                onSubmit={submitSearch}
                onPickResult={() => setIsSearchOpen(false)}
                autoFocus
              />
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu — multi-level drawer */}
      {isMobileMenuOpen && (
        <MobileSidebar
          onClose={closeMobileMenu}
          shopCategories={categories}
          onSignOut={() => { logout(); closeMobileMenu(); navigate('/'); }}
          isAuthed={isAuthenticated()}
        />
      )}
    </>
  );
}
