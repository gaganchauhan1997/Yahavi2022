import { Home, Store, LayoutGrid, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Mobile bottom navigation — 4 primary destinations.
 *
 * Visual style: HD outline icons (strokeWidth 1.5, no fill), slate tone for
 * inactive, hack-black for active. NOT bold/chunky — clean reference style
 * matching the design spec.
 */
const items = [
  { to: '/',                 icon: Home,       label: 'Home' },
  { to: '/shop',             icon: Store,      label: 'Store' },
  { to: '/account',          icon: LayoutGrid, label: 'Dashboards' },
  { to: '/account/profile',  icon: User,       label: 'Profile' },
];

export default function MobileBottomBar() {
  const location = useLocation();
  // Normalise: strip trailing slash so `/account/profile/` matches `/account/profile`
  const path = location.pathname.length > 1
    ? location.pathname.replace(/\/+$/, '')
    : location.pathname;

  const isItemActive = (to: string) => {
    if (to === '/') return path === '/';
    if (to === '/account') {
      // Dashboards = /account exactly OR sub-sections, but NOT /account/profile family
      if (path === '/account/profile' || path.startsWith('/account/profile/')) return false;
      return path === '/account' || path.startsWith('/account/');
    }
    return path === to || path.startsWith(to + '/');
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-slate-200 shadow-[0_-2px_8px_rgba(15,23,42,0.04)]"
      aria-label="Mobile navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-4 px-1 pt-1.5 pb-1.5">
        {items.map(({ to, icon: Icon, label }) => {
          const isActive = isItemActive(to);
          return (
            <li key={label}>
              <Link
                to={to}
                aria-current={isActive ? 'page' : undefined}
                className="flex flex-col items-center gap-1 py-1 group"
              >
                <Icon
                  className={`w-7 h-7 transition-colors ${
                    isActive ? 'text-hack-black' : 'text-slate-500 group-hover:text-slate-700'
                  }`}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span
                  className={`text-[11px] tracking-wide transition-colors ${
                    isActive ? 'text-hack-black font-semibold' : 'text-slate-500 font-normal'
                  }`}
                >
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
