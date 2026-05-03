import { useEffect, useRef, useState } from "react";
import { Coins, Plus, History as HistoryIcon, ShieldCheck } from "lucide-react";
import { yaviWallet, loadRazorpay, type WalletMe, type WalletLedgerRow } from "@/lib/yavi-wallet";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";

interface RzpResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RzpOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { email?: string; name?: string };
  theme?: { color?: string };
  handler: (resp: RzpResponse) => void;
  modal?: { ondismiss?: () => void };
}

type RazorpayCtor = new (opts: RzpOptions) => { open: () => void };

const TIERS: Array<{ inr: number; yavi: number; bonus: string }> = [
  { inr: 100, yavi: 150, bonus: "+50% bonus" },
  { inr: 200, yavi: 300, bonus: "+50% bonus" },
  { inr: 500, yavi: 750, bonus: "+50% bonus · best value" },
];

function fmtWhen(iso: string) {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T") + (iso.endsWith("Z") ? "" : "Z"));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function rowLabel(r: WalletLedgerRow) {
  if (r.note) return r.note;
  if (r.type === "topup") return `Topup ₹${r.amount_paise / 100}`;
  if (r.type === "admin_credit") return "Bonus credit";
  if (r.type === "admin_debit") return "Adjustment";
  return r.type;
}

/**
 * WalletPanel — reusable wallet UI block (no page chrome).
 * Renders balance card + 3 topup tier buttons + recent activity table.
 * Used by both /wallet (standalone page) and /account/wallet (account section).
 */
