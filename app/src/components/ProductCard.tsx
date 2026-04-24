import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import type { Product } from "@/data/products";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className = "" }: ProductCardProps) {
  const { dispatch, state } = useStore();
  const isInWishlist = state.wishlist.includes(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: "ADD_TO_CART", product });
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: "TOGGLE_WISHLIST", productId: product.id });
  };

  return (
    <Link
      to={`/product/${product.slug}`}
      className={`group block bg-white rounded-2xl overflow-hidden card-hover ${className}`}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-hack-black/5">
        <img
          src={product.image?.sourceUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {product.isNew && (
            <span className="px-2.5 py-1 bg-hack-yellow text-hack-black text-xs font-bold rounded-full">
              NEW
            </span>
          )}
          {product.isBestseller && (
            <span className="px-2.5 py-1 bg-hack-magenta text-white text-xs font-bold rounded-full">
              BESTSELLER
            </span>
          )}
          {product.isFree && (
            <span className="px-2.5 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
              FREE
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white"
          aria-label="Toggle wishlist"
        >
          <Heart
            className={`w-4 h-4 ${
              isInWishlist
                ? "fill-red-500 text-red-500"
                : "text-hack-black/60"
            }`}
          />
        </button>

        {/* Quick Add Button */}
        {!product.isFree && (
          <button
            onClick={handleAddToCart}
            className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-hack-black text-hack-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:bg-hack-black/80"
            aria-label="Add to cart"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-sm mb-1 line-clamp-1 group-hover:text-hack-magenta transition-colors">
          {product.name}
        </h3>
        {product.rating !== undefined && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-hack-yellow text-hack-yellow" />
              <span className="text-xs font-medium">{product.rating}</span>
            </div>
            {product.reviews !== undefined && (
              <span className="text-xs text-hack-black/40">
                ({product.reviews} reviews)
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          {product.isFree ? (
            <span className="font-display font-bold text-lg text-green-600">
              Free
            </span>
          ) : (
            <>
              <span className="font-display font-bold text-lg">
                {product.price}
              </span>
              {product.regularPrice && product.regularPrice !== product.price && (
                <span className="text-sm text-hack-black/40 line-through">
                  {product.regularPrice}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
