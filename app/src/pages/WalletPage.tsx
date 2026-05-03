import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import WalletPanel from "@/components/WalletPanel";
import { isAuthenticated } from "@/lib/auth";

export default function WalletPage() {
  const nav = useNavigate();
  useEffect(() => {
    if (!isAuthenticated()) { nav("/login?next=/wallet"); return; }
    document.title = "YAVI Wallet — HackKnow";
  }, [nav]);

  return (
    <div className="min-h-[80vh] pt-20 pb-16 bg-hack-white">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6">
        <Link to="/account" className="inline-flex items-center gap-1.5 text-sm text-hack-black/60 hover:text-hack-black mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to account
        </Link>
        <WalletPanel />
      </div>
    </div>
  );
}
