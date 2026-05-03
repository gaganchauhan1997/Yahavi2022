import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Coins } from "lucide-react";
import { yaviWallet } from "@/lib/yavi-wallet";
import { isAuthenticated } from "@/lib/auth";

/**
 * WalletBadge — header chip showing YAVI Token balance.
 * Hidden when logged out OR when balance is unknown. Click → /wallet.
 * Listens for `yavi:wallet:refresh` window events to live-update after a topup.
 */
export default function WalletBadge() {
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
        /* swallow — keep last known value */
      } finally {
        inFlight.current = false;
      }
    };

    void refresh();
    const onRefresh = () => { void refresh(); };
    window.addEventListener("yavi:wallet:refresh", onRefresh);
    return () => {
      isMounted.current = false;
      window.removeEventListener("yavi:wallet:refresh", onRefresh);
    };
  }, []);

  if (balance === null) return null;

  return (
    <Link
      to="/wallet"
      title={`${balance} YAVI Tokens — click to top up`}
      className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-hack-yellow border-2 border-hack-black rounded-full text-xs font-bold text-hack-black hover:shadow-[3px_3px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all"
    >
      <Coins className="w-3.5 h-3.5" />
      <span className="font-mono">{balance.toLocaleString("en-IN")}</span>
      <span className="text-[10px] opacity-70">YAVI</span>
    </Link>
  );
}
