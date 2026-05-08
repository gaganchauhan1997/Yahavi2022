import { useState } from "react";
import { Loader2, Tag, Check, X, Sparkles } from "lucide-react";
import { previewCoupon, redeemCoupon, type CouponContext } from "@/lib/coupons";
import { isAuthenticated } from "@/lib/auth";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  context: CouponContext;
  /** Called after a successful redeem so parent pages can refresh wallet etc. */
  onRedeemed?: (result: { code: string; credited_yavi: number; balance_yavi: number }) => void;
  /** Optional override label (e.g. "Have a coupon?" on checkout vs "Add YAVI via coupon" on wallet). */
  title?: string;
  description?: string;
}

/**
 * Reusable coupon code input + Apply button. Used on:
 *   - /checkout      (context="checkout") — credits YAVI to wallet for next purchase
 *   - /wallet        (context="wallet")   — credits YAVI to wallet immediately
 *
 * The server-side effect is identical for both contexts (credit YAVI to the
 * authenticated user). The only difference is the surrounding copy.
 *
 * Note: a /checkout coupon does NOT reduce the Razorpay charge. It credits
 * the equivalent rupee value as YAVI to the buyer's wallet for use on a
 * future purchase. This is the only safe path that respects the
 * never-modify rule on hackknow-checkout.php and zz-hackknow-payment-fix.php.
 */
export default function CouponBox({ context, onRedeemed, title, description }: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewMsg, setPreviewMsg] = useState<string | null>(null);
  const [previewYavi, setPreviewYavi] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<{ code: string; credited_yavi: number } | null>(null);

  const authed = isAuthenticated();

  const defaults = context === "checkout"
    ? {
        title: "Have a coupon code?",
        description: "We'll credit the value to your YAVI wallet — usable on your next purchase.",
      }
    : {
        title: "Add YAVI via a coupon",
        description: "Have a promo code? Redeem it to instantly add YAVI tokens to your wallet.",
      };
  const heading = title ?? defaults.title;
  const subtext = description ?? defaults.description;

  const handlePreview = async () => {
    setError(null); setPreviewMsg(null); setPreviewYavi(null);
    if (!code.trim()) { setError("Enter a code first."); return; }
    setBusy(true);
    try {
      const r = await previewCoupon(code.trim().toUpperCase(), context);
      setPreviewMsg(r.message);
      setPreviewYavi(r.value_yavi);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not validate coupon.");
    } finally {
      setBusy(false);
    }
  };

  const handleRedeem = async () => {
    setError(null);
    if (!code.trim()) { setError("Enter a code first."); return; }
    setBusy(true);
    try {
      const r = await redeemCoupon(code.trim().toUpperCase(), context);
      setRedeemed({ code: r.code, credited_yavi: r.credited_yavi });
      setPreviewMsg(null);
      setPreviewYavi(null);
      toast.success(`+${r.credited_yavi} YAVI credited to your wallet.`);
      // Notify any listening wallet UI (e.g. WalletBadge) to refresh.
      window.dispatchEvent(new Event("yavi:wallet:refresh"));
      // Wrap parent callback so a thrown handler cannot leave busy=true stuck.
      try {
        onRedeemed?.({ code: r.code, credited_yavi: r.credited_yavi, balance_yavi: r.balance_yavi });
      } catch (cbErr) {
        // Don't surface as a coupon error — the redeem itself succeeded.
        // eslint-disable-next-line no-console
        console.error("[CouponBox] onRedeemed callback threw:", cbErr);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not redeem coupon.");
    } finally {
      setBusy(false);
    }
  };

  if (!authed) {
    return (
      <div className="rounded-2xl border-2 border-hack-black/10 bg-white p-5">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-4 h-4 text-hack-magenta" />
          <h3 className="font-display font-bold text-base">{heading}</h3>
        </div>
        <p className="text-sm text-hack-black/60">
          Please <Link to={`/login?next=${encodeURIComponent(window.location.pathname)}`} className="underline font-medium">sign in</Link> to apply a coupon.
        </p>
      </div>
    );
  }

  if (redeemed) {
    return (
      <div className="rounded-2xl border-[3px] border-hack-black bg-[#e7fbe9] shadow-[4px_4px_0_#000] p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-base text-hack-black">
              Coupon <span className="font-mono">{redeemed.code}</span> applied
            </p>
            <p className="text-sm text-hack-black/70 mt-0.5">
              <strong>+{redeemed.credited_yavi} YAVI</strong> (₹{redeemed.credited_yavi} equivalent)
              credited to your wallet
              {context === "checkout" && " for use on your next purchase"}.
            </p>
            {context === "wallet" && (
              <p className="text-xs text-hack-black/60 mt-2">
                Balance updated. Scroll down to see it in your activity feed.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-hack-black/10 bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <Tag className="w-4 h-4 text-hack-magenta" />
        <h3 className="font-display font-bold text-base">{heading}</h3>
      </div>
      <p className="text-xs text-hack-black/60 mb-3">{subtext}</p>

      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
            setPreviewMsg(null);
            setPreviewYavi(null);
          }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleRedeem(); } }}
          placeholder="ENTER CODE"
          maxLength={64}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Coupon code"
          className="flex-1 px-4 py-3 bg-hack-black/5 rounded-xl text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-hack-yellow disabled:opacity-50"
          disabled={busy}
        />
        <button
          type="button"
          onClick={handleRedeem}
          disabled={busy || !code.trim()}
          className="px-5 py-3 bg-hack-black text-hack-white rounded-xl text-sm font-bold hover:bg-hack-black/85 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {busy ? "Applying…" : "Apply"}
        </button>
      </div>

      {/* Preview / success / error states */}
      {previewMsg && previewYavi !== null && !error && (
        <p className="mt-3 text-xs text-green-700 inline-flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" /> {previewMsg}
        </p>
      )}
      {error && (
        <p className="mt-3 text-xs text-red-600 inline-flex items-center gap-1.5">
          <X className="w-3.5 h-3.5" /> {error}
        </p>
      )}
      {!error && !previewMsg && (
        <button
          type="button"
          onClick={handlePreview}
          disabled={busy || !code.trim()}
          className="mt-2 text-xs text-hack-black/50 hover:text-hack-black underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
        >
          Check coupon value first
        </button>
      )}
    </div>
  );
}
