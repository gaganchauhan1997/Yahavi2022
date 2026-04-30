import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Crown, Sparkles } from "lucide-react";
import { hkBadges, type HkBadges } from "@/lib/hk-badges";
import { isAuthenticated } from "@/lib/auth";

type Variant = "header" | "profile";

const ROLE_META: Record<string, { label: string; icon: typeof ShieldCheck; bg: string }> = {
  mis:     { label: "MIS Verified",     icon: ShieldCheck, bg: "bg-emerald-300" },
  student: { label: "Student Verified", icon: ShieldCheck, bg: "bg-sky-300" },
};

const SPONSOR_META: Record<string, { label: string; bg: string }> = {
  bronze: { label: "Bronze Sponsor", bg: "bg-orange-300" },
  silver: { label: "Silver Sponsor", bg: "bg-gray-200" },
  gold:   { label: "Gold Sponsor",   bg: "bg-hack-yellow" },
};

interface Props { variant?: Variant }

export default function VerifiedBadge({ variant = "header" }: Props) {
  const [b, setB] = useState<HkBadges | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) return;
    let alive = true;
    hkBadges.me().then(d => { if (alive) setB(d); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!b || !b.logged_in) return null;
  const role  = (b.verified_role || "").toLowerCase();
  const tier  = (b.sponsor_tier  || "none").toLowerCase();
  const roleMeta    = ROLE_META[role];
  const sponsorMeta = tier !== "none" ? SPONSOR_META[tier] : null;
  if (!roleMeta && !sponsorMeta) return null;

  if (variant === "header") {
    return (
      <div className="hidden md:flex items-center gap-1.5">
        {roleMeta && (
          <Link to="/verify" title={roleMeta.label}
            className={`${roleMeta.bg} border-2 border-hack-black rounded-full px-2.5 py-1 flex items-center gap-1 shadow-[2px_2px_0_#000] hover:shadow-[1px_1px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all`}>
            <roleMeta.icon className="w-3.5 h-3.5 text-hack-black" />
            <span className="text-[11px] font-bold text-hack-black uppercase tracking-wide">{role === 'mis' ? 'MIS' : 'Student'}</span>
          </Link>
        )}
        {sponsorMeta && (
          <Link to="/sponsor" title={sponsorMeta.label}
            className={`${sponsorMeta.bg} border-2 border-hack-black rounded-full px-2.5 py-1 flex items-center gap-1 shadow-[2px_2px_0_#000] hover:shadow-[1px_1px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all`}>
            <Crown className="w-3.5 h-3.5 text-hack-black" />
            <span className="text-[11px] font-bold text-hack-black uppercase tracking-wide">{tier}</span>
          </Link>
        )}
      </div>
    );
  }

  // profile (full chip)
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {roleMeta && (
        <span className={`${roleMeta.bg} border-2 border-hack-black rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 shadow-[3px_3px_0_#000]`}>
          <roleMeta.icon className="w-4 h-4 text-hack-black" />
          <span className="text-xs font-bold text-hack-black uppercase tracking-wide">{roleMeta.label}</span>
        </span>
      )}
      {sponsorMeta && (
        <span className={`${sponsorMeta.bg} border-2 border-hack-black rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 shadow-[3px_3px_0_#000]`}>
          <Sparkles className="w-4 h-4 text-hack-black" />
          <span className="text-xs font-bold text-hack-black uppercase tracking-wide">{sponsorMeta.label}</span>
        </span>
      )}
    </div>
  );
}
