import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   AffiliatePage
   - PROGRAM ACTIVE indicator (live status)
   - Hero + bottom both use the same animated "Vendor program"
     card (marching dashed border = bicycle-chain effect)
   - Old "Apply Now" + "Learn More" buttons removed in both spots
   ──────────────────────────────────────────────────────────── */

const benefits = [
  {
    icon: DollarSign,
    title: '12% Commission',
    description: 'Earn 12% on every sale you refer. Competitive commission rates for sellers.',
  },
  {
    icon: Users,
    title: 'Seller Account',
    description: 'Register as a seller and get your unique referral link instantly.',
  },
  {
    icon: TrendingUp,
    title: 'Recurring Income',
    description: 'Earn on all future purchases from customers you refer.',
  },
  {
    icon: Zap,
    title: 'Instant Payouts',
    description: 'Get paid weekly via PayPal, bank transfer, or UPI. Minimum ₹500.',
  },
];

const steps = [
  { number: '01', title: 'Register as Seller', description: 'Create your seller account and complete your profile verification.' },
  { number: '02', title: 'Get Your Link',      description: 'Receive your unique affiliate referral link from your seller dashboard.' },
  { number: '03', title: 'Earn 12%',           description: 'Get paid 12% commission on every sale made through your referral link.' },
];

const faqs = [
  { question: 'Who can join the affiliate program?', answer: 'Anyone with an audience! Whether you are a blogger, YouTuber, Instagram influencer, or website owner, you can apply to join our program.' },
  { question: 'How much can I earn?',                answer: 'There is no limit! Our top affiliates earn over ₹1,00,000 per month. Your earnings depend on your audience size and engagement.' },
  { question: 'When and how do I get paid?',         answer: 'We pay weekly via PayPal, direct bank transfer, or UPI. Minimum payout is just ₹500.' },
  { question: 'What products can I promote?',        answer: 'You can promote all products on HackKnow - templates, themes, Excel sheets, PowerPoint decks, and more!' },
];

/* ─── Vendor program card (reusable, top + bottom) ─────────────
   Animated dashed border = marching dashes on all 4 sides,
   moves clockwise like a bicycle chain. Pure CSS, no JS. */
