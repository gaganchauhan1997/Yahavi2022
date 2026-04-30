import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgePercent, FileSpreadsheet, BarChart3, Target, ShieldCheck, CheckCircle } from 'lucide-react';

import { useDocumentMeta } from '@/lib/useDocumentMeta';
const perks = [
  { icon: FileSpreadsheet, title: 'MIS Reports', desc: 'Daily/Weekly/Monthly attendance, sales, ops, finance — pre-built sheets.' },
  { icon: BarChart3,       title: 'Live Dashboards', desc: 'Power BI / Excel pivot dashboards with auto-refresh formulas.' },
  { icon: Target,          title: 'KPI Trackers', desc: 'Goal vs actual, variance, RAG status — all colour-coded out of the box.' },
];
const proof = [
  'LinkedIn profile link (must show MIS Executive / Analyst / Manager designation)',
  'Company ID card photo (front side, name + designation visible)',
  'Email from your work domain (we verify by sending a code)',
];

export default function MISTemplatesPage() {
  useDocumentMeta({
    title: "MIS, Dashboards & Templates – 90% Off for MIS Pros | Hackknow",
    description: "Premium MIS dashboards, reporting templates and Excel kits. Verified MIS professionals get 90% off automatically.",
  });
  return (
    <div className="min-h-screen bg-[#fffbea]">

      {/* HERO */}
      <div className="bg-hack-black text-white py-14 lg:py-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Link to="/" className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange mb-6 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-hack-yellow text-hack-black rounded-full text-sm font-bold mb-5 border-[2px] border-white shadow-[3px_3px_0_#fff]">
              <BadgePercent className="w-4 h-4" /> 90% OFF for verified MIS professionals
            </div>
            <h1 className="font-display font-bold text-4xl lg:text-6xl mb-5">
              MIS, Dashboards <span className="text-hack-yellow">&</span> Templates
            </h1>
            <p className="text-white/65 text-lg max-w-2xl mx-auto mb-8">
              Stop building Excel from scratch. Drop in our battle-tested MIS reports,
              KPI dashboards and tracker templates — verified MIS folks pay just 10%.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/shop/mis-dashboards-templates"
                className="inline-flex items-center gap-2 bg-hack-yellow border-[3px] border-hack-black px-7 py-3.5 rounded-full font-display font-bold uppercase tracking-wide text-sm text-hack-black shadow-[5px_5px_0_#fff] hover:shadow-[2px_2px_0_#fff] hover:translate-x-[3px] hover:translate-y-[3px] transition">
                Browse Templates <ArrowRight className="w-4 h-4" strokeWidth={3} />
              </Link>
              <Link to="/verify"
                className="inline-flex items-center gap-2 bg-transparent border-[2px] border-white/30 text-white px-7 py-3.5 rounded-full font-display font-bold uppercase tracking-wide text-sm hover:bg-white/10 transition">
                Verify & Unlock 90% Off
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* PERKS */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-14">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {perks.map((p, i) => (
            <div key={i} className="bg-white border-[3px] border-hack-black rounded-2xl p-6 shadow-[6px_6px_0_#000] hover:shadow-[3px_3px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition">
              <div className="w-12 h-12 bg-hack-yellow border-[2px] border-hack-black rounded-xl flex items-center justify-center mb-4 shadow-[3px_3px_0_#000]">
                <p.icon className="w-6 h-6 text-hack-black" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">{p.title}</h3>
              <p className="text-hack-black/60 text-sm">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* HOW VERIFICATION WORKS */}
      <div className="bg-hack-black text-white py-14">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-hack-yellow/15 border border-hack-yellow/30 text-hack-yellow text-xs font-mono uppercase tracking-widest rounded-full mb-3">
                <ShieldCheck className="w-3.5 h-3.5" /> 1-time verification
              </div>
              <h2 className="font-display font-bold text-3xl lg:text-4xl mb-3">How to unlock the 90% discount</h2>
              <p className="text-white/60">Submit one of these proofs. Approval usually takes a few hours — once approved, the MIS90 coupon auto-applies on every MIS template.</p>
            </div>
            <div className="space-y-3">
              {proof.map((p, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <CheckCircle className="w-5 h-5 text-hack-yellow shrink-0 mt-0.5" />
                  <p className="text-white/85 text-sm">{p}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link to="/verify"
                className="inline-flex items-center gap-2 bg-hack-yellow border-[3px] border-white px-7 py-3.5 rounded-full font-display font-bold uppercase tracking-wide text-sm text-hack-black shadow-[5px_5px_0_#fff] hover:shadow-[2px_2px_0_#fff] hover:translate-x-[3px] hover:translate-y-[3px] transition">
                Start Verification <ArrowRight className="w-4 h-4" strokeWidth={3} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
