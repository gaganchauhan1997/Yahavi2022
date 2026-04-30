import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Heart, Star, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hkBadges, type SponsorTier } from "@/lib/hk-badges";
import { isAuthenticated } from "@/lib/auth";
import { toast } from "sonner";

const tierIcon: Record<string, JSX.Element> = {
  bronze: <Heart className="w-7 h-7" />,
  silver: <Star className="w-7 h-7" />,
  gold: <Crown className="w-7 h-7" />,
};

const tierBg: Record<string, string> = {
  bronze: "bg-orange-100 border-orange-400",
  silver: "bg-slate-100 border-slate-400",
  gold: "bg-hack-yellow border-hack-black",
};

const SponsorPage = () => {
  const navigate = useNavigate();
  const [tiers, setTiers] = useState<SponsorTier[]>([]);
  const [myTier, setMyTier] = useState<string>("none");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      hkBadges.sponsorTiers().catch(() => []),
      isAuthenticated() ? hkBadges.sponsorMe().catch(() => ({ tier: "none", since: 0 })) : Promise.resolve({ tier: "none", since: 0 }),
    ]).then(([t, me]) => {
      if (!alive) return;
      setTiers(t);
      setMyTier(me.tier || "none");
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleSubscribe = async (tier: "bronze" | "silver" | "gold") => {
    if (!isAuthenticated()) {
      toast.error("Pehle login karein");
      navigate("/login?next=/sponsor");
      return;
    }
    setSubmitting(tier);
    try {
      const r = await hkBadges.sponsorIntent(tier);
      toast.success(r.message || "Sponsor intent recorded — admin will reach out via email.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffbea]">
      {/* HERO */}
      <section className="bg-hack-black text-white pt-16 pb-20 lg:pt-24 lg:pb-28 relative overflow-hidden">
        <div className="absolute -top-32 -right-24 w-96 h-96 bg-hack-yellow/20 rounded-full blur-3xl" />
        <div className="relative w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-hack-yellow text-sm mb-8 transition">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <div className="inline-flex items-center gap-2 bg-hack-yellow text-hack-black px-4 py-2 rounded-full text-sm font-bold mb-6">
              <Crown className="w-4 h-4" /> Become a HackKnow Sponsor
            </div>
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-7xl leading-[1.05] mb-6">
              Support our work.<br />
              <span className="text-hack-yellow">Get the perks.</span>
            </h1>
            <p className="text-white/70 text-lg lg:text-xl max-w-3xl mb-4 leading-relaxed">
              HackKnow ko sponsor karein aur premium templates, courses + direct access unlock karein.
              All sponsorships go directly into building more free resources for the community.
            </p>
            {myTier !== "none" && (
              <div className="inline-flex items-center gap-2 bg-hack-yellow/20 border-2 border-hack-yellow text-hack-yellow px-4 py-2 rounded-full font-bold text-sm">
                <Check className="w-4 h-4" /> Active Sponsor — {myTier.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TIERS */}
      <section className="py-16 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="text-center py-24">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-hack-black/40" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tiers.map((t) => (
                  <div
                    key={t.tier}
                    className={`${tierBg[t.tier]} border-[3px] border-hack-black rounded-2xl p-7 shadow-[6px_6px_0_#000] flex flex-col`}
                  >
                    <div className="w-14 h-14 bg-hack-black text-hack-yellow rounded-xl flex items-center justify-center mb-4">
                      {tierIcon[t.tier]}
                    </div>
                    <h3 className="font-display font-bold text-2xl mb-1">{t.name}</h3>
                    <div className="text-3xl font-bold text-hack-black mb-1">
                      ₹{t.monthly.toLocaleString()}
                      <span className="text-sm font-normal text-hack-black/60">/month</span>
                    </div>
                    <ul className="space-y-2 my-6 flex-1">
                      {t.perks.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-hack-black/80">
                          <Check className="w-4 h-4 text-hack-black mt-0.5 shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handleSubscribe(t.tier)}
                      disabled={submitting === t.tier || myTier === t.tier}
                      className="w-full h-12 bg-hack-black text-hack-yellow font-bold border-2 border-hack-black hover:shadow-[3px_3px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all disabled:opacity-60"
                    >
                      {myTier === t.tier ? "Active" : submitting === t.tier ? <Loader2 className="w-4 h-4 animate-spin" /> : `Become ${t.name}`}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-12 bg-white border-[3px] border-hack-black rounded-2xl p-7 shadow-[6px_6px_0_#000]">
              <h3 className="font-display font-bold text-xl mb-3">How it works</h3>
              <ol className="space-y-2 text-sm text-hack-black/80 list-decimal pl-5">
                <li>Choose a tier and click "Become [Tier]" — submits your intent.</li>
                <li>Our team will email you payment details (Razorpay subscription) within 24 hours.</li>
                <li>Once payment confirmed, your sponsor badge auto-activates on your profile and across HackKnow.</li>
                <li>Cancel anytime from your account page — no contracts.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SponsorPage;
