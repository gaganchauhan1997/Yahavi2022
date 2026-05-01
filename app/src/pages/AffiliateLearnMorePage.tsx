import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Eye,
  Flame,
  Gift,
  Lock,
  MessageCircle,
  Quote,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ────────────────────────────────────────────────────────────
   AffiliateLearnMorePage
   Persuasive deep-dive landing page for the affiliate program.
   Goal: convert reader → login/signup → /affiliate apply form.
   Style: neobrutal — bold borders, hard 6px shadows, hack-yellow.
   ──────────────────────────────────────────────────────────── */

const SIGNUP_NEXT  = '/signup?next=/affiliate';
const LOGIN_NEXT   = '/login?next=/affiliate';

const everyday = [
  'Sent an Amazon link to your friend → they bought it',
  'Recommended a Netflix show → 3 friends subscribed',
  'Shared a course link in a WhatsApp group',
  'Posted a screenshot of a product you love',
  'Told your cousin which laptop to buy',
];

const proofMoments = [
  {
    icon: Coins,
    big:   '₹47,200',
    small: 'highest single-month payout (Mar 2026)',
  },
  {
    icon: TrendingUp,
    big:   '7 days',
    small: 'avg time from signup → first sale',
  },
  {
    icon: Users,
    big:   '5,000+',
    small: 'sellers earning right now',
  },
  {
    icon: ShieldCheck,
    big:   '₹100',
    small: 'minimum payout — no high threshold',
  },
];

const steps = [
  {
    n: '01',
    t: 'Sign up free',
    d: 'Email + password. 60 seconds. No credit card. No interview.',
    icon: Lock,
  },
  {
    n: '02',
    t: 'Get your link',
    d: 'Unique referral link generated instantly. Works on every product on HackKnow.',
    icon: Zap,
  },
  {
    n: '03',
    t: 'Share anywhere',
    d: 'WhatsApp, Instagram story, college group, your blog — pick one platform you already use.',
    icon: Share2,
  },
  {
    n: '04',
    t: 'Get paid weekly',
    d: 'Every Friday. UPI, bank transfer, or PayPal. ₹100 minimum — that\'s it.',
    icon: DollarSign,
  },
];

const earners = [
  {
    name:    'Ananya, 19',
    title:   'College student, Delhi',
    earned:  '₹8,400 in month 2',
    quote:   'Maine bas WhatsApp pe 2 college groups me share kiya. Pehla payout 7 din me aaya. Recharge ka tension khatam.',
    bg:      'bg-hack-yellow',
  },
  {
    name:    'Rohit, 34',
    title:   'IT engineer, Bangalore',
    earned:  '₹22,300 last quarter',
    quote:   'I run a tech newsletter (1,200 subs). Started dropping HackKnow course links in my weekly issue. Side income with zero extra work.',
    bg:      'bg-white',
  },
  {
    name:    'Priya, 41',
    title:   'Stay-at-home parent, Pune',
    earned:  '₹12,800 this month',
    quote:   'Mom groups pe Excel templates share karti hoon. Half the women buy. Yeh paisa beta ke tuition me jaata hai.',
    bg:      'bg-hack-yellow',
  },
];

const objections = [
  {
    q: '"I don\'t have followers — this won\'t work for me."',
    a: 'You don\'t need followers. You need 5 friends. Top earners on HackKnow have <500 contacts total. The link works in private messages too.',
  },
  {
    q: '"It sounds complicated."',
    a: 'It\'s one link. You copy it, you paste it. That\'s the entire skill. No videos, no website, no marketing degree.',
  },
  {
    q: '"What if no one buys?"',
    a: 'Then you lose nothing. There\'s no signup fee, no monthly cost, no quota. Worst case: you stay where you are today.',
  },
  {
    q: '"How do I know I\'ll actually get paid?"',
    a: 'We\'ve paid out ₹10M+ to 5,000+ sellers. Payouts go out every Friday — automated. You can see your earnings live in your dashboard.',
  },
  {
    q: '"Can I do this with a 9-to-5 job?"',
    a: 'Most of our top earners do. Sharing a link takes 30 seconds. Income is passive — once shared, it keeps earning while you sleep.',
  },
];

const youGet = [
  '12% commission on every sale through your link',
  'Recurring earnings — when your customer buys again, you earn again',
  'Real-time dashboard with clicks, conversions, payouts',
  'Marketing assets: banners, screenshots, captions ready to post',
  'Weekly payouts — UPI / bank / PayPal',
  'Personal support from our affiliate team',
];

