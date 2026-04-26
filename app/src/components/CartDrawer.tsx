import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export default function CartDrawer() {
  const { state, dispatch, cartTotal, cartCount } = useStore();

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
                      <img
                        src={item.product.image?.sourceUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
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
                          className="w-7 h-7 rounded-full border border-hack-black/20 flex items-center justify-center hover:bg-hack-black/5 transition-colors"
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
                          className="w-7 h-7 rounded-full border border-hack-black/20 flex items-center justify-center hover:bg-hack-black/5 transition-colors"
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
                          className="ml-auto p-2 text-hack-black/40 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
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
                  ₹{cartTotal.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-hack-black/50">
                Taxes calculated at checkout.
              </p>
              <Separator />
              <Link
                to="/checkout"
                onClick={() => dispatch({ type: "TOGGLE_CART" })}
                className="block"
              >
                <Button className="w-full bg-hack-black text-hack-white hover:bg-hack-black/80 rounded-full h-12 font-medium">
                  Checkout
                </Button>
              </Link>
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
