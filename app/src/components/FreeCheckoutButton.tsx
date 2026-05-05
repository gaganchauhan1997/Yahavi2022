import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStore } from "@/context/StoreContext";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { createFreeOrder } from "@/lib/checkout-api";

/**
 * FreeCheckoutButton — replaces "Proceed to Checkout" when the cart
 * contains ONLY free products. Skips Razorpay entirely:
 *   1. Auth gate (push to /login?next=/cart if logged out)
 *   2. POST /wp-json/hackknow/v1/order-free with the cart items
 *   3. On success → clear cart, toast, navigate to /account/downloads
 *
 * Server-side validation hard-asserts price=0 + downloadable + has file
 * for every item, so this button can never accidentally process paid items.
 */
export default function FreeCheckoutButton({
  className = "",
  onAfterCheckout,
}: {
  className?: string;
  onAfterCheckout?: () => void;
}) {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;

    if (!isAuthenticated()) {
      toast.info("Please sign in to claim your free downloads.");
      navigate("/login?next=/cart");
      return;
    }
    const user = getCurrentUser();
    if (!user?.email) {
      toast.error("We couldn't find your email. Please log in again.");
      navigate("/login?next=/cart");
      return;
    }
    if (state.cart.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    setBusy(true);
    try {
      const items = state.cart.map((ci) => ({
        product_id: Number(ci.product.id),
        quantity: Math.max(1, ci.quantity),
      }));
      const res = await createFreeOrder({
        items,
        email: user.email,
        first_name: user.first_name || user.name?.split(" ")[0] || "",
        last_name:  user.last_name  || user.name?.split(" ").slice(1).join(" ") || "",
      });

      // Success — clear cart, toast, refresh wallet badge (in case order
      // earned any YAVI bonus on the backend), navigate to downloads.
      dispatch({ type: "CLEAR_CART" });
      window.dispatchEvent(new Event("yavi:wallet:refresh"));
      toast.success(
        `Order #${res.order_number} confirmed — ${res.downloads.length} download${res.downloads.length === 1 ? "" : "s"} ready.`
      );
      if (onAfterCheckout) onAfterCheckout();
      navigate("/account/downloads", { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not complete free checkout";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={busy || state.cart.length === 0}
      className={`w-full h-12 bg-green-600 text-white hover:bg-green-700 rounded-full font-bold gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      data-testid="free-checkout-button"
    >
      {busy ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating your downloads…
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Click to Download (Free)
        </>
      )}
    </Button>
  );
}
