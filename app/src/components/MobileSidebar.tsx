import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Award, BadgePercent, BookOpen, Brain, ChevronRight, GraduationCap,
  Heart, HelpCircle, Home, Loader2, LogOut, Map, MessageSquare, Newspaper, Package,
  PenLine, ShieldCheck, ShoppingBag, Sparkles, Store, Tag, User, UserPlus, X,
} from 'lucide-react';
import { fetchCourseCategories, type HKCategory } from '@/lib/hk-content';

type ShopCat = { id: string | number; slug: string; title: string; itemCount: number };

interface Props {
  onClose: () => void;
  shopCategories: ShopCat[];
  onSignOut: () => void;
  isAuthed: boolean;
}

type View = 'root' | 'shop' | 'courses' | 'account';

export default function MobileSidebar({ onClose, shopCategories, onSignOut, isAuthed }: Props) {
  const [view, setView] = useState<View>('root');
  const [courseCats, setCourseCats] = useState<HKCategory[] | null>(null);
  const [loadingCats, setLoadingCats] = useState(false);

  useEffect(() => {
    if (view !== 'courses' || courseCats !== null) return;
    setLoadingCats(true);
    fetchCourseCategories()
      .then(r => setCourseCats(r.items))
      .catch(() => setCourseCats([]))
      .finally(() => setLoadingCats(false));
  }, [view, courseCats]);

  // Lock body scroll while open
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />

      {/* Drawer */}
      <aside className="fixed top-0 left-0 bottom-0 z-50 w-full sm:w-[380px] bg-white shadow-[10px_0_0_rgba(0,0,0,0.15)] overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-hack-black text-white border-b-[3px] border-hack-yellow">
          <div className="flex items-center gap-2">
            {view !== 'root' && (
              <button onClick={() => setView('root')} className="p-2 hover:bg-white/10 rounded-full" aria-label="Back">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <span className="font-display font-bold text-lg">
              {view === 'root' ? 'Menu' : view === 'shop' ? 'Shop Categories' : view === 'courses' ? 'Course Tracks' : 'Your Account'}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 pb-24">
          {view === 'root' && (
            <RootView onNav={onClose} onDrillIn={setView} isAuthed={isAuthed} />
          )}
          {view === 'shop' && (
            <DrillList
              items={[
                { to: '/shop',                label: 'All Products',  meta: 'Everything' },
                { to: '/shop?filter=new',     label: 'New Arrivals',  meta: 'Just dropped' },
                { to: '/shop?filter=bestseller', label: 'Best Sellers', meta: 'Top picks' },
                { to: '/shop/free-resources', label: 'Freebies',      meta: 'Free' },
                ...shopCategories.map(c => ({
                  to: `/shop/${c.slug}`,
                  label: c.title,
                  meta: `${c.itemCount.toLocaleString()} items`,
                })),
              ]}
              onClose={onClose}
            />
          )}
          {view === 'courses' && (
            loadingCats ? (
              <div className="flex items-center gap-2 text-hack-black/60 py-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
            ) : (
              <DrillList
                items={[
                  { to: '/courses', label: 'All Courses', meta: 'Browse all' },
                  ...(courseCats || []).map(c => ({
                    to: `/courses/cat/${c.slug}`,
                    label: c.name,
                    meta: `${c.count} ${c.count === 1 ? 'course' : 'courses'}`,
                  })),
                ]}
                onClose={onClose}
              />
            )
          )}
          {view === 'account' && (
            <div className="space-y-2">
              {isAuthed ? (
                <>
                  <DrillItem to="/account"             label="My Account"  icon={User}     onClose={onClose} />
                  <DrillItem to="/account/downloads"   label="Downloads"   icon={Package}  onClose={onClose} />
                  <DrillItem to="/account/wishlist"    label="Wishlist"    icon={Heart}    onClose={onClose} />
                  <DrillItem to="/verify"              label="Verification" icon={ShieldCheck} onClose={onClose} />
                  <button onClick={onSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-[2px] border-hack-magenta/30 bg-white hover:bg-hack-magenta/5 text-hack-magenta font-bold transition">
                    <LogOut className="w-5 h-5" /> Sign out
                  </button>
                </>
              ) : (
                <>
                  <DrillItem to="/login"  label="Sign in"        icon={User}     onClose={onClose} />
                  <DrillItem to="/signup" label="Create account" icon={UserPlus} onClose={onClose} />
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/* ── Root view (top-level items) ──────────────────────── */
function RootView({ onNav, onDrillIn, isAuthed }: { onNav: () => void; onDrillIn: (v: View) => void; isAuthed: boolean }) {
  return (
    <div className="space-y-2">
      <DrillItem to="/"             label="Home"            icon={Home}        onClose={onNav} />
      <DrillButton                  label="Shop"            icon={ShoppingBag} onClick={() => onDrillIn('shop')} />
      <DrillButton                  label="Courses"         icon={GraduationCap} onClick={() => onDrillIn('courses')} subtitle="Verified students = 6mo FREE" />
      <DrillItem to="/roadmaps"     label="Roadmaps"        icon={Map}         onClose={onNav} subtitle="roadmap.sh-style, neobrutal" />
      <DrillItem to="/brainxercise" label="Brainxercise"    icon={Brain}       onClose={onNav} subtitle="Daily learning challenge"
        rightBadge={<span className="px-1.5 py-0.5 bg-hack-yellow border border-hack-black rounded text-[10px] font-mono">DAILY</span>} />
      <DrillItem to="/blog"         label="Blog"            icon={PenLine}     onClose={onNav} subtitle="258+ guides & tutorials" />
      <DrillItem to="/hacked-news"  label="Hacked News"     icon={Newspaper}   onClose={onNav} subtitle="Tools · championships · deadlines" />
      <DrillItem to="/mis-templates" label="MIS Templates"  icon={BadgePercent} onClose={onNav}
        rightBadge={<span className="px-1.5 py-0.5 bg-hack-yellow border border-hack-black rounded text-[10px] font-mono">90% OFF</span>} />
      <DrillItem to="/testimonials" label="Reviews"          icon={MessageSquare} onClose={onNav} subtitle="Real buyers · 963+ creators" />

      <div className="my-3 border-t border-hack-black/10" />

      <DrillItem to="/sponsor"          label="Sponsor"          icon={Award}       onClose={onNav} subtitle="Back creators · get featured" />
      <DrillItem to="/become-a-vendor"  label="Become a Vendor"  icon={Store}       onClose={onNav} subtitle="Sell on HackKnow" />
      <DrillItem to="/verify"           label="Get Verified"     icon={ShieldCheck} onClose={onNav} subtitle="Students · 6 months free" />
      <DrillItem to="/affiliate"        label="Earn — Affiliate" icon={Sparkles}    onClose={onNav} subtitle="Up to 88% commission" />
      <DrillItem to="/faq"              label="FAQ"              icon={HelpCircle}  onClose={onNav} />
      <DrillItem to="/about"            label="About"            icon={BookOpen}    onClose={onNav} />
      <DrillItem to="/support"          label="Support"          icon={Tag}         onClose={onNav} />

      <div className="my-3 border-t border-hack-black/10" />

      <DrillButton label={isAuthed ? 'Your Account' : 'Sign in / up'} icon={User} onClick={() => onDrillIn('account')} />
    </div>
  );
}

/* ── Reusable drill row ───────────────────────────────── */
function DrillItem({ to, label, icon: Icon, onClose, subtitle, rightBadge }: {
  to: string; label: string; icon: typeof Home; onClose: () => void; subtitle?: string; rightBadge?: React.ReactNode;
}) {
  return (
    <Link to={to} onClick={onClose}
      className="flex items-center gap-3 px-4 py-3.5 rounded-xl border-[2px] border-hack-black/15 hover:border-hack-black hover:bg-hack-yellow/20 transition">
      <Icon className="w-5 h-5 text-hack-black shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-base text-hack-black leading-tight">{label}</div>
        {subtitle && <div className="text-xs text-hack-black/55 mt-0.5">{subtitle}</div>}
      </div>
      {rightBadge}
      <ChevronRight className="w-4 h-4 text-hack-black/40" />
    </Link>
  );
}

function DrillButton({ label, icon: Icon, onClick, subtitle }: { label: string; icon: typeof Home; onClick: () => void; subtitle?: string }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-[2px] border-hack-black/15 hover:border-hack-black hover:bg-hack-yellow/20 transition text-left">
      <Icon className="w-5 h-5 text-hack-black shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-base text-hack-black leading-tight">{label}</div>
        {subtitle && <div className="text-xs text-hack-black/55 mt-0.5">{subtitle}</div>}
      </div>
      <ChevronRight className="w-4 h-4 text-hack-black/40" />
    </button>
  );
}

function DrillList({ items, onClose }: { items: { to: string; label: string; meta?: string }[]; onClose: () => void }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <Link key={i} to={it.to} onClick={onClose}
          className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border-[2px] border-hack-black/15 hover:border-hack-black hover:bg-hack-yellow/20 transition">
          <span className="font-display font-bold text-base text-hack-black">{it.label}</span>
          {it.meta && <span className="text-xs text-hack-black/55 font-mono">{it.meta}</span>}
        </Link>
      ))}
    </div>
  );
}
