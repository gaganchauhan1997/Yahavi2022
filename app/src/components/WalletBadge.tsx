import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coins } from "lucide-react";
import { hkBadges } from "@/lib/hk-badges";
import { isAuthenticated } from "@/lib/auth";

/**
 * WalletBadge — small chip in header showing HackCoins balance.
 * Hidden when logged out. Click → /account/wallet.
 */
export default function WalletBadge() {
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) return;
    let alive = true;
    hkBadges
      .me()
      .then((b) => {
        if (!alive) return;
        if (b.logged_in && typeof b.wallet_coins === "number") setCoins(b.wallet_coins);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (coins === null) return null;

  return (
    <Link
      to="/account/wallet"
      title={`${coins} HackCoins — click to redeem`}
      className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-hack-yellow border-2 border-hack-black rounded-full text-xs font-bold text-hack-black hover:shadow-[3px_3px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all"
    >
      <Coins className="w-3.5 h-3.5" />
      <span className="font-mono">{coins.toLocaleString()}</span>
    </Link>
  );
}
