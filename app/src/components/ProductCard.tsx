import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Star, ArrowUpRight } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import type { Product } from "@/data/products";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className = "" }: ProductCardProps) {
  const { dispatch, toggleWishlist, state } = useStore();
  const isInWishlist = state.wishlist.includes(product.id);
  const productImage = product.image?.sourceUrl?.trim();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: "ADD_TO_CART", product });
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <Link
      to={`/product/${product.slug}`}
      className={`group relative block bg-white rounded-2xl overflow-hidden border-[3px] border-hack-black shadow-[6px_6px_0_0_#1A1A1A] hover:shadow-[3px_3px_0_0_#1A1A1A] hover:translate-x-[3px] hover:translate-y-[3px] transition-all duration-200 ${className}`}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-hack-black/5 border-b-[3px] border-hack-black">
        {productImage ? (
          <img
            src={productImage}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-hack-yellow/30 to-hack-orange/30 px-6 text-center">
            <span className="font-display text-lg font-black text-hack-black/60">
              {product.name}
            </span>
          </div>
        )}

        {/* Badges — neo-brutal pills */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {product.isNew && (
            <span className="px-2.5 py-1 bg-hack-yellow text-hack-black text-[10px] font-black tracking-wider uppercase rounded-md border-[2px] border-hack-black shadow-[2px_2px_0_0_#1A1A1A]">
              NEW
            </span>
          )}
          {product.isBestseller && (
            <span className="px-2.5 py-1 bg-hack-magenta text-hack-black text-[10px] font-black tracking-wider uppercase rounded-md border-[2px] border-hack-black shadow-[2px_2px_0_0_#1A1A1A]">
              BESTSELLER
            </span>
          )}
          {product.isFree && (
            <span className="px-2.5 py-1 bg-emerald-400 text-hack-black text-[10px] font-black tracking-wider uppercase rounded-md border-[2px] border-hack-black shadow-[2px_2px_0_0_#1A1A1A]">
              FREE
            </span>
          )}
        </div>

        {/* Wishlist Button — always visible on mobile, hover-fade on desktop */}
        <button
          onClick={handleToggleWishlist}
          aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-3 right-3 w-10 h-10 rounded-lg bg-white flex items-center justify-center border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#1A1A1A] hover:shadow-[1px_1px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
        >
          <Heart
            className={`w-5 h-5 ${isInWishlist ? "fill-red-500 text-red-500" : "text-hack-black"}`}
            strokeWidth={2.5}
          />
        </button>

        {/* Quick Add Button — neo-brutal yellow chip */}
        {!product.isFree && (
          <button
            onClick={handleAddToCart}
            aria-label="Add to cart"
            className="absolute bottom-3 right-3 w-10 h-10 rounded-lg bg-hack-yellow flex items-center justify-center border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#1A1A1A] hover:shadow-[1px_1px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
          >
            <ShoppingCart className="w-5 h-5 text-hack-black" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Content — light, bold, like the categories cards */}
      <div className="p-4 flex items-start justify-between gap-3 bg-white">
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-black text-[15px] text-hack-black mb-1 line-clamp-2 leading-snug">
            {product.name}
          </h3>
          {product.rating !== undefined && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-hack-yellow border-[1.5px] border-hack-black rounded-md">
                <Star className="w-3 h-3 fill-hack-black text-hack-black" strokeWidth={2} />
                <span className="text-[11px] font-black text-hack-black leading-none">
                  {product.rating}
                </span>
              </span>
              {product.reviews !== undefined && (
                <span className="text-[11px] text-hack-black/55 font-mono font-semibold">
                  ({product.reviews})
                </span>
              )}
            </div>
          )}
          <div className="flex items-baseline gap-2">
            {product.isFree ? (
              <span className="font-display font-black text-lg text-emerald-600">
                Free
              </span>
            ) : (
              <>
                <span className="font-display font-black text-lg text-hack-black">
                  {product.price}
                </span>
                {product.regularPrice && product.regularPrice !== product.price && (
                  <span className="text-sm text-hack-black/40 line-through font-mono font-semibold">
                    {product.regularPrice}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Arrow chip — same visual language as categories cards */}
        <div className="shrink-0 self-center w-10 h-10 rounded-lg bg-hack-magenta flex items-center justify-center border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#1A1A1A] group-hover:rotate-12 transition-transform">
          <ArrowUpRight className="w-5 h-5 text-hack-black" strokeWidth={2.75} />
        </div>
      </div>
    </Link>
  );
}
