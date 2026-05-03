import { useEffect, useRef, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { ShoppingBag, X } from 'lucide-react';
import { API_BASE } from '@/lib/api-base';

const NAMES = ['Rajesh', 'Priya', 'Arjun', 'Sneha', 'Vikram', 'Ananya', 'Rohit', 'Pooja', 'Amit', 'Kavita', 'Suresh', 'Meera', 'Karan', 'Divya', 'Manish', 'Riya', 'Aakash', 'Neha', 'Siddharth', 'Tara'];
const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Indore', 'Bhopal', 'Chandigarh', 'Surat', 'Nagpur', 'Kochi'];
const FALLBACK_PRODUCTS = ['Excel Sales Dashboard', 'HR Attendance Tracker', 'PowerPoint Pitch Deck', 'Marketing Plan Template', 'Inventory Tracker', 'GST Invoice Template', 'Project Tracker', 'Budget Planner'];

type Toast = { name: string; city: string; product: string; mins: number };

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }

export default function SocialProofToast() {
  const [products, setProducts] = useState<string[]>(FALLBACK_PRODUCTS);
  const [toast, setToast] = useState<Toast | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Fetch real product names once for authentic social proof
  useEffect(() => {
    fetch(`${API_BASE}/wp-json/wc/store/v1/products?per_page=24&orderby=popularity&_fields=name`)
      .then(r => r.ok ? r.json() : [])
      .then((arr: { name: string }[]) => {
        if (Array.isArray(arr) && arr.length > 5) {
          setProducts(arr.map(p => p.name).filter(Boolean));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (dismissed) return;

    let first: number | undefined;
    let second: number | undefined;
    let consentPoll: number | undefined;

    const showOne = () => {
      setToast({ name: rand(NAMES), city: rand(CITIES), product: rand(products), mins: Math.floor(Math.random() * 14) + 1 });
      window.setTimeout(() => setToast(null), 6000);
    };
    const startSchedule = () => {
      // First toast after 12s, then every 28-45s
      first = window.setTimeout(showOne, 12000);
      const loop = () => {
        showOne();
        timerRef.current = window.setTimeout(loop, 28000 + Math.random() * 17000);
      };
      second = window.setTimeout(loop, 45000);
    };

    // Wait until cookie-consent (accept OR decline) before starting — avoid overlay stacking.
    const consentDone = () => {
      try {
        const v = localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT);
        return v === 'accepted' || v === 'declined';
      } catch { return true; }
    };
    if (consentDone()) {
      startSchedule();
    } else {
      consentPoll = window.setInterval(() => {
        if (consentDone()) {
          if (consentPoll) window.clearInterval(consentPoll);
          startSchedule();
        }
      }, 1000);
    }

    return () => {
      if (first) clearTimeout(first);
      if (second) clearTimeout(second);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (consentPoll) window.clearInterval(consentPoll);
    };
  }, [dismissed, products]);

  if (dismissed || !toast) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-[320px] animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="bg-white rounded-xl border-[2px] border-hack-black shadow-[4px_4px_0_rgba(0,0,0,0.85)] p-3 flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-hack-yellow border border-hack-black flex items-center justify-center">
          <ShoppingBag className="w-4 h-4 text-hack-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-hack-black leading-snug">
            <span className="font-bold">{toast.name}</span> from <span className="font-bold">{toast.city}</span> just bought
          </p>
          <p className="text-sm font-display font-bold text-hack-black truncate">{toast.product}</p>
          <p className="text-[10px] text-hack-black/55 font-mono mt-0.5">{toast.mins} min{toast.mins !== 1 ? 's' : ''} ago · ✓ Verified order</p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-hack-black/5 rounded shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5 text-hack-black/60" />
        </button>
      </div>
    </div>
  );
}
