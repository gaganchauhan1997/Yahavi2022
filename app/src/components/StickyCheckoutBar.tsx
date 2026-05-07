import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ShoppingBag, X } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

/**
 * Sticky bottom checkout pill (mobile only).
 *
 * UX:
 *  - Visible by default whenever the cart has items (off cart/checkout/auth routes).
 *  - User can tap the small × on the right to MINIMISE it. Persists for the session
 *    via sessionStorage so it survives route changes but resets on new tab/visit.
 *  - When minimised, a tiny round bag chip sits in the corner — tap to expand again.
 *  - If the cart count INCREASES (user added a new item), the bar auto-expands so
 *    the user gets feedback that the new item landed.
 */
export default function StickyCheckoutBar() {
  const { state, cartCount, cartTotal } = useStore();
  const { pathname } = useLocation();

  const [minimised, setMinimised] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return sessionStorage.getItem('hk_checkout_pill_min') === '1'; } catch { return false; }
  });

  // Auto-expand when the cart grows (new item added) so user sees confirmation
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
  const restore = () => {
    setMinimised(false);
    try { sessionStorage.removeItem('hk_checkout_pill_min'); } catch {}
  };

  // Hide entirely on cart, checkout, account, login pages or empty cart
  if (cartCount === 0) return null;
  if (/^\/(cart|checkout|order-pending|login|signup|account|verify|auth)/.test(pathname)) return null;

  // ─── Minimised state: small round bag chip in the corner ───
  if (minimised) {
    return (
      <button
        type="button"
        onClick={restore}
        aria-label={`Show checkout (${cartCount} item${cartCount === 1 ? '' : 's'} in cart)`}
        className="lg:hidden fixed right-3 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-hack-yellow text-hack-black border-[3px] border-hack-black shadow-[4px_4px_0_rgba(0,0,0,0.85)] active:scale-[0.95] transition"
        style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}
      >
        <span className="relative">
          <ShoppingBag className="w-5 h-5" strokeWidth={2.5} />
          <span className="absolute -top-2 -right-2 bg-hack-magenta text-white text-[10px] font-mono font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-hack-black">
            {cartCount}
          </span>
        </span>
      </button>
    );
  }

  // ─── Expanded state: full pill with X dismiss ───
  return (
    <div className="lg:hidden fixed left-0 right-0 z-40 px-3 pointer-events-none" style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
      <div className="pointer-events-auto flex items-center gap-2 max-w-md mx-auto bg-hack-yellow text-hack-black border-[3px] border-hack-black rounded-full pl-4 pr-2 py-2 shadow-[4px_4px_0_rgba(0,0,0,0.85)]">
        <Link
          to="/checkout"
          className="flex items-center justify-between gap-3 flex-1 min-w-0 active:scale-[0.98] transition"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative shrink-0">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-hack-magenta text-white text-[10px] font-mono font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                {state.cart.reduce((n, i) => n + i.quantity, 0)}
              </span>
            </span>
            <div className="min-w-0">
              <div className="font-bold text-sm leading-tight truncate">Checkout now</div>
              <div className="text-xs text-hack-black/70 leading-tight">₹{cartTotal.toLocaleString('en-IN')} · Free download</div>
            </div>
          </div>
          <span className="bg-hack-black text-hack-yellow rounded-full p-2 shrink-0">
            <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Minimise checkout bar"
          className="shrink-0 -mr-1 w-8 h-8 rounded-full flex items-center justify-center text-hack-black/70 hover:text-hack-black hover:bg-hack-black/10 active:scale-90 transition"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
