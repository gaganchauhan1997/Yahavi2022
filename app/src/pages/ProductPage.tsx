import { useParams, Link } from "react-router-dom";
import DOMPurify from 'dompurify';
import { Heart, ShoppingCart, Star, Download, Check, Shield, ArrowRight } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { getProductBySlug, getRelatedProducts } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { dispatch, toggleWishlist, state } = useStore();

  const product = slug ? getProductBySlug(state.products, slug) : undefined;
  const relatedProducts = product ? getRelatedProducts(state.products, product) : [];
  const isInWishlist = product ? state.wishlist.includes(product.id) : false;
  const productImage = product?.image?.sourceUrl?.trim();

  if (state.loading) {
    return (
      <div className="pt-32 pb-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-hack-black border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-hack-black/60">Loading product…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-32 pb-20 text-center">
        <h1 className="font-display font-bold text-2xl mb-4">
          Product Not Found
        </h1>
        <p className="text-hack-black/60 mb-6">
          The product you are looking for does not exist.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 bg-hack-black text-hack-white rounded-full text-sm font-bold"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    dispatch({ type: "ADD_TO_CART", product });
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product.id);
  };

  return (
    <div className="pt-24 lg:pt-28 pb-20">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-hack-black/50 mb-6">
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
            <span>/</span>
            <span className="text-hack-black truncate max-w-xs">
              {product.name}
            </span>
          </div>

          {/* Product Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 mb-16">
            {/* Image */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl lg:rounded-3xl overflow-hidden bg-hack-black/5">
                {productImage ? (
                  <img
                    src={productImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-hack-black/5 to-hack-yellow/20 px-8 text-center">
                    <span className="font-display text-2xl font-bold text-hack-black/50">
                      {product.name}
                    </span>
                  </div>
                )}
              </div>
              {product.isNew && (
                <Badge className="absolute top-4 left-4 bg-hack-yellow text-hack-black font-bold">
                  NEW
                </Badge>
              )}
              {product.isBestseller && (
                <Badge className="absolute top-4 left-20 bg-hack-magenta text-white font-bold">
                  BESTSELLER
                </Badge>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col">
              <h1 className="font-display font-bold text-2xl lg:text-4xl tracking-tight mb-3">
                {product.name}
              </h1>

              {(product.rating !== undefined || product.sales !== undefined) && (
                <div className="flex items-center gap-3 mb-4">
                  {product.rating !== undefined && (
                    <>
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 fill-hack-yellow text-hack-yellow" />
                        <span className="font-medium">{product.rating}</span>
                      </div>
                      {product.reviews !== undefined && (
                        <span className="text-hack-black/40">
                          ({product.reviews} reviews)
                        </span>
                      )}
                    </>
                  )}
                  {product.sales !== undefined && (
                    <>
                      <span className="text-hack-black/40">|</span>
                      <span className="text-hack-black/60 font-mono text-sm">
                        {product.sales.toLocaleString()} sales
                      </span>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-baseline gap-3 mb-6">
                {product.isFree ? (
                  <span className="font-display font-bold text-3xl lg:text-4xl text-green-600">
                    Free
                  </span>
                ) : (
                  <>
                    <span className="font-display font-bold text-3xl lg:text-4xl">
                      {product.price}
                    </span>
                    {product.regularPrice && product.regularPrice !== product.price && (
                      <span className="text-lg text-hack-black/40 line-through">
                        {product.regularPrice}
                      </span>
                    )}
                  </>
                )}
              </div>

              {product.description && (
                <div
                  className="text-hack-black/70 leading-relaxed mb-8 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(product.description),
                  }}
                />
              )}

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-hack-black/5 rounded-full text-xs font-mono capitalize"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mb-8">
                <Button
                  onClick={handleAddToCart}
                  className="flex-1 h-14 bg-hack-black text-hack-white hover:bg-hack-black/80 rounded-full font-bold text-base gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {product.isFree ? "Download Free" : "Add to Cart"}
                </Button>
                <Button
                  onClick={handleToggleWishlist}
                  variant="outline"
                  className="w-14 h-14 rounded-full border-hack-black/20 hover:border-hack-magenta hover:text-hack-magenta"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isInWishlist
                        ? "fill-red-500 text-red-500"
                        : ""
                    }`}
                  />
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-hack-black/60">
                  <Download className="w-4 h-4" />
                  <span>Instant Download</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-hack-black/60">
                  <Check className="w-4 h-4" />
                  <span>Quality Verified</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-hack-black/60">
                  <Shield className="w-4 h-4" />
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-hack-black/60">
                  <Check className="w-4 h-4" />
                  <span>Commercial License</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="description" className="mb-16">
            <TabsList className="bg-hack-black/5 rounded-full p-1">
              <TabsTrigger
                value="description"
                className="rounded-full px-6 data-[state=active]:bg-hack-black data-[state=active]:text-hack-white"
              >
                Description
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="rounded-full px-6 data-[state=active]:bg-hack-black data-[state=active]:text-hack-white"
              >
                Reviews{product.reviews !== undefined ? ` (${product.reviews})` : ''}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="mt-6">
              <div className="bg-white rounded-2xl p-6 lg:p-8 border border-hack-black/5">
                <h3 className="font-display font-bold text-lg mb-4">
                  About This Product
                </h3>
                <div
                  className="text-hack-black/70 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      (product.description || product.shortDescription ||
                        'Premium digital asset designed to save you time and elevate your projects.') +
                        ' All files are professionally crafted, fully editable, and ready to use immediately after download.'
                    ),
                  }}
                />
                <h4 className="font-display font-bold text-lg mt-6 mb-3">
                  What&apos;s Included
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-hack-black/70">
                    <Check className="w-4 h-4 text-green-500" />
                    Fully editable source files
                  </li>
                  <li className="flex items-center gap-2 text-sm text-hack-black/70">
                    <Check className="w-4 h-4 text-green-500" />
                    Commercial license included
                  </li>
                  <li className="flex items-center gap-2 text-sm text-hack-black/70">
                    <Check className="w-4 h-4 text-green-500" />
                    Free lifetime updates
                  </li>
                  <li className="flex items-center gap-2 text-sm text-hack-black/70">
                    <Check className="w-4 h-4 text-green-500" />
                    24/7 customer support
                  </li>
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="reviews" className="mt-6">
              <div className="bg-white rounded-2xl p-6 lg:p-8 border border-hack-black/5">
                {product.rating !== undefined && (
                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-center">
                      <p className="font-display font-bold text-4xl">
                        {product.rating}
                      </p>
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(product.rating!)
                                ? "fill-hack-yellow text-hack-yellow"
                                : "text-hack-black/20"
                            }`}
                          />
                        ))}
                      </div>
                      {product.reviews !== undefined && (
                        <p className="text-xs text-hack-black/50 mt-1">
                          {product.reviews} reviews
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  {[
                    { name: "Alex Thompson", rating: 5, date: "2 weeks ago", text: "Absolutely love this template! Saved me so much time and the quality is top-notch." },
                    { name: "Maria Garcia", rating: 5, date: "1 month ago", text: "Best purchase I've made this year. Highly professional and easy to customize." },
                    { name: "James Wilson", rating: 4, date: "2 months ago", text: "Great quality product. Minor tweaks needed but overall very satisfied." },
                  ].map((review, index) => (
                    <div key={index} className="border-t border-hack-black/5 pt-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-hack-black/10 flex items-center justify-center text-xs font-bold">
                          {review.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{review.name}</p>
                          <p className="text-xs text-hack-black/50">{review.date}</p>
                        </div>
                        <div className="ml-auto flex gap-0.5">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-hack-yellow text-hack-yellow" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-hack-black/70">{review.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-display font-bold text-2xl">
                  You May Also Like
                </h2>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-1 text-sm font-medium hover:text-hack-magenta transition-colors"
                >
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
