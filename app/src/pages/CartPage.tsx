import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";

export default function CartPage() {
  const { state, dispatch, cartTotal, cartCount } = useStore();

  if (state.cart.length === 0) {
    return (
      <div className="pt-32 pb-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-hack-black/5 flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-8 h-8 text-hack-black/30" />
            </div>
            <h1 className="font-display font-bold text-2xl mb-3">
              Your Cart is Empty
            </h1>
            <p className="text-hack-black/60 mb-8">
              Looks like you haven&apos;t added anything to your cart yet.
              Browse our collection and find something you love.
            </p>
            <Link to="/shop">
              <Button className="bg-hack-black text-hack-white hover:bg-hack-black/80 rounded-full px-8 h-12">
                Start Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display font-bold text-3xl lg:text-4xl mb-8">
            Shopping Cart ({cartCount})
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {state.cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-4 p-4 bg-white rounded-2xl border border-hack-black/5"
                >
                  <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-hack-black/5">
                    <img
                      src={item.product.image?.sourceUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link
                          to={`/product/${item.product.slug}`}
                          className="font-medium hover:text-hack-magenta transition-colors"
                        >
                          {item.product.name}
                        </Link>
                        {item.product.author && (
                          <p className="text-sm text-hack-black/50 font-mono mt-0.5">
                            {item.product.author}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          dispatch({
                            type: "REMOVE_FROM_CART",
                            productId: item.product.id,
                          })
                        }
                        className="p-2 text-hack-black/40 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            dispatch({
                              type: "UPDATE_QUANTITY",
                              productId: item.product.id,
                              quantity: item.quantity - 1,
                            })
                          }
                          className="w-8 h-8 rounded-full border border-hack-black/20 flex items-center justify-center hover:bg-hack-black/5 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-mono w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            dispatch({
                              type: "UPDATE_QUANTITY",
                              productId: item.product.id,
                              quantity: item.quantity + 1,
                            })
                          }
                          className="w-8 h-8 rounded-full border border-hack-black/20 flex items-center justify-center hover:bg-hack-black/5 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-display font-bold">
                        {item.product.price ?? 'Free'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:sticky lg:top-28 h-fit">
              <div className="bg-white rounded-2xl border border-hack-black/5 p-6">
                <h2 className="font-display font-bold text-lg mb-4">
                  Order Summary
                </h2>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-hack-black/60">
                      Subtotal ({cartCount} items)
                    </span>
                    <span className="font-medium">₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-hack-black/60">Discount</span>
                    <span className="font-medium text-green-600">-₹0.00</span>
                  </div>
                </div>
                <div className="border-t border-hack-black/10 pt-4 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold">Total</span>
                    <span className="font-display font-bold text-xl">
                      ₹{cartTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
                <Link to="/checkout" className="block">
                  <Button className="w-full h-12 bg-hack-black text-hack-white hover:bg-hack-black/80 rounded-full font-bold gap-2">
                    Proceed to Checkout
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link
                  to="/shop"
                  className="block text-center text-sm text-hack-black/60 hover:text-hack-black transition-colors mt-4"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
