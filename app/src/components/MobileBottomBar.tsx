import { Home, ShoppingBag, Heart, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '@/context/StoreContext';
import { isAuthenticated } from '@/lib/auth';

const items = [
  { to: '/',                 icon: Home,        label: 'Home' },
  { to: '/shop',             icon: ShoppingBag, label: 'Shop' },
  { to: '/account/wishlist', icon: Heart,       label: 'Wishlist', requiresAuth: true },
  { to: '/account',          icon: User,        label: 'Account' },
];

export default function MobileBottomBar() {
  const { state } = useStore();
  const location = useLocation();
  const authed = isAuthenticated();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t-[3px] border-hack-black shadow-[0_-4px_0_0_rgba(26,26,26,0.08)]"
      aria-label="Mobile navigation"
    >
      <ul className="grid grid-cols-4 px-2 pt-2 pb-2.5">
        {items.map(({ to, icon: Icon, label, requiresAuth }) => {
          const target = requiresAuth && !authed ? '/login' : to;
          const isActive = location.pathname === to;
          const showWishlistBadge = label === 'Wishlist' && state.wishlist.length > 0;
          return (
            <li key={label}>
              <Link
                to={target}
                aria-current={isActive ? 'page' : undefined}
                className="flex flex-col items-center gap-1 py-1 group"
              >
                <span className="relative inline-flex items-center justify-center">
                  <Icon
                    className={`w-8 h-8 transition-transform ${
                      isActive ? 'scale-110' : 'group-hover:scale-105'
                    }`}
                    strokeWidth={2.5}
                    fill="#FFF055"
                    color="#1A1A1A"
                  />
                  {showWishlistBadge && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {state.wishlist.length}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-bold text-hack-black tracking-wide">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
