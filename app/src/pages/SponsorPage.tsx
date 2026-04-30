import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Heart, Star, Check, Loader2, Shield, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  hkBadges,
  type SponsorTier,
  type SponsorshipWall,
} from "@/lib/hk-badges";
import { isAuthenticated } from "@/lib/auth";
import { initializeRazorpayPayment } from "@/lib/razorpay";
import { toast } from "sonner";

const tierIcon: Record<string, JSX.Element> = {
  bronze:    <Heart    className="w-7 h-7" />,
  silver:    <Star     className="w-7 h-7" />,
  gold:      <Crown    className="w-7 h-7" />,
  platinum:  <Shield   className="w-7 h-7" />,
  godfather: <Sparkles className="w-7 h-7" />,
};

const tierBg: Record<string, string> = {
  bronze:    "bg-orange-100 border-orange-400",
  silver:    "bg-slate-100 border-slate-400",
  gold:      "bg-hack-yellow border-hack-black",
  platinum:  "bg-zinc-100 border-zinc-400",
  godfather: "bg-hack-black text-white border-hack-yellow",
};

const SponsorPage = () => {
  const navigate = useNavigate();
  const [tiers, setTiers] = useState<SponsorTier[]>([]);
  const [me, setMe] = useState<{ tier: string; total_rs: number }>({ tier: "none", total_rs: 0 });
  const [wall, setWall] = useState<SponsorshipWall | null>(null);
  const [loading, setLoading] = useState(true);

  // payment modal
  const [openTier, setOpenTier] = useState<SponsorTier | null>(null);
  const [amount, setAmount] = useState<number>(1);
  const [sponsorName, setSponsorName] = useState<string>("");
  const [anonymous, setAnonymous] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const reload = useCallback(() => {
    Promise.all([
      hkBadges.sponsorTiers().catch(() => []),
      isAuthenticated()
        ? hkBadges.sponsorMe().catch(() => ({ tier: "none", since: 0, total_paise: 0, total_rs: 0 }))
        : Promise.resolve({ tier: "none", since: 0, total_paise: 0, total_rs: 0 }),
      hkBadges.sponsorshipWall().catch(() => null),
    ]).then(([t, mine, w]) => {
      setTiers(t);
      setMe({ tier: mine.tier || "none", total_rs: mine.total_rs || 0 });
      setWall(w);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const openModal = (tier: SponsorTier) => {
    if (!isAuthenticated()) {
      toast.error("Pehle login karein");
      navigate("/login?next=/sponsor");
      return;
    }
    setOpenTier(tier);
    setAmount(tier.min);
    setSponsorName("");
    setAnonymous(false);
    setMessage("");
  };

  const openCustom = () => {
    if (!isAuthenticated()) {
      toast.error("Pehle login karein");
      navigate("/login?next=/sponsor");
      return;
    }
    setOpenTier({ tier: "custom", name: "Custom Amount", monthly: 1, min: 1, max: 100000, color: "#FFD700", perks: [] });
    setAmount(100);
    setSponsorName("");
    setAnonymous(false);
    setMessage("");
  };

  const closeModal = () => {
    if (submitting) return;
    setOpenTier(null);
  };

  const handlePay = async () => {
    if (!openTier) return;
    const amt = Math.max(1, Math.min(100000, Math.floor(Number(amount) || 0)));
    if (amt < 1) {
      toast.error("Amount must be at least Rs 1");
      return;
    }
    setSubmitting(true);
    try {
      const order = await hkBadges.sponsorOrder({
        amount_rs: amt,
        sponsor_name: anonymous ? "" : sponsorName,
        anonymous,
        message,
      });
      if (!order.ok) throw new Error("Order create failed");

      await initializeRazorpayPayment({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: "HackKnow Sponsor",
        description: openTier.tier === "custom"
          ? `Custom contribution Rs ${amt}`
          : `${openTier.name} sponsorship`,
        prefill: anonymous ? {} : { name: sponsorName },
        theme: { color: "#FFD700" },
        callbacks: {
          onSuccess: async (resp) => {
            try {
              const v = await hkBadges.sponsorVerify({
                razorpay_order_id:   resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature:  resp.razorpay_signature,
                sponsor_name: anonymous ? "" : sponsorName,
                anonymous,
                message,
              });
              toast.success(
                v.tier === "godfather"
                  ? `Welcome to The God Father club! Rs ${v.amount_paid_rs} received.`
                  : `Thank you! You are now ${v.tier.toUpperCase()} (Rs ${v.total_rs} cumulative).`
              );
              setOpenTier(null);
              reload();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Verify failed — payment received, contact support");
            } finally {
              setSubmitting(false);
            }
          },
          onFailure: (msg) => {
            toast.error(`Payment failed: ${msg}`);
            setSubmitting(false);
          },
          onDismiss: () => {
            setSubmitting(false);
          },
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create order");
      setSubmitting(false);
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
              Apni marzi se pay karein.<br />
              <span className="text-hack-yellow">Tier badge unlock karein.</span>
            </h1>
            <p className="text-white/70 text-lg lg:text-xl max-w-3xl mb-4 leading-relaxed">
              ₹1 se ₹1 lakh tak — jitna chahein utna pay karein. Aapka cumulative total tier decide karta hai. Sara paisa free resources banane mein lagega.
            </p>
            {me.tier !== "none" && (
              <div className="inline-flex items-center gap-2 bg-hack-yellow/20 border-2 border-hack-yellow text-hack-yellow px-4 py-2 rounded-full font-bold text-sm">
                <Check className="w-4 h-4" /> Active — {me.tier.toUpperCase()} (Rs {me.total_rs.toLocaleString()} contributed)
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TIERS */}
      <section className="py-16 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="text-center py-24">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-hack-black/40" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                {tiers.map((t) => {
                  const isActive = me.tier === t.tier;
                  const isGodfather = t.tier === "godfather";
                  return (
                    <div
                      key={t.tier}
                      className={`${tierBg[t.tier] || "bg-white border-hack-black"} border-[3px] rounded-2xl p-6 shadow-[6px_6px_0_#000] flex flex-col`}
                    >
                      <div className={`w-12 h-12 ${isGodfather ? "bg-hack-yellow text-hack-black" : "bg-hack-black text-hack-yellow"} rounded-xl flex items-center justify-center mb-4`}>
                        {tierIcon[t.tier] || <Heart className="w-6 h-6" />}
                      </div>
                      <h3 className={`font-display font-bold text-xl mb-1 ${isGodfather ? "text-hack-yellow" : ""}`}>{t.name}</h3>
                      <div className={`text-2xl font-bold mb-1 ${isGodfather ? "text-white" : "text-hack-black"}`}>
                        Rs {t.min.toLocaleString()}+
                      </div>
                      <div className={`text-xs mb-4 ${isGodfather ? "text-white/60" : "text-hack-black/60"}`}>
                        {t.max ? `Rs ${t.min.toLocaleString()}–${t.max.toLocaleString()}` : "Rs 1,00,000+"}
                      </div>
                      <ul className="space-y-1.5 mb-6 flex-1">
                        {t.perks.slice(0, 5).map((p, i) => (
                          <li key={i} className={`flex items-start gap-2 text-xs ${isGodfather ? "text-white/85" : "text-hack-black/80"}`}>
                            <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isGodfather ? "text-hack-yellow" : "text-hack-black"}`} />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => openModal(t)}
                        disabled={submitting}
                        className={`w-full h-11 font-bold border-2 ${isGodfather ? "bg-hack-yellow text-hack-black border-hack-yellow" : "bg-hack-black text-hack-yellow border-hack-black"} hover:shadow-[3px_3px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all disabled:opacity-60`}
                      >
                        {isActive ? "Add More" : `Become ${t.name}`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CUSTOM AMOUNT CTA */}
            <div className="mt-10 bg-white border-[3px] border-hack-black rounded-2xl p-7 shadow-[6px_6px_0_#000] text-center">
              <h3 className="font-display font-bold text-2xl mb-2">Apni marzi ka amount</h3>
              <p className="text-hack-black/70 mb-5">₹1 se ₹1 lakh tak — koi bhi amount. Cumulative total se aapka tier auto-upgrade hota hai.</p>
              <Button
                onClick={openCustom}
                className="h-12 px-8 bg-hack-yellow text-hack-black font-bold border-2 border-hack-black hover:shadow-[3px_3px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all"
              >
                Pay Custom Amount
              </Button>
            </div>

            {/* SPONSOR WALL */}
            {wall && wall.stats.total_count > 0 && (
              <div className="mt-12">
                <h3 className="font-display font-bold text-3xl mb-2 text-center">Sponsor Wall</h3>
                <p className="text-center text-hack-black/60 mb-8">
                  {wall.stats.total_count} sponsors · Rs {wall.stats.total_rs.toLocaleString()} raised
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                  {wall.tiers.map((tg) => (
                    <div key={tg.tier} className="bg-white border-[3px] border-hack-black rounded-2xl p-5 shadow-[6px_6px_0_#000]">
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b-2 border-hack-black/10">
                        <div className="w-3 h-3 rounded-full" style={{ background: tg.color }} />
                        <h4 className="font-display font-bold">{tg.name}</h4>
                        <span className="text-xs text-hack-black/60 ml-auto">{tg.sponsors.length}</span>
                      </div>
                      {tg.sponsors.length === 0 ? (
                        <p className="text-xs text-hack-black/40 italic">Be the first!</p>
                      ) : (
                        <ul className="space-y-1.5 text-sm">
                          {tg.sponsors.slice(0, 10).map((s, i) => (
                            <li key={i} className="flex justify-between text-xs">
                              <span className="truncate font-medium">{s.name}</span>
                              <span className="text-hack-black/50 shrink-0 ml-2">Rs {s.amount_rs.toLocaleString()}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HOW IT WORKS */}
            <div className="mt-12 bg-white border-[3px] border-hack-black rounded-2xl p-7 shadow-[6px_6px_0_#000]">
              <h3 className="font-display font-bold text-xl mb-3">Kaise kaam karta hai</h3>
              <ol className="space-y-2 text-sm text-hack-black/80 list-decimal pl-5">
                <li>Tier choose karein ya custom amount enter karein (₹1 se ₹1 lakh).</li>
                <li>Razorpay popup se secure payment — UPI, card, netbanking, wallet — sab supported.</li>
                <li>Payment confirm hote hi cumulative total + tier badge auto-update.</li>
                <li>Aap jitna more contribute karenge, tier upgrade hota jayega — ₹1L+ par "The God Father" status.</li>
                <li>Anonymous option available — naam wall pe nahi dikhega lekin tier mil jayega.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* PAYMENT MODAL */}
      {openTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={closeModal}>
          <div
            className="bg-white border-[3px] border-hack-black rounded-2xl shadow-[8px_8px_0_#000] w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-3 right-3 p-1 hover:bg-black/5 rounded"
              onClick={closeModal}
              disabled={submitting}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-display font-bold text-2xl mb-1">{openTier.name}</h3>
            <p className="text-sm text-hack-black/60 mb-5">
              {openTier.tier === "custom"
                ? "Apni marzi ka amount enter karein"
                : `Minimum Rs ${openTier.min.toLocaleString()} — aap zyada bhi de sakte hain`}
            </p>

            <label className="block mb-4">
              <span className="text-sm font-bold block mb-1">Amount (Rs)</span>
              <input
                type="number"
                min={openTier.tier === "custom" ? 1 : openTier.min}
                max={100000}
                step={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-12 px-3 border-2 border-hack-black rounded-lg font-bold text-lg focus:outline-none focus:ring-2 focus:ring-hack-yellow"
              />
              <span className="text-xs text-hack-black/50 block mt-1">₹1 to ₹1,00,000</span>
            </label>

            <label className="block mb-4">
              <span className="text-sm font-bold block mb-1">Your name (optional)</span>
              <input
                type="text"
                value={sponsorName}
                onChange={(e) => setSponsorName(e.target.value)}
                disabled={anonymous}
                placeholder="Shows on sponsor wall"
                className="w-full h-11 px-3 border-2 border-hack-black rounded-lg focus:outline-none focus:ring-2 focus:ring-hack-yellow disabled:bg-gray-100"
              />
            </label>

            <label className="flex items-center gap-2 mb-4 text-sm">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Stay anonymous on the wall (tier still credited to your account)</span>
            </label>

            <label className="block mb-5">
              <span className="text-sm font-bold block mb-1">Message (optional)</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={200}
                placeholder="Why are you sponsoring?"
                className="w-full px-3 py-2 border-2 border-hack-black rounded-lg focus:outline-none focus:ring-2 focus:ring-hack-yellow resize-none"
              />
            </label>

            <Button
              onClick={handlePay}
              disabled={submitting || !amount || amount < 1}
              className="w-full h-12 bg-hack-black text-hack-yellow font-bold border-2 border-hack-black hover:shadow-[3px_3px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pay Rs ${(Number(amount) || 0).toLocaleString()} via Razorpay`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SponsorPage;