const VendorProgramCard = ({ tone = 'light' }: { tone?: 'light' | 'dark' }) => {
  const wrap =
    tone === 'dark'
      ? 'bg-hack-black'
      : 'bg-[#fffbea]';
  return (
    <div className={`${wrap} py-12 lg:py-16`}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="hk-chain-frame relative p-3 sm:p-4">
            <div className="bg-white p-6 sm:p-8 lg:p-10">
              <div className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.18em] text-hack-black/60 mb-4">
                Want to sell your own products instead?
              </div>
              <p className="text-base sm:text-lg lg:text-xl text-hack-black leading-relaxed mb-7 font-medium">
                Become a HackKnow vendor and keep{' '}
                <strong className="font-display font-bold">88%</strong> of every sale.
                We handle payments, hosting, fraud and delivery —{' '}
                <span className="whitespace-nowrap">you keep the profit.</span>
              </p>
              <Link
                to="/affiliate/learn-more"
                className="inline-flex items-center gap-2 bg-hack-yellow border-[3px] border-hack-black px-6 py-3 rounded-full font-display font-bold uppercase tracking-[0.12em] text-sm text-hack-black shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition"
              >
                See Vendor Program
                <ArrowRight className="w-4 h-4" strokeWidth={3} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AffiliatePage = () => {
  return (
    <div className="min-h-screen bg-[#fffbea]">

      {/* ─── Inline keyframes for the marching-chain border ─── */}
      <style>{`
        .hk-chain-frame {
          background-image:
            linear-gradient(90deg, #000 50%, transparent 50%),
            linear-gradient(90deg, #000 50%, transparent 50%),
            linear-gradient(0deg,  #000 50%, transparent 50%),
            linear-gradient(0deg,  #000 50%, transparent 50%);
          background-size: 16px 3px, 16px 3px, 3px 16px, 3px 16px;
          background-repeat: repeat-x, repeat-x, repeat-y, repeat-y;
          background-position: 0 0, 0 100%, 0 0, 100% 0;
          animation: hkChainMarch 0.9s linear infinite;
        }
        @keyframes hkChainMarch {
          to {
            background-position: 16px 0, -16px 100%, 0 16px, 100% -16px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .hk-chain-frame { animation: none; }
        }
        .hk-pulse-dot {
          animation: hkPulseDot 1.4s ease-in-out infinite;
        }
        @keyframes hkPulseDot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          50%      { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
        }
      `}</style>

      {/* ════════ HERO ════════ */}
      <div className="bg-hack-black text-white py-16 lg:py-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            {/* Activation indicator */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/15 border border-green-500/40 rounded-full text-green-400 text-sm font-bold">
                <span className="hk-pulse-dot inline-block w-2 h-2 bg-green-500 rounded-full" />
                Program Active
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-hack-yellow/20 rounded-full text-hack-yellow text-sm font-bold">
                <Zap className="w-4 h-4" />
                Earn Money Sharing What You Love
              </div>
            </div>

            <h1 className="font-display font-bold text-4xl lg:text-6xl mb-6">
              Affiliate Program
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto mb-2">
              Register as a seller and earn passive income by promoting premium digital products.
              Get 12% commission on every sale through your referral link.
            </p>
          </div>
        </div>
      </div>

      {/* Top vendor card (replaces old Apply Now / Learn More buttons) */}
      <VendorProgramCard tone="dark" />

      {/* ════════ Stats ════════ */}
      <div className="bg-hack-yellow py-12">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="font-display font-bold text-3xl lg:text-4xl text-hack-black">12%</div>
              <div className="text-hack-black/60 text-sm">Commission Rate</div>
            </div>
            <div>
              <div className="font-display font-bold text-3xl lg:text-4xl text-hack-black">₹10M+</div>
              <div className="text-hack-black/60 text-sm">Paid to Sellers</div>
            </div>
            <div>
              <div className="font-display font-bold text-3xl lg:text-4xl text-hack-black">5,000+</div>
              <div className="text-hack-black/60 text-sm">Active Sellers</div>
            </div>
            <div>
              <div className="font-display font-bold text-3xl lg:text-4xl text-hack-black">Weekly</div>
              <div className="text-hack-black/60 text-sm">Payout Schedule</div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════ Benefits ════════ */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl lg:text-4xl mb-4">
              Why Join Our Program?
            </h2>
            <p className="text-hack-black/60 max-w-2xl mx-auto">
              We provide everything you need to succeed as an affiliate marketer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-hack-black/5 card-hover"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-hack-yellow to-hack-orange flex items-center justify-center shrink-0">
                  <benefit.icon className="w-6 h-6 text-hack-black" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-hack-black/60 text-sm">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════ How It Works ════════ */}
      <div className="bg-hack-black text-white py-16 lg:py-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-display font-bold text-3xl lg:text-4xl mb-4">
                How It Works
              </h2>
              <p className="text-white/60 max-w-2xl mx-auto">
                Start earning in three simple steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-hack-yellow to-hack-orange flex items-center justify-center">
                    <span className="font-display font-bold text-2xl text-hack-black">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-xl mb-2">{step.title}</h3>
                  <p className="text-white/60 text-sm">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════════ FAQ ════════ */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl lg:text-4xl mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 border border-hack-black/5">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-hack-yellow shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-display font-bold text-lg mb-2">{faq.question}</h3>
                    <p className="text-hack-black/60 text-sm">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom vendor card (replaces old "Ready to Start Earning?" CTA) */}
      <VendorProgramCard tone="light" />

    </div>
  );
};

export default AffiliatePage;
