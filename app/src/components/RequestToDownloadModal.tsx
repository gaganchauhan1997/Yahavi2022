import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { WP_REST_BASE } from "@/lib/api-base";

interface Props {
  open: boolean;
  onClose: () => void;
  productId: string | number;
  productName: string;
}

export default function RequestToDownloadModal({ open, onClose, productId, productName }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDone(false);
      setErr(null);
      try {
        const cached = localStorage.getItem("hk_email");
        if (cached) setEmail(cached);
      } catch { /* ignore */ }
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.trim() || !/.+@.+\..+/.test(email)) {
      setErr("Please enter a valid email.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`${WP_REST_BASE}/request-product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: Number(productId),
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim(),
          message: message.trim(),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || `HTTP ${r.status}`);
      try { localStorage.setItem("hk_email", email.trim()); } catch { /* ignore */ }
      setDone(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-hack-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Request to download"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-2xl border-[3px] border-hack-black shadow-[8px_8px_0_0_#1A1A1A] p-6"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-white border-[2px] border-hack-black shadow-[2px_2px_0_0_#1A1A1A] hover:shadow-[1px_1px_0_0_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center"
        >
          <X className="w-5 h-5 text-hack-black" strokeWidth={2.5} />
        </button>

        {done ? (
          <div className="text-center py-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-400 border-[3px] border-hack-black shadow-[4px_4px_0_0_#1A1A1A] flex items-center justify-center mb-4">
              <Check className="w-9 h-9 text-hack-black" strokeWidth={3} />
            </div>
            <h3 className="font-display font-black text-2xl text-hack-black mb-2">Got it!</h3>
            <p className="text-hack-black/70 font-medium leading-snug mb-1">
              We will get back to you on
            </p>
            <p className="font-mono font-bold text-hack-black break-all">{email}</p>
            <p className="text-xs text-hack-black/50 mt-4">
              Our team has been notified and will reach out shortly.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-5 py-2.5 bg-hack-yellow border-[2.5px] border-hack-black rounded-lg shadow-[3px_3px_0_0_#1A1A1A] hover:shadow-[1px_1px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-display font-black text-hack-black"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h3 className="font-display font-black text-xl text-hack-black mb-1 pr-8 leading-tight">
              Request to download
            </h3>
            <p className="text-sm text-hack-black/60 mb-4 line-clamp-2">{productName}</p>

            <label className="block text-xs font-black tracking-wider uppercase text-hack-black mb-1">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              ref={firstFieldRef}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full mb-3 px-3 py-2 bg-white border-[2px] border-hack-black rounded-lg font-mono text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#1A1A1A]"
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-black tracking-wider uppercase text-hack-black mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-white border-[2px] border-hack-black rounded-lg text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#1A1A1A]"
                />
              </div>
              <div>
                <label className="block text-xs font-black tracking-wider uppercase text-hack-black mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-white border-[2px] border-hack-black rounded-lg text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#1A1A1A]"
                />
              </div>
            </div>

            <label className="block text-xs font-black tracking-wider uppercase text-hack-black mb-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Anything specific you need?"
              className="w-full mb-4 px-3 py-2 bg-white border-[2px] border-hack-black rounded-lg text-sm focus:outline-none focus:shadow-[2px_2px_0_0_#1A1A1A]"
            />

            {err && (
              <div className="mb-3 px-3 py-2 bg-red-50 border-[2px] border-red-500 rounded-lg text-sm font-medium text-red-700">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-5 py-3 bg-hack-magenta border-[2.5px] border-hack-black rounded-lg shadow-[4px_4px_0_0_#1A1A1A] hover:shadow-[2px_2px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-display font-black text-hack-black disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Sending…" : "Submit request"}
            </button>
            <p className="text-[11px] text-hack-black/50 text-center mt-3">
              We will email you on the address above. No spam.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
