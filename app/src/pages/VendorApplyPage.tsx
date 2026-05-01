import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Briefcase, CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { WP_REST_BASE } from "@/lib/api-base";
import { toast } from "sonner";

type Form = {
  name: string;
  email: string;
  phone: string;
  country: string;
  id_type: "aadhaar" | "pan" | "govt_id" | "";
  id_number: string;
  business_name: string;
  business_url: string;
  sample_url: string;
  why: string;
  website_url: string; // honeypot
};

const empty: Form = {
  name: "", email: "", phone: "", country: "India",
  id_type: "", id_number: "",
  business_name: "", business_url: "", sample_url: "",
  why: "", website_url: "",
};

const VendorApplyPage = () => {
  const [f, setF] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ id: number; message: string } | null>(null);
  const upd = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim())  return toast.error("Name is required");
    if (!f.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return toast.error("Valid email is required");
    if (!f.phone.trim()) return toast.error("Phone is required");
    if (!f.country.trim()) return toast.error("Country is required");
    if (!f.id_type)      return toast.error("Please pick an ID type");
    if (!f.id_number.trim()) return toast.error("ID number is required");

    setSubmitting(true);
    try {
      const r = await fetch(`${WP_REST_BASE}/vendor/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(f),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.message || `Submission failed (${r.status})`);
      setDone({ id: d.application_id, message: d.message });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#fffbea] flex items-center justify-center px-4 py-16">
        <div className="max-w-xl w-full bg-white border-[3px] border-hack-black rounded-2xl p-8 shadow-[6px_6px_0_#000] text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
          <h1 className="font-display font-bold text-3xl mb-3">Application received!</h1>
          <p className="text-hack-black/70 mb-2">{done.message}</p>
          <p className="text-xs text-hack-black/50 mb-6">Reference #{done.id}</p>
          <Link to="/">
            <Button className="h-12 px-6 bg-hack-black text-hack-yellow font-bold border-2 border-hack-black hover:shadow-[3px_3px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffbea]">
      <section className="bg-hack-black text-white pt-12 pb-16">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-hack-yellow text-sm mb-6 transition">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <div className="inline-flex items-center gap-2 bg-hack-yellow text-hack-black px-4 py-2 rounded-full text-sm font-bold mb-4">
              <Briefcase className="w-4 h-4" /> Become a Vendor / Affiliate
            </div>
            <h1 className="font-display font-bold text-4xl lg:text-5xl mb-4">Sell on HackKnow</h1>
            <p className="text-white/70 text-lg leading-relaxed">
              Apne digital products HackKnow par sell karein — templates, courses, tools, anything digital.
              Submit karein, hum 3 working days mein review karke email karenge.
            </p>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <form
            onSubmit={submit}
            className="max-w-3xl mx-auto bg-white border-[3px] border-hack-black rounded-2xl p-6 lg:p-8 shadow-[6px_6px_0_#000] space-y-5"
          >
            {/* Honeypot */}
            <input type="text" name="website_url" value={f.website_url} onChange={(e) => upd("website_url", e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full name *</Label>
                <Input id="name" required value={f.name} onChange={(e) => upd("name", e.target.value)} placeholder="e.g. Yahavi Singh" className="border-2 border-hack-black" />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" required value={f.email} onChange={(e) => upd("email", e.target.value)} placeholder="you@example.com" className="border-2 border-hack-black" />
              </div>
              <div>
                <Label htmlFor="phone">Phone (with country code) *</Label>
                <Input id="phone" required value={f.phone} onChange={(e) => upd("phone", e.target.value)} placeholder="+91 98xxx xxxxx" className="border-2 border-hack-black" />
              </div>
              <div>
                <Label htmlFor="country">Country *</Label>
                <Input id="country" required value={f.country} onChange={(e) => upd("country", e.target.value)} placeholder="India" className="border-2 border-hack-black" />
              </div>
              <div>
                <Label htmlFor="id_type">ID type *</Label>
                <Select value={f.id_type} onValueChange={(v) => upd("id_type", v as Form["id_type"])}>
                  <SelectTrigger id="id_type" className="border-2 border-hack-black">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aadhaar">Aadhaar (India)</SelectItem>
                    <SelectItem value="pan">PAN (India)</SelectItem>
                    <SelectItem value="govt_id">Govt ID (other countries)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="id_number">ID number *</Label>
                <Input id="id_number" required value={f.id_number} onChange={(e) => upd("id_number", e.target.value)} placeholder="As on your ID" className="border-2 border-hack-black" />
              </div>
              <div>
                <Label htmlFor="business_name">Business / brand name</Label>
                <Input id="business_name" value={f.business_name} onChange={(e) => upd("business_name", e.target.value)} placeholder="(optional)" className="border-2 border-hack-black" />
              </div>
              <div>
                <Label htmlFor="business_url">Business / portfolio URL</Label>
                <Input id="business_url" type="url" value={f.business_url} onChange={(e) => upd("business_url", e.target.value)} placeholder="https://…" className="border-2 border-hack-black" />
              </div>
            </div>

            <div>
              <Label htmlFor="sample_url">Link to a sample product / preview</Label>
              <Input id="sample_url" type="url" value={f.sample_url} onChange={(e) => upd("sample_url", e.target.value)} placeholder="https://drive.google.com/… or any public link" className="border-2 border-hack-black" />
            </div>
            <div>
              <Label htmlFor="why">Why partner with HackKnow?</Label>
              <Textarea id="why" rows={5} value={f.why} onChange={(e) => upd("why", e.target.value)} maxLength={2000} placeholder="What you sell, who your audience is, how you found us…" className="border-2 border-hack-black" />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-hack-black text-hack-yellow font-bold border-2 border-hack-black hover:shadow-[3px_3px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit application"}
            </Button>

            <p className="text-xs text-hack-black/60 text-center flex items-center justify-center gap-1">
              <Mail className="w-3 h-3" /> Goes straight to ceo.hackknow@gmail.com
            </p>
          </form>
        </div>
      </section>
    </div>
  );
};

export default VendorApplyPage;
