import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Zap } from 'lucide-react';

const STORAGE_KEY = 'hk_ann_bar_dismissed_v2';

function nextMidnightIST(): number {
  // 00:00 IST = 18:30 UTC previous day
  const now = new Date();
  const istNow = new Date(now.getTime() + (5.5 * 60 - now.getTimezoneOffset()) * 60000);
  const istMid = new Date(istNow);
  istMid.setHours(24, 0, 0, 0);
  return istMid.getTime() - istNow.getTime();
}

export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return sessionStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [ms, setMs] = useState<number>(() => nextMidnightIST());

  useEffect(() => {
    if (dismissed) return;
    const id = setInterval(() => setMs(nextMidnightIST()), 1000);
    return () => clearInterval(id);
  }, [dismissed]);

  if (dismissed) return null;

  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');

  return (
    <div className="bg-hack-black text-hack-yellow border-b-[3px] border-hack-yellow">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 text-sm">
        <Zap className="w-4 h-4 shrink-0 fill-hack-yellow" />
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-bold">FLASH SALE — 90% OFF on MIS Templates</span>
          <Link to="/mis-templates"
            className="underline underline-offset-2 hover:text-white font-bold whitespace-nowrap">
            Grab now →
          </Link>
          <span className="font-mono text-xs bg-hack-yellow text-hack-black px-2 py-0.5 rounded font-bold whitespace-nowrap">
            ENDS IN {h}:{m}:{s}
          </span>
        </div>
        <button
          type="button"
          onClick={() => { try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch {}; setDismissed(true); }}
          className="p-1 hover:bg-white/10 rounded shrink-0"
          aria-label="Dismiss announcement"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
