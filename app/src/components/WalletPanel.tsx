import { useEffect, useState } from "react";
import { Coins, Loader2, ArrowDownToLine, ArrowUpFromLine, Sparkles, Plus, RefreshCw } from "lucide-react";
import { yaviWallet, loadRazorpay, type WalletMe, type WalletLedgerRow } from "@/lib/yavi-wallet";
import CouponBox from "@/components/CouponBox";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";

/* ── 1:1 PARITY TIERS ────────────────────────────────────────────────────────
 * Strict 1 YAVI Token = 1 Rupee. No bonus. Pay ₹100 → receive 100 YAVI.
 * (Earlier the wallet promoted +50% bonus tiers; the owner has standardised
 * on true 1:1 parity for transparent gateway pricing.)
 * ───────────────────────────────────────────────────────────────────────── */
const TIERS: Array<{ inr: number; yavi: number; label: string }> = [
  { inr: 100, yavi: 100, label: "Starter" },
  { inr: 200, yavi: 200, label: "Plus" },
  { inr: 500, yavi: 500, label: "Pro" },
];

type RzpHandlerArg = { razorpay_order_id?: string; razorpay_payment_id: string; razorpay_signature: string };
type RzpOptions = {
  key: string; amount: number; currency: string; name: string; description: string;
  order_id: string; prefill?: { name?: string; email?: string };
  notes?: Record<string, string>; theme?: { color?: string };
  handler: (response: RzpHandlerArg) => void;
  modal?: { ondismiss?: () => void };
};
type RzpInstance = { open: () => void };
type RzpCtor = new (opts: RzpOptions) => RzpInstance;

function fmtRel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function rowLabel(r: WalletLedgerRow): string {
  if (r.note) return r.note;
  if (r.type === "topup") return `Topup ₹${r.amount_paise / 100}`;
  if (r.type === "spend") return "Purchase";
  if (r.type === "refund") return "Refund";
  return r.type;
}

/**
 * WalletPanel — balance + 3 strict 1:1 topup tiers + recent activity.
 * Renders both at /wallet and inside any dashboard slot. Authentication
 * is enforced by the parent page (WalletPage redirects to /login).
 */
export default function WalletPanel() {
  const [me, setMe] = useState<WalletMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const refresh = async () => {
    try {
      setError(null);
      const data = await yaviWallet.me();
      setMe(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const handleTopup = async (inr: number) => {
    setBusy(inr);
    try {
      await loadRazorpay();
      const order = await yaviWallet.createOrder(inr);
      const w = window as unknown as { Razorpay?: RzpCtor };
      if (!w.Razorpay) throw new Error("Razorpay failed to load");
      const user = getCurrentUser();
      const rzp = new w.Razorpay({
        key: order.key_id,
        amount: order.amount_paise,
        currency: "INR",
        name: order.name || "HackKnow",
        description: order.description || `Wallet topup • ${order.tokens_to_credit} YAVI`,
        order_id: order.order_id,
        prefill: { name: user?.name, email: order.prefill_email || user?.email },
        theme: { color: "#FFD700" },
        handler: async (resp) => {
          try {
            const verify = await yaviWallet.verify({
              razorpay_order_id: resp.razorpay_order_id ?? order.order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              amount_inr: order.amount_inr,
            });
            if (verify.duplicate) {
              toast.success("Topup already credited.");
            } else {
              toast.success(`+${verify.credited_yavi} YAVI credited to your wallet.`);
            }
            window.dispatchEvent(new Event("yavi:wallet:refresh"));
            await refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Verification failed");
          } finally {
            setBusy(null);
          }
        },
        modal: { ondismiss: () => setBusy(null) },
      });
      rzp.open();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start topup");
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-hack-black/60" />
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="rounded-2xl border-2 border-hack-black/10 bg-white p-6 text-center">
        <p className="text-hack-black/70 mb-4">{error || "Wallet unavailable"}</p>
        <button onClick={() => { setLoading(true); void refresh(); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-hack-black text-hack-white text-sm">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <div className="rounded-3xl border-[3px] border-hack-black bg-hack-yellow shadow-[6px_6px_0_#000] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">YAVI Wallet</span>
            </div>
            <div className="font-display font-bold text-4xl sm:text-5xl tabular-nums">
              {me.balance_yavi.toLocaleString("en-IN")}
              <span className="text-lg font-medium text-hack-black/60 ml-2">YAVI</span>
            </div>
            <div className="text-xs text-hack-black/60 mt-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              1 YAVI Token = ₹1 (1:1 parity)
            </div>
          </div>
          <button onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-hack-black text-hack-white text-xs font-bold">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Coupon redemption — credit YAVI via promo code */}
      <CouponBox context="wallet" onRedeemed={() => { void refresh(); }} />

      {/* Topup tiers — true 1:1, no bonus */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg">Top up your wallet</h2>
          <span className="text-xs text-hack-black/60">Pay any amount, receive the same in YAVI.</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TIERS.map((t) => {
            const isBusy = busy === t.inr;
            return (
              <button
                key={t.inr}
                disabled={busy !== null}
                onClick={() => void handleTopup(t.inr)}
                className="text-left p-5 rounded-2xl border-[3px] border-hack-black bg-[#fffbea] shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0_#000] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-hack-black/60">{t.label}</div>
                <div className="mt-2 font-display font-black text-3xl">₹{t.inr}</div>
                <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                  <Coins className="w-4 h-4" />
                  {t.yavi} YAVI
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold">
                  {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {isBusy ? "Opening Razorpay…" : "Top up"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="font-display font-bold text-lg mb-3">Recent activity</h2>
        <div className="rounded-2xl border-2 border-hack-black/10 bg-white overflow-hidden">
          {me.recent.length === 0 ? (
            <div className="p-8 text-center text-sm text-hack-black/60">
              No activity yet. Top up to get started.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-hack-black/5">
                <tr className="text-left text-xs uppercase tracking-wider text-hack-black/60">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3 text-right">Change</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {me.recent.map((r) => {
                  const positive = r.delta_yavi > 0;
                  return (
                    <tr key={r.id} className="border-t border-hack-black/5">
                      <td className="px-4 py-3 text-hack-black/70 whitespace-nowrap">{fmtRel(r.created_at)}</td>
                      <td className="px-4 py-3">{rowLabel(r)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-mono ${positive ? "text-green-600" : "text-red-600"}`}>
                        <span className="inline-flex items-center gap-1">
                          {positive ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                          {positive ? "+" : ""}{r.delta_yavi}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono">{r.balance_after}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
