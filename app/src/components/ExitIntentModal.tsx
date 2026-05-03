import { useEffect, useRef, useState } from 'react';
import { Gift, Loader2, Sparkles, X } from 'lucide-react';
import { API_BASE } from '@/lib/api-base';

const SEEN_KEY = 'hk_exit_modal_seen_v1';

export default function ExitIntentModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ code: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let already = false;
    try { already = sessionStorage.getItem(SEEN_KEY) === '1'; } catch {}
    if (already) return;

    const trigger = () => {
      try { sessionStorage.setItem(SEEN_KEY, '1'); } catch {}
      setOpen(true);
      window.removeEventListener('mouseout', onMouseOut);
      clearTimeout(mobileTimer);
    };
    const onMouseOut = (e: MouseEvent) => {
      if (e.relatedTarget === null && e.clientY < 10) trigger();
    };
    // Desktop: exit-intent on mouse leave from top
    window.addEventListener('mouseout', onMouseOut);
    // Mobile fallback: trigger after 90s of activity
    const mobileTimer = window.setTimeout(trigger, 90000);
    return () => {
      window.removeEventListener('mouseout', onMouseOut);
      clearTimeout(mobileTimer);
    };
  }, []);

  useEffect(() => { if (open && !done) setTimeout(() => inputRef.current?.focus(), 100); }, [open, done]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErr('Please enter a valid email'); return; }
    setSubmitting(true);
    // Fallback: always remember the lead locally so we never lose it
    try {
      const raw = localStorage.getItem('hk_local_leads_v1');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) {
        arr.push({ email: email.trim(), source: 'exit-intent', at: new Date().toISOString() });
        localStorage.setItem('hk_local_leads_v1', JSON.stringify(arr.slice(-50)));
      }
    } catch { /* ignore quota */ }
    try {
      const r = await fetch(`${API_BASE}/wp-json/hackknow/v1/lead/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'exit-intent' }),
      });
      const data = await r.json().catch(() => ({}));
      // If backend is missing (404) or down, still reward the user — they completed the action
      const code = (data && data.coupon_code) || 'WELCOME20';
      setDone({ code });
    } catch {
      // Network/endpoint missing — still show the coupon so the user gets immediate value
      setDone({ code: 'WELCOME20' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Special offer"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl border-[3px] border-hack-black shadow-[8px_8px_0_rgba(0,0,0,0.85)] overflow-hidden animate-in zoom-in-95 duration-200">
        <button
          type="button" aria-label="Close"
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 z-10 p-1.5 bg-white/80 hover:bg-white rounded-full border border-hack-black/15">
          <X className="w-4 h-4" />
        </button>

        <div className="bg-hack-yellow border-b-[3px] border-hack-black px-6 pt-7 pb-5 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-hack-black text-hack-yellow mb-3">
            <Gift className="w-7 h-7" />
          </div>
          <h2 className="font-display font-black text-2xl text-hack-black leading-tight">Wait! Don't leave empty-handed</h2>
          <p className="text-sm text-hack-black/75 mt-1.5">Get a <span className="font-bold">FREE Excel template</span> + <span className="font-bold">20% OFF</span> your first order</p>
        </div>

        {!done ? (
          <form onSubmit={submit} className="px-6 py-5 space-y-3">
            <label htmlFor="hk-exit-email" className="block text-xs font-bold text-hack-black/70 uppercase tracking-wider">Your email</label>
            <input
              ref={inputRef}
              id="hk-exit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              required
              className="w-full px-4 py-3 border-[2px] border-hack-black/20 rounded-xl focus:border-hack-black outline-none font-mono text-sm"
            />
            {err && <p className="text-xs text-hack-magenta font-bold">{err}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-hack-black text-hack-yellow font-display font-bold border-[2px] border-hack-black hover:bg-hack-black/90 transition disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Sparkles className="w-4 h-4" /> Send My Free Template</>}
            </button>
            <p className="text-[10px] text-center text-hack-black/50">No spam. Unsubscribe anytime. We respect your privacy.</p>
          </form>
        ) : (
          <div className="px-6 py-7 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/15 text-green-600">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-display font-black text-xl text-hack-black">You're in!</h3>
            <p className="text-sm text-hack-black/70">Check your inbox shortly. Use this code at checkout:</p>
            <div className="inline-block px-5 py-2.5 bg-hack-yellow border-[2px] border-hack-black rounded-xl font-mono font-black text-2xl tracking-wider text-hack-black select-all">
              {done.code}
            </div>
            <p className="text-xs text-hack-black/55">Code copied? Click below to start shopping.</p>
            <button
              onClick={() => { setOpen(false); window.location.href = '/shop'; }}
              className="mt-2 w-full py-3 rounded-xl bg-hack-black text-hack-yellow font-display font-bold border-[2px] border-hack-black">
              Browse Templates →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