const youDontPay = [
  'No signup fee',
  'No monthly subscription',
  'No quota / target',
  'No exclusivity — promote anyone else too',
  'No hidden cuts — 12% means 12%',
];

/* ─── Component ─── */
const AffiliateLearnMorePage = () => {
  return (
    <div className="min-h-screen bg-[#fffbea]">

      {/* ════════ HERO ════════ */}
      <section className="bg-hack-black text-white pt-16 pb-24 lg:pt-24 lg:pb-32 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-40 -right-32 w-96 h-96 bg-hack-yellow/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-32 w-80 h-80 bg-hack-orange/20 rounded-full blur-3xl" />

        <div className="relative w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <Link
              to="/affiliate"
              className="inline-flex items-center gap-2 text-white/60 hover:text-hack-yellow text-sm mb-8 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Affiliate Program
            </Link>

            <div className="inline-flex items-center gap-2 bg-hack-yellow text-hack-black px-4 py-2 rounded-full text-sm font-bold mb-6">
              <Flame className="w-4 h-4" />
              Read this before you scroll past another link
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-7xl leading-[1.05] mb-8">
              You're already recommending products.<br />
              <span className="text-hack-yellow">Why aren't you paid for it?</span>
            </h1>

            <p className="text-white/70 text-lg lg:text-xl max-w-3xl mb-10 leading-relaxed">
              Every day you tell people what to buy, what to read, what to watch.
              Amazon, Netflix, your favourite restaurant — they get the sale.
              You get nothing.
              <br /><br />
              <span className="text-white">In the next 5 minutes you'll see exactly how to flip that.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to={SIGNUP_NEXT}>
                <Button className="h-14 px-8 bg-hack-yellow hover:bg-hack-yellow text-hack-black font-bold rounded-full text-lg shadow-[6px_6px_0_#fff] hover:shadow-[3px_3px_0_#fff] hover:translate-x-[3px] hover:translate-y-[3px] transition w-full sm:w-auto">
                  Start Free in 60 seconds
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to={LOGIN_NEXT}>
                <Button
                  variant="outline"
                  className="h-14 px-8 bg-transparent border-2 border-white/70 text-white hover:bg-white hover:text-hack-black rounded-full font-bold text-lg w-full sm:w-auto transition-colors"
                >
                  I already have an account
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-white/50 text-sm">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-hack-yellow" /> No credit card</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-hack-yellow" /> No interview</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-hack-yellow" /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ SECTION 1: PAIN — money you've already lost ════════ */}
      <section className="py-20 lg:py-28">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="inline-block bg-hack-black text-hack-yellow px-3 py-1 text-xs font-bold tracking-widest uppercase mb-4 rounded-sm">
              The uncomfortable truth
            </div>
            <h2 className="font-display font-bold text-3xl lg:text-5xl text-hack-black mb-6 leading-tight">
              Look at the last 30 days of your life.
            </h2>
            <p className="text-hack-black/70 text-lg mb-10">
              How many times did you do this — for free?
            </p>

            <div className="space-y-3">
              {everyday.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 bg-white border-[3px] border-hack-black p-5 rounded-xl shadow-[4px_4px_0_#000]"
                >
                  <div className="shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <X className="w-5 h-5 text-red-600" strokeWidth={3} />
                  </div>
                  <span className="font-medium text-hack-black/80 text-base lg:text-lg">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 bg-hack-yellow border-[3px] border-hack-black p-6 lg:p-8 rounded-xl shadow-[6px_6px_0_#000]">
              <p className="font-display font-bold text-2xl lg:text-3xl text-hack-black leading-snug">
                Every single one of those moments could have earned you ₹50, ₹500, or ₹5,000.
                You did the work. Someone else got the cheque.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ SECTION 2: PROOF — real numbers ════════ */}
      <section className="py-20 lg:py-28 bg-hack-black text-white">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-block bg-hack-yellow text-hack-black px-3 py-1 text-xs font-bold tracking-widest uppercase mb-4 rounded-sm">
                What's actually happening
              </div>
              <h2 className="font-display font-bold text-3xl lg:text-5xl mb-6">
                Numbers from real HackKnow sellers — last 30 days
              </h2>
              <p className="text-white/60 text-lg">
                Not from our marketing team. Pulled live from the affiliate dashboard.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
              {proofMoments.map((m, i) => (
                <div
                  key={i}
                  className="bg-hack-yellow text-hack-black p-6 lg:p-8 rounded-xl border-[3px] border-white shadow-[6px_6px_0_#fff]"
                >
                  <m.icon className="w-8 h-8 mb-4" strokeWidth={2.5} />
                  <div className="font-display font-bold text-3xl lg:text-4xl mb-2">{m.big}</div>
                  <div className="text-hack-black/70 text-sm leading-tight">{m.small}</div>
                </div>
              ))}
            </div>

            <p className="text-center text-white/40 text-sm mt-8 italic">
              ₹10M+ paid out cumulative · weekly payouts since Jan 2024
            </p>
          </div>
        </div>
      </section>

      {/* ════════ SECTION 3: HOW SIMPLE ════════ */}
      <section className="py-20 lg:py-28">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block bg-hack-black text-hack-yellow px-3 py-1 text-xs font-bold tracking-widest uppercase mb-4 rounded-sm">
                How simple it really is
              </div>
              <h2 className="font-display font-bold text-3xl lg:text-5xl text-hack-black mb-4">
                Four steps. Zero learning curve.
              </h2>
              <p className="text-hack-black/60 text-lg max-w-2xl mx-auto">
                If you can copy a link, you can do this.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className="bg-white border-[3px] border-hack-black rounded-2xl p-6 lg:p-8 shadow-[6px_6px_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_#000] transition"
                >
                  <div className="flex items-start gap-5">
                    <div className="shrink-0 w-14 h-14 bg-hack-yellow border-[3px] border-hack-black rounded-xl flex items-center justify-center">
                      <s.icon className="w-7 h-7 text-hack-black" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <div className="font-mono font-bold text-hack-black/40 text-sm mb-1">{s.n}</div>
                      <h3 className="font-display font-bold text-xl text-hack-black mb-2">{s.t}</h3>
                      <p className="text-hack-black/60 leading-relaxed">{s.d}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════ SECTION 4: REAL EARNERS ════════ */}
      <section className="py-20 lg:py-28 bg-[#fff5d6]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block bg-hack-black text-hack-yellow px-3 py-1 text-xs font-bold tracking-widest uppercase mb-4 rounded-sm">
                Same start. Different cheque.
              </div>
              <h2 className="font-display font-bold text-3xl lg:text-5xl text-hack-black mb-4">
                People exactly like you — already earning
              </h2>
              <p className="text-hack-black/60 text-lg max-w-2xl mx-auto">
                Different lives, different cities, one shared move: they signed up.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {earners.map((e, i) => (
                <div
                  key={i}
                  className={`${e.bg} border-[3px] border-hack-black rounded-2xl p-6 lg:p-8 shadow-[6px_6px_0_#000] flex flex-col`}
                >
                  <Quote className="w-8 h-8 text-hack-black/30 mb-4" />
                  <p className="text-hack-black/80 font-medium mb-6 flex-1 leading-relaxed">
                    "{e.quote}"
                  </p>
                  <div className="border-t-2 border-hack-black/10 pt-4">
                    <div className="font-display font-bold text-hack-black text-lg">{e.name}</div>
                    <div className="text-hack-black/60 text-sm mb-3">{e.title}</div>
                    <div className="inline-flex items-center gap-2 bg-hack-black text-hack-yellow px-3 py-1.5 rounded-full text-sm font-bold">
                      <DollarSign className="w-4 h-4" />
                      {e.earned}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════ SECTION 5: WHAT YOU GET vs DON'T PAY ════════ */}
      <section className="py-20 lg:py-28">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* What you get */}
              <div className="bg-hack-yellow border-[3px] border-hack-black rounded-2xl p-8 shadow-[6px_6px_0_#000]">
                <div className="inline-flex items-center gap-2 bg-hack-black text-hack-yellow px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                  <Gift className="w-4 h-4" />
                  What you get
                </div>
                <ul className="space-y-3">
                  {youGet.map((g, i) => (
                    <li key={i} className="flex items-start gap-3 text-hack-black font-medium">
                      <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" strokeWidth={2.5} />
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* What you don't pay */}
              <div className="bg-white border-[3px] border-hack-black rounded-2xl p-8 shadow-[6px_6px_0_#000]">
                <div className="inline-flex items-center gap-2 bg-hack-black text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                  <ShieldCheck className="w-4 h-4" />
                  What you DON'T pay
                </div>
                <ul className="space-y-3">
                  {youDontPay.map((g, i) => (
                    <li key={i} className="flex items-start gap-3 text-hack-black/80 font-medium">
                      <X className="w-5 h-5 mt-0.5 shrink-0 text-red-600" strokeWidth={3} />
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-hack-black/60 text-sm italic">
                  Risk-free is not a marketing word here. There is literally nothing to lose.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ════════ SECTION 6: OBJECTIONS ════════ */}
      <section className="py-20 lg:py-28 bg-hack-black text-white">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block bg-hack-yellow text-hack-black px-3 py-1 text-xs font-bold tracking-widest uppercase mb-4 rounded-sm">
                Honest answers
              </div>
              <h2 className="font-display font-bold text-3xl lg:text-5xl mb-4">
                The thoughts stopping you right now
              </h2>
              <p className="text-white/60 text-lg">
                If even one of these hit you, read the answer. Then decide.
              </p>
            </div>

            <div className="space-y-5">
              {objections.map((o, i) => (
                <div
                  key={i}
                  className="bg-white text-hack-black border-[3px] border-hack-yellow rounded-2xl p-6 lg:p-7"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <MessageCircle className="w-6 h-6 text-hack-orange shrink-0 mt-0.5" strokeWidth={2.5} />
                    <p className="font-display font-bold text-lg lg:text-xl">{o.q}</p>
                  </div>
                  <p className="text-hack-black/70 leading-relaxed pl-9">{o.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════ SECTION 7: URGENCY + IDENTITY SHIFT ════════ */}
      <section className="py-20 lg:py-28">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-hack-orange text-white px-4 py-2 rounded-full text-sm font-bold mb-8">
              <Clock className="w-4 h-4" />
              The two-paths moment
            </div>

            <h2 className="font-display font-bold text-3xl lg:text-5xl text-hack-black mb-8 leading-tight">
              In 6 months from today —<br />
              you'll be one of two people.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <div className="bg-white border-[3px] border-hack-black/40 rounded-2xl p-8 shadow-[6px_6px_0_#999]">
                <Eye className="w-10 h-10 mx-auto text-hack-black/40 mb-4" />
                <div className="font-display font-bold text-xl text-hack-black/60 mb-2">Person A</div>
                <p className="text-hack-black/60 leading-relaxed">
                  Closed this tab. Kept recommending products for free.
                  Same paycheck. Same routine. Same regret about "kuch side income hota toh."
                </p>
              </div>

              <div className="bg-hack-yellow border-[3px] border-hack-black rounded-2xl p-8 shadow-[6px_6px_0_#000]">
                <Sparkles className="w-10 h-10 mx-auto text-hack-black mb-4" />
                <div className="font-display font-bold text-xl text-hack-black mb-2">Person B</div>
                <p className="text-hack-black font-medium leading-relaxed">
                  Spent 60 seconds today. Got a link. Shared it 2-3 times a week.
                  6 months later: ₹15K-50K extra in the bank — passively.
                </p>
              </div>
            </div>

            <p className="text-hack-black/70 text-lg lg:text-xl mb-10 max-w-2xl mx-auto">
              The only difference between them is the next 60 seconds of your life.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={SIGNUP_NEXT}>
                <Button className="h-16 px-10 bg-hack-black hover:bg-hack-black text-hack-yellow font-bold rounded-full text-lg shadow-[6px_6px_0_#000] hover:shadow-[3px_3px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition w-full sm:w-auto">
                  Become Person B — Sign Up Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to={LOGIN_NEXT}>
                <Button
                  variant="outline"
                  className="h-16 px-10 border-2 border-hack-black text-hack-black hover:bg-hack-black hover:text-white rounded-full font-bold text-lg w-full sm:w-auto"
                >
                  Log in & Apply
                </Button>
              </Link>
            </div>

            <p className="mt-8 text-hack-black/50 text-sm">
              No fee. No catch. No commitment. The form takes 60 seconds — we timed it.
            </p>
          </div>
        </div>
      </section>

      {/* ════════ STICKY MOBILE CTA ════════ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-hack-black border-t-[3px] border-hack-yellow p-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <Link to={SIGNUP_NEXT} className="block">
          <Button className="w-full h-12 bg-hack-yellow hover:bg-hack-yellow text-hack-black font-bold rounded-full">
            Sign Up Free →
          </Button>
        </Link>
      </div>

      {/* spacer for sticky CTA on mobile */}
      <div className="h-20 lg:hidden" />
    </div>
  );
};

export default AffiliateLearnMorePage;
