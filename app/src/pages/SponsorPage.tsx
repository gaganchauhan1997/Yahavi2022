import type React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Crown, Heart, Star, Check, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { hkBadges, type SponsorTier } from "@/lib/hk-badges";
import { initializeRazorpayPayment } from "@/lib/razorpay";
import { WP_REST_BASE } from "@/lib/api-base";
import { toast } from "sonner";

const tierIcon: Record<string, React.ReactNode> = {
  bronze: <Heart className="w-7 h-7" />,
  silver: <Star className="w-7 h-7" />,
  gold:   <Crown className="w-7 h-7" />,
};

const tierBg: Record<string, string> = {
  bronze: "bg-orange-100 border-orange-400",
  silver: "bg-slate-100 border-slate-400",
  gold:   "bg-hack-yellow border-hack-black",
};

type SelectedTier = (SponsorTier & { isCustom?: false }) | { tier: "custom"; name: string; monthly: number; perks: string[]; isCustom: true } | null;

const SponsorPage = () => {
  const [tiers, setTiers] = useState<SponsorTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedTier>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [anon, setAnon]   = useState(false);
  const [msg, setMsg]     = useState("");
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    hkBadges.sponsorTiers().catch(() => [] as SponsorTier[]).then((t) => {
      if (!alive) return;
      setTiers(t);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const openTier = (t: SponsorTier) => {
    setSelected(t);
    setAmount(t.monthly);
  };

  const openCustom = () => {
    setSelected({ tier: "custom", name: "Custom Sponsorship", monthly: 100, perks: ["Pay-what-you-want — every rupee helps"], isCustom: true });
    setAmount(100);
  };

  const closeModal = () => { if (!submitting) setSelected(null); };

  const handlePay = async () => {
    if (!selected) return;
    if (!anon && !name.trim()) { toast.error("Please enter your name (or tick Anonymous)"); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Please enter a valid email"); return; }
    const amt = Math.max(1, Math.min(100000, Math.round(amount || 0)));
    if (amt < 1) { toast.error("Amount must be at least ₹1"); return; }

    setSubmitting(true);
    try {
      // 1. Create order via guest endpoint — NO sign-in required
      const orderRes = await fetch(`${WP_REST_BASE}/sponsor-guest/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          amount_rs: amt,
          sponsor_name: name.trim(),
          sponsor_email: email.trim(),
          anonymous: anon,
          message: msg.trim(),
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.ok) throw new Error(orderData.message || `Order failed (${orderRes.status})`);

      // 2. Open Razorpay Checkout
      await initializeRazorpayPayment({
        key: orderData.key_id,
        order_id: orderData.order_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "HackKnow",
        description: `Sponsor — ${selected.name}`,
        prefill: { name: anon ? "" : name, email },
        notes: { sponsor_name: name, anonymous: anon ? "1" : "0" },
        theme: { color: "#FFD700" },
        callbacks: {
          onSuccess: async (resp) => {
            try {
              const verify = await fetch(`${WP_REST_BASE}/sponsor-guest/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({
                  razorpay_order_id:   resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature:  resp.razorpay_signature,
                  sponsor_name: name.trim(),
                  sponsor_email: email.trim(),
                  anonymous: anon,
                  message: msg.trim(),
                }),
              });
              const vd = await verify.json();
              if (!verify.ok || !vd.ok) throw new Error(vd.message || "Verification failed");
              toast.success(`Thank you ${anon ? "" : name + " "}— ₹${vd.amount_paid_rs} received!`);
              setSelected(null);
              setName(""); setEmail(""); setMsg(""); setAnon(false);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Verification failed — please contact ceo.hackknow@gmail.com");
            } finally {
              setSubmitting(false);
            }
          },
          onFailure: () => setSubmitting(false),
          onDismiss: () => setSubmitting(false),
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start payment");
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
              Support our work.<br />
              <span className="text-hack-yellow">Get the perks.</span>
            </h1>
            <p className="text-white/70 text-lg lg:text-xl max-w-3xl mb-4 leading-relaxed">
              HackKnow ko sponsor karein aur premium templates, courses + direct access unlock karein.
              All sponsorships go directly into building more free resources for the community.
            </p>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 px-4 py-2 rounded-full text-xs font-medium">
              <Lock className="w-3 h-3" /> No sign-in required — pay directly with Razorpay
            </div>
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
              <>
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
                        onClick={() => openTier(t)}
                        className="w-full h-12 bg-hack-black text-hack-yellow font-bold border-2 border-hack-black hover:shadow-[3px_3px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all"
                      >
                        Sponsor as {t.name}
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-8 bg-white border-[3px] border-dashed border-hack-black rounded-2xl p-7 text-center">
                  <h3 className="font-display font-bold text-xl mb-2">Or sponsor any amount you like</h3>
                  <p className="text-hack-black/70 text-sm mb-4">Even ₹100 helps us publish more free courses and templates.</p>
                  <Button
                    onClick={openCustom}
                    className="h-11 px-6 bg-hack-yellow text-hack-black font-bold border-2 border-hack-black hover:shadow-[3px_3px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all"
                  >
                    Custom amount
                  </Button>
                </div>
              </>
            )}

            <div className="mt-12 bg-white border-[3px] border-hack-black rounded-2xl p-7 shadow-[6px_6px_0_#000]">
              <h3 className="font-display font-bold text-xl mb-3">How it works</h3>
              <ol className="space-y-2 text-sm text-hack-black/80 list-decimal pl-5">
                <li>Pick a tier or enter a custom amount.</li>
                <li>Fill in your name + email (or tick "Anonymous") — no account needed.</li>
                <li>Pay securely via Razorpay (UPI / cards / wallets all accepted).</li>
                <li>Receipt + thank-you email lands in your inbox in seconds.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* PAYMENT MODAL */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent className="sm:max-w-md bg-[#fffbea] border-[3px] border-hack-black">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{selected?.name}</DialogTitle>
            <DialogDescription className="text-hack-black/70">
              No sign-in needed. Powered by Razorpay (UPI / card / wallet).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                max={100000}
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
                className="border-2 border-hack-black"
              />
            </div>
            <div>
              <Label htmlFor="name">Your name {!anon && <span className="text-red-600">*</span>}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Yahavi Singh" disabled={anon} className="border-2 border-hack-black" />
            </div>
            <div>
              <Label htmlFor="email">Email (for receipt)</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="border-2 border-hack-black" />
            </div>
            <div>
              <Label htmlFor="msg">Message (optional)</Label>
              <Textarea id="msg" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={200} rows={2} placeholder="A note for the team…" className="border-2 border-hack-black" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="anon" checked={anon} onCheckedChange={(v) => setAnon(!!v)} />
              <Label htmlFor="anon" className="cursor-pointer text-sm">Show me as Anonymous on the wall of sponsors</Label>
            </div>

            <Button
              onClick={handlePay}
              disabled={submitting}
              className="w-full h-12 bg-hack-black text-hack-yellow font-bold border-2 border-hack-black hover:shadow-[3px_3px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pay ₹${Math.max(1, Math.min(100000, Math.round(amount || 0))).toLocaleString()} now`}
            </Button>
            <p className="text-xs text-hack-black/60 text-center">Secured by Razorpay • Instant receipt to your email</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SponsorPage;
