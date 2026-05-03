import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export default function StickyCheckoutBar() {
  const { state, cartCount, cartTotal } = useStore();
  const { pathname } = useLocation();

  // Hide on cart, checkout, account, login pages
  if (cartCount === 0) return null;
  if (/^\/(cart|checkout|order-pending|login|signup|account|verify|auth)/.test(pathname)) return null;

  return (
    <div className="lg:hidden fixed left-0 right-0 z-40 px-3 pointer-events-none" style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
      <Link
        to="/checkout"
        className="pointer-events-auto flex items-center justify-between gap-3 max-w-md mx-auto bg-hack-yellow text-hack-black border-[3px] border-hack-black rounded-full pl-4 pr-2 py-2 shadow-[4px_4px_0_rgba(0,0,0,0.85)] active:scale-[0.98] transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-hack-magenta text-white text-[10px] font-mono font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">{state.cart.reduce((n, i) => n + i.quantity, 0)}</span>
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
    </div>
  );
}
