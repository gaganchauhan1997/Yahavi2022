import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Zap } from 'lucide-react';

const STORAGE_KEY = 'hk_ann_bar_dismissed_v2';
const BAR_H = 36; // px

function nextMidnightIST(): number {
  const now = new Date();
  const istNow = new Date(now.getTime() + (5.5 * 60 - now.getTimezoneOffset()) * 60000);
  const istMid = new Date(istNow);
  istMid.setHours(24, 0, 0, 0);
  return istMid.getTime() - istNow.getTime();
}

function setBarHeightVar(px: number) {
  try { document.documentElement.style.setProperty('--hk-ann-h', `${px}px`); } catch {}
}

export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return sessionStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [ms, setMs] = useState<number>(() => nextMidnightIST());

  // Push Header (and any consumer of --hk-ann-h) down while bar is visible
  useEffect(() => {
    setBarHeightVar(dismissed ? 0 : BAR_H);
    return () => setBarHeightVar(0);
  }, [dismissed]);

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
    <div
      className="fixed top-0 left-0 right-0 z-[60] bg-hack-black text-hack-yellow border-b-[3px] border-hack-yellow"
      style={{ height: BAR_H }}
    >
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center gap-3 text-xs sm:text-sm">
        <Zap className="w-4 h-4 shrink-0 fill-hack-yellow hidden sm:block" />
        <div className="flex-1 min-w-0 flex items-center gap-x-2 sm:gap-x-3 overflow-hidden whitespace-nowrap">
          <span className="font-bold truncate">FLASH SALE — 90% OFF on MIS Templates</span>
          <Link to="/mis-templates"
            className="underline underline-offset-2 hover:text-white font-bold whitespace-nowrap shrink-0">
            Grab now →
          </Link>
          <span className="font-mono text-[10px] sm:text-xs bg-hack-yellow text-hack-black px-1.5 sm:px-2 py-0.5 rounded font-bold whitespace-nowrap shrink-0 hidden xs:inline">
            ENDS {h}:{m}:{s}
          </span>
        </div>
        <button
          type="button"
          onClick={() => { try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch {}; setDismissed(true); }}
          className="p-1 hover:bg-white/10 rounded shrink-0"
          aria-label="Dismiss announcement"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
