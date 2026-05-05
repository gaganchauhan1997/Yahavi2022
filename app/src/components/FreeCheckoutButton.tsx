import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStore } from "@/context/StoreContext";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { createFreeOrder } from "@/lib/checkout-api";

/**
 * FreeCheckoutButton — replaces "Proceed to Checkout" when the cart
 * contains ONLY free products. Skips Razorpay entirely.
 *
 * Race-safe submission:
 *   - `submittingRef` is a synchronous useRef guard set BEFORE the React
 *     state update; two clicks fired in the same microtask cannot both
 *     pass it (whereas useState `busy` would, because state batching
 *     means the second click sees the same `busy=false` value).
 *   - Cart snapshot is taken once at click time and frozen for the entire
 *     request lifetime.
 *   - `onSubmitting(true|false)` lets the parent disable cart mutation
 *     controls (+/-/trash) while the request is in flight, eliminating
 *     the "user changes cart while request is processing" inconsistency.
 *   - Server-side idempotency (cart fingerprint + 30s lock) is the
 *     authoritative duplicate guard; this client-side guard is just the
 *     first line of defence.
 */
export default function FreeCheckoutButton({
  className = "",
  onAfterCheckout,
  onSubmitting,
}: {
  className?: string;
  onAfterCheckout?: () => void;
  onSubmitting?: (active: boolean) => void;
}) {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  // Synchronous guard — set immediately on click, before React state.
  const submittingRef = useRef(false);

  const setSubmitting = (active: boolean) => {
    submittingRef.current = active;
    setBusy(active);
    if (onSubmitting) onSubmitting(active);
  };

  const handleClick = async () => {
    // Synchronous double-submit guard: two clicks in the same microtask
    // both see submittingRef.current === false with useState alone.
    // Using a ref makes the second click a no-op deterministically.
    if (submittingRef.current) return;

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

    // Freeze cart snapshot immediately — request will use this frozen
    // payload regardless of any concurrent mutation attempts.
    //
    // FREE-PRODUCT INVARIANT: every free download is exactly one digital
    // file. Quantity > 1 is meaningless (and causes WooCommerce's
    // grant_download_permissions to grant N rows, surfacing as duplicate
    // entries on the My Downloads page). We dedupe by product_id and
    // hard-cap quantity to 1 on the client; the server enforces the
    // same invariant as the authoritative guard.
    const seenIds = new Set<number>();
    const itemsSnapshot: { product_id: number; quantity: number }[] = [];
    for (const ci of state.cart) {
      const pid = Number(ci.product.id);
      if (!pid || seenIds.has(pid)) continue;
      seenIds.add(pid);
      itemsSnapshot.push({ product_id: pid, quantity: 1 });
    }

    setSubmitting(true);
    try {
      const res = await createFreeOrder({
        items: itemsSnapshot,
        email: user.email,
        first_name: user.first_name || user.name?.split(" ")[0] || "",
        last_name:  user.last_name  || user.name?.split(" ").slice(1).join(" ") || "",
      });

      dispatch({ type: "CLEAR_CART" });
      window.dispatchEvent(new Event("yavi:wallet:refresh"));
      toast.success(
        `Order #${res.order_number} confirmed — ${res.downloads.length} download${res.downloads.length === 1 ? "" : "s"} ready.`
      );
      if (onAfterCheckout) onAfterCheckout();
      navigate("/account/downloads", { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not complete free checkout";
      // The server returns a structured "duplicate" 409 if our cart
      // fingerprint matches a recent (<30s) attempt. Surface that as a
      // friendly message rather than a scary error.
      if (msg.includes("duplicate") || msg.includes("already")) {
        toast.info("Your previous request is still being processed — please wait a moment.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
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
