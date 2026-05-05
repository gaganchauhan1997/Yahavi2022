import { useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import FreeCheckoutButton from "@/components/FreeCheckoutButton";

function detectFreeOnly(items: { product: { isFree?: boolean; price?: unknown } }[]): boolean {
  if (items.length === 0) return false;
  return items.every(({ product }) => {
    if (product.isFree === true) return true;
    if (typeof product.price === "number") return product.price === 0;
    if (typeof product.price === "string") {
      // Hardened: must contain at least one digit AND parse to 0.
      // Rejects "", "N/A", "Contact", "TBD", etc. — those are not "free",
      // they are "unknown price" and must go through paid checkout.
      const cleaned = product.price.replace(/[^\d.]/g, "");
      if (!/\d/.test(cleaned)) return false;
      return parseFloat(cleaned) === 0;
    }
    // null / undefined / object price → unknown, NOT free
    return false;
  });
}

export default function CartDrawer() {
  const { state, dispatch, cartTotal, cartCount } = useStore();
  const isFreeOnly = detectFreeOnly(state.cart);
  const [cartLocked, setCartLocked] = useState(false);

  return (
    <Sheet
      open={state.isCartOpen}
      onOpenChange={() => dispatch({ type: "TOGGLE_CART" })}
    >
      <SheetContent className="w-full sm:max-w-md bg-hack-white border-l border-hack-black/10 p-0 flex flex-col">
        <SheetHeader className="p-5 border-b border-hack-black/10">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display font-bold text-lg flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Your Cart
              {cartCount > 0 && (
                <span className="text-sm font-mono text-hack-black/60">
                  ({cartCount} items)
                </span>
              )}
            </SheetTitle>
          </div>
        </SheetHeader>

        {state.cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-hack-black/5 flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-hack-black/30" />
            </div>
            <p className="font-display font-bold text-lg mb-2">
              Your cart is empty
            </p>
            <p className="text-sm text-hack-black/60 mb-6">
              Browse our collection and find something you love.
            </p>
            <Link
              to="/shop"
              onClick={() => dispatch({ type: "TOGGLE_CART" })}
            >
              <Button className="bg-hack-black text-hack-white hover:bg-hack-black/80 rounded-full px-6">
                Start Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-5">
              <div className="py-4 space-y-4">
                {state.cart.map((item) => (
                  <div key={item.product.id} className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl bg-hack-black/5 flex-shrink-0 overflow-hidden">
                      {item.product.image?.sourceUrl && (
                        <img
                          src={item.product.image.sourceUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-xs text-hack-black/50 font-mono mt-0.5">
                        {item.product.isFree ? "Free" : item.product.price}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() =>
                            dispatch({
                              type: "UPDATE_QUANTITY",
                              productId: item.product.id,
                              quantity: item.quantity - 1,
                            })
                          }
                          disabled={cartLocked}
                          className="w-7 h-7 rounded-full border border-hack-black/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center hover:bg-hack-black/5 transition-colors"
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
                          disabled={cartLocked}
                          className="w-7 h-7 rounded-full border border-hack-black/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center hover:bg-hack-black/5 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() =>
                            dispatch({
                              type: "REMOVE_FROM_CART",
                              productId: item.product.id,
                            })
                          }
                          disabled={cartLocked}
                          className="ml-auto p-2 text-hack-black/40 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t border-hack-black/10 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-hack-black/60">Subtotal</span>
                <span className="font-display font-bold text-lg">
                  {isFreeOnly ? "Free" : `₹${cartTotal.toFixed(2)}`}
                </span>
              </div>
              <p className="text-xs text-hack-black/50">
                {isFreeOnly
                  ? "All items are free — no payment required."
                  : "Taxes calculated at checkout."}
              </p>
              <Separator />

              {/* T4 — dynamic smart cart routing inside the drawer too */}
              {isFreeOnly ? (
                <FreeCheckoutButton onAfterCheckout={() => dispatch({ type: "TOGGLE_CART" })} onSubmitting={setCartLocked} />
              ) : (
                <Link
                  to="/checkout"
                  onClick={() => dispatch({ type: "TOGGLE_CART" })}
                  className="block"
                >
                  <Button className="w-full bg-hack-black text-hack-white hover:bg-hack-black/80 rounded-full h-12 font-medium">
                    Checkout
                  </Button>
                </Link>
              )}

              <button
                onClick={() => dispatch({ type: "TOGGLE_CART" })}
                className="w-full text-center text-sm text-hack-black/60 hover:text-hack-black transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