export default function WalletPanel() {
  const [me, setMe] = useState<WalletMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (!isAuthenticated()) { setLoading(false); return () => { isMounted.current = false; }; }
    yaviWallet.me()
      .then((d) => { if (isMounted.current) setMe(d); })
      .catch((e) => { if (isMounted.current) toast.error((e as Error).message || "Failed to load wallet"); })
      .finally(() => { if (isMounted.current) setLoading(false); });
    return () => { isMounted.current = false; };
  }, []);

  const refresh = async () => {
    try {
      const d = await yaviWallet.me();
      if (isMounted.current) setMe(d);
      window.dispatchEvent(new Event("yavi:wallet:refresh"));
    } catch { /* ignore */ }
  };

  const startTopup = async (inr: number) => {
    if (busy !== null) return;
    setBusy(inr);
    try {
      const order = await yaviWallet.createOrder(inr);
      await loadRazorpay();
      const Rzp = (window as Window & { Razorpay?: RazorpayCtor }).Razorpay;
      if (!Rzp) throw new Error("Razorpay failed to load");

      const user = getCurrentUser();
      const opts: RzpOptions = {
        key: order.key_id,
        amount: order.amount_paise,
        currency: order.currency,
        name: order.name || "HackKnow",
        description: order.description,
        order_id: order.order_id,
        prefill: { email: order.prefill_email || user?.email, name: user?.name },
        theme: { color: "#FFB800" },
        handler: async (resp) => {
          try {
            const v = await yaviWallet.verify({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              amount_inr: inr,
            });
            if (v.duplicate) {
              toast.message("Payment already credited", { description: `Balance: ${v.balance_yavi} YAVI` });
            } else {
              toast.success(`+${v.credited_yavi} YAVI credited`, { description: `New balance: ${v.balance_yavi} YAVI` });
            }
            await refresh();
          } catch (e) {
            if (isMounted.current) {
              toast.error("Payment received but credit failed. Contact support with your payment ID.", {
                description: (e as Error).message,
              });
            }
          } finally {
            if (isMounted.current) setBusy(null);
          }
        },
        modal: { ondismiss: () => { if (isMounted.current) setBusy(null); } },
      };

      new Rzp(opts).open();
    } catch (e) {
      if (isMounted.current) {
        toast.error((e as Error).message || "Could not start payment");
        setBusy(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-hack-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!me) {
    return (
      <div className="bg-white rounded-2xl border-[3px] border-hack-black shadow-[5px_5px_0_#000] p-8 text-center">
        <p className="text-hack-black/70">Please log in to view your wallet.</p>
      </div>
    );
  }

  const topupEnabled = me.topup_enabled;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl lg:text-3xl font-display font-bold text-hack-black">YAVI Wallet</h2>

      {/* Balance card */}
      <section className="bg-hack-black text-hack-white border-[3px] border-hack-black rounded-3xl p-6 sm:p-8 shadow-[5px_5px_0_#FFB800]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono uppercase tracking-widest text-[11px] text-hack-yellow mb-2">Your YAVI balance</p>
            <div className="flex items-baseline gap-3">
              <span className="font-display font-extrabold text-5xl sm:text-6xl tabular-nums">
                {me.balance_yavi.toLocaleString("en-IN")}
              </span>
              <span className="font-mono text-sm text-hack-yellow">YAVI</span>
            </div>
            <p className="text-xs text-hack-white/60 mt-1">1 YAVI = ₹1 · use towards purchases</p>
          </div>
          <Coins className="w-12 h-12 text-hack-yellow opacity-80" aria-hidden />
        </div>
      </section>

      {/* Topup tiers */}
      <section className="bg-white rounded-2xl border-[3px] border-hack-black shadow-[5px_5px_0_#000] p-6">
        <h3 className="font-display font-bold text-xl mb-1 flex items-center gap-2">
          <Plus className="w-5 h-5" /> Recharge wallet
        </h3>
        <p className="text-sm text-hack-black/60 mb-4">
          Pick a tier — every topup includes a 50% bonus.
          <span className="inline-flex items-center gap-1 ml-2 text-xs"><ShieldCheck className="w-3.5 h-3.5" /> Razorpay-secured</span>
        </p>

        {!topupEnabled && (
          <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-900 text-sm mb-4">
            Topups are temporarily disabled by the admin. Please check back soon.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {TIERS.map((t) => {
            const isBusy = busy === t.inr;
            const disabled = !topupEnabled || busy !== null;
            return (
              <button
                key={t.inr}
                onClick={() => startTopup(t.inr)}
                disabled={disabled}
                className="text-left p-5 rounded-2xl border-[3px] border-hack-black bg-[#fffbea] shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0_#000] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              >
                <div className="font-mono text-xs uppercase tracking-widest text-hack-black/50 mb-1">Pay</div>
                <div className="font-display font-extrabold text-3xl">₹{t.inr}</div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-hack-yellow border-2 border-hack-black rounded-full font-bold text-sm">
                  <Coins className="w-3.5 h-3.5" />{t.yavi} YAVI
                </div>
                <div className="text-[11px] text-hack-magenta font-bold uppercase tracking-wider mt-2">{t.bonus}</div>
                {isBusy && <div className="text-xs text-hack-black/60 mt-3">Opening Razorpay…</div>}
              </button>
            );
          })}
        </div>
      </section>

      {/* History */}
      <section className="bg-white rounded-2xl border-[3px] border-hack-black shadow-[5px_5px_0_#000] p-6">
        <h3 className="font-display font-bold text-xl mb-3 flex items-center gap-2">
          <HistoryIcon className="w-5 h-5" /> Recent activity
        </h3>
        {me.recent.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-hack-black/20 bg-[#fffbea] p-8 text-center text-hack-black/60 text-sm">
            No wallet activity yet. Add your first tokens above.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead className="bg-hack-yellow border-b-[3px] border-hack-black">
                <tr>
                  <th className="text-left px-3 py-2 font-bold text-xs uppercase tracking-wider whitespace-nowrap">When</th>
                  <th className="text-left px-3 py-2 font-bold text-xs uppercase tracking-wider">Note</th>
                  <th className="text-right px-3 py-2 font-bold text-xs uppercase tracking-wider">Δ YAVI</th>
                  <th className="text-right px-3 py-2 font-bold text-xs uppercase tracking-wider hidden sm:table-cell">Balance</th>
                </tr>
              </thead>
              <tbody>
                {me.recent.map((r) => (
                  <tr key={r.id} className="border-b border-hack-black/10 last:border-0">
                    <td className="px-3 py-2 text-hack-black/70 text-xs whitespace-nowrap">{fmtWhen(r.created_at)}</td>
                    <td className="px-3 py-2">{rowLabel(r)}</td>
                    <td className={`px-3 py-2 text-right font-mono font-bold tabular-nums ${r.delta_yavi >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {r.delta_yavi > 0 ? "+" : ""}{r.delta_yavi}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-hack-black/60 hidden sm:table-cell">{r.balance_after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-[11px] text-hack-black/40 text-center">
        All wallet transactions are recorded in an immutable ledger. Payments processed by Razorpay. 1 YAVI = ₹1.
      </p>
    </div>
  );
}
