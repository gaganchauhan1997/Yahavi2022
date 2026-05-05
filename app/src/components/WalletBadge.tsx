import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Coins } from "lucide-react";
import { yaviWallet } from "@/lib/yavi-wallet";
import { isAuthenticated } from "@/lib/auth";

type Variant = "header" | "inline" | "compact";

/**
 * WalletBadge — chip displaying the user's live YAVI Token balance.
 * Hidden when logged out OR when balance is unknown (first paint).
 * Click → /wallet. Subscribes to `yavi:wallet:refresh` window events
 * so it updates instantly after topups, free-checkout deductions, or
 * paid-order spending without a page reload.
 *
 * Variants:
 *   header  — pill in the global Header (visible on all viewports)
 *   inline  — compact pill that fits inside cards (Order Summary,
 *             ProductPage CTA strip, etc.)
 *   compact — minimal (icon + number) for tight spaces
 */
export default function WalletBadge({ variant = "header" }: { variant?: Variant }) {
  const [balance, setBalance] = useState<number | null>(null);
  const inFlight  = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const refresh = async () => {
      if (!isAuthenticated() || inFlight.current) return;
      inFlight.current = true;
      try {
        const me = await yaviWallet.me();
        if (isMounted.current) setBalance(me.balance_yavi);
      } catch {
        /* swallow — keep last known value, never crash the header */
      } finally {
        inFlight.current = false;
      }
    };

    void refresh();
    const onRefresh = () => { void refresh(); };
    window.addEventListener("yavi:wallet:refresh", onRefresh);
    // Also refresh when the user comes back to the tab — covers the
    // case where they topped up in another tab.
    const onVis = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      isMounted.current = false;
      window.removeEventListener("yavi:wallet:refresh", onRefresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (balance === null) return null;

  // Variant-specific styling — every variant uses the same neobrutalism
  // language (yellow fill, black border, square-ish chunky shadow on
  // hover) so it reads as the same component everywhere.
  const base =
    "inline-flex items-center gap-1.5 bg-hack-yellow border-2 border-hack-black rounded-full font-bold text-hack-black hover:shadow-[3px_3px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all";
  const sizing: Record<Variant, string> = {
    header:  "px-3 py-1.5 text-xs",
    inline:  "px-3 py-1.5 text-sm",
    compact: "px-2 py-1 text-xs",
  };
  const iconSize: Record<Variant, string> = {
    header:  "w-3.5 h-3.5",
    inline:  "w-4 h-4",
    compact: "w-3 h-3",
  };

  return (
    <Link
      to="/wallet"
      title={`${balance.toLocaleString("en-IN")} YAVI Tokens — click to top up`}
      className={`${base} ${sizing[variant]}`}
      data-testid="wallet-badge"
    >
      <Coins className={iconSize[variant]} />
      <span className="font-mono">{balance.toLocaleString("en-IN")}</span>
      <span className="text-[10px] opacity-70">YAVI</span>
    </Link>
  );
}
