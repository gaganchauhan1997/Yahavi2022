import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ShoppingBag, X } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

/**
 * Sticky bottom checkout pill (mobile only).
 *
 * UX:
 *  - Slim pill above the bottom nav whenever the cart has items (off cart/checkout/auth routes).
 *  - Tap × to MINIMISE → bar disappears completely. The header cart icon (already visible
 *    at the top, with its own count badge + drawer) becomes the single source of truth
 *    for the cart while minimised. No floating chip clutter.
 *  - Sessionscoped via sessionStorage so it survives route changes but resets on new visit.
 *  - If cart count INCREASES (user added a new item) we auto-restore so the user gets
 *    immediate feedback that the new item landed.
 */
export default function StickyCheckoutBar() {
  const { state, cartCount, cartTotal } = useStore();
  const { pathname } = useLocation();

  const [minimised, setMinimised] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return sessionStorage.getItem('hk_checkout_pill_min') === '1'; } catch { return false; }
  });

  // Auto-restore when the cart grows (new item added) so user sees confirmation
  const prevCountRef = useRef(cartCount);
  useEffect(() => {
    if (cartCount > prevCountRef.current && minimised) {
      setMinimised(false);
      try { sessionStorage.removeItem('hk_checkout_pill_min'); } catch {}
    }
    prevCountRef.current = cartCount;
  }, [cartCount, minimised]);

  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setMinimised(true);
    try { sessionStorage.setItem('hk_checkout_pill_min', '1'); } catch {}
  };

  // Hide entirely on cart, checkout, account, login pages or empty cart
  if (cartCount === 0) return null;
  if (/^\/(cart|checkout|order-pending|login|signup|account|verify|auth)/.test(pathname)) return null;

  // Minimised → render nothing. The header cart icon at the top of the page is
  // the cart access point while minimised (it already shows the count badge and
  // opens the cart drawer on tap). No floating chip needed.
  if (minimised) return null;

  // Expanded state: slim pill, lifted above the bottom nav
  return (
    <div
      className="lg:hidden fixed left-0 right-0 z-40 px-4 pointer-events-none"
      style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
    >
      <div className="pointer-events-auto flex items-center gap-1.5 max-w-xs mx-auto bg-hack-yellow text-hack-black border-2 border-hack-black rounded-full pl-3 pr-1.5 py-1 shadow-[3px_3px_0_rgba(0,0,0,0.85)]">
        <Link
          to="/checkout"
          className="flex items-center justify-between gap-2 flex-1 min-w-0 active:scale-[0.98] transition"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative shrink-0">
              <ShoppingBag className="w-4 h-4" strokeWidth={2.25} />
              <span className="absolute -top-1.5 -right-1.5 bg-hack-magenta text-white text-[9px] font-mono font-bold rounded-full min-w-[15px] h-[15px] px-1 flex items-center justify-center">
                {state.cart.reduce((n, i) => n + i.quantity, 0)}
              </span>
            </span>
            <div className="min-w-0 leading-none">
              <div className="font-bold text-[13px] leading-tight truncate">Checkout</div>
              <div className="text-[10px] text-hack-black/70 leading-tight mt-0.5">₹{cartTotal.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <span className="bg-hack-black text-hack-yellow rounded-full p-1.5 shrink-0">
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Minimise checkout bar"
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-hack-black/60 hover:text-hack-black hover:bg-hack-black/10 active:scale-90 transition"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
