import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Facebook,
  Gift,
  Heart,
  Instagram,
  Linkedin,
  MessageCircle,
  Sparkles,
  Star,
  Twitter,
  Users,
  X,
  Youtube,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ────────────────────────────────────────────────────────────
   CommunityPage — neobrutal redesign
   Match the design language of AffiliateLearnMorePage:
   - hack-yellow / hack-black blocks
   - 3px black borders + 6px hard shadows
   - font-display bold headlines
   - rounded-2xl cards
   ──────────────────────────────────────────────────────────── */

const socialLinks = [
  { icon: Twitter,   name: 'Twitter',   url: 'https://twitter.com/hackknow' },
  { icon: Instagram, name: 'Instagram', url: 'https://instagram.com/hackknow' },
  { icon: Youtube,   name: 'YouTube',   url: 'https://youtube.com/hackknow' },
  { icon: Linkedin,  name: 'LinkedIn',  url: 'https://linkedin.com/company/hackknow' },
  { icon: Facebook,  name: 'Facebook',  url: 'https://facebook.com/hackknow' },
];

const terms = [
  {
    icon: Heart,
    title: 'Follow All Social Media',
    description:
      'Follow HackKnow on ALL our platforms — Twitter, Instagram, YouTube, LinkedIn, Facebook. One missing = no freebie.',
    action: 'Tap each icon below',
  },
  {
    icon: MessageCircle,
    title: 'Write an Honest Review',
    description:
      'After downloading, post an honest review on ANY one social platform. Screenshots welcome — fake hype is not.',
    action: 'Tag @hackknow in your post',
  },
  {
    icon: Star,
    title: 'Rate on the Website',
    description:
      'Drop a star rating + a few honest lines on the product page. Your feedback shapes what we build next.',
    action: 'Rate on the product page',
  },
];

const benefits = [
  '1000+ premium templates — free for the community',
  'Fresh freebies dropped every week',
  'Community Q&A and creator support',
  'Early access to new products before public launch',
  'Member-only discount codes',
];

const dos = [
  'Post on Twitter / Instagram / LinkedIn / Facebook',
  'Add screenshots of the product',
  'Tag @hackknow',
  'Use #HackKnowFreebies',
  'Share your honest experience',
];

const dontsForReviews = [
  'No copy-paste reviews from others',
  'No fake 5-star spam without trying it',
  'No private accounts (we can\'t verify)',
  'No screenshots of someone else\'s work',
];

const CommunityPage = () => {
  return (
    <div className="min-h-screen bg-[#fffbea]">

      {/* ════════ HERO ════════ */}
      <section className="bg-hack-black text-white pt-16 pb-24 lg:pt-24 lg:pb-32 relative overflow-hidden">
        <div className="absolute -top-40 -right-32 w-96 h-96 bg-hack-yellow/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-32 w-80 h-80 bg-hack-orange/20 rounded-full blur-3xl" />

        <div className="relative w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white/60 hover:text-hack-yellow text-sm mb-8 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            <div className="inline-flex items-center gap-2 bg-hack-yellow text-hack-black px-4 py-2 rounded-full text-sm font-bold mb-6">
              <Sparkles className="w-4 h-4" />
              50,000+ creators already inside
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-7xl leading-[1.05] mb-8">
              Get the premium stuff —<br />
              <span className="text-hack-yellow">for free.</span>
            </h1>

            <p className="text-white/70 text-lg lg:text-xl max-w-3xl mb-10 leading-relaxed">
              Follow us on all platforms, share an honest review, get instant access
              to 1,000+ premium templates and tools.
              <br /><br />
              <span className="text-white">No payment. No catch. Just creators helping creators.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/shop?filter=free">
                <Button className="h-14 px-8 bg-hack-yellow hover:bg-hack-yellow text-hack-black font-bold rounded-full text-lg shadow-[6px_6px_0_#fff] hover:shadow-[3px_3px_0_#fff] hover:translate-x-[3px] hover:translate-y-[3px] transition w-full sm:w-auto">
                  <Gift className="w-5 h-5 mr-2" />
                  Browse Freebies
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  variant="outline"
                  className="h-14 px-8 border-2 border-white/30 text-white hover:bg-white/10 rounded-full font-bold text-lg w-full sm:w-auto"
                >
                  How it works
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ SOCIAL BAR (yellow strip, neobrutal) ════════ */}
      <section className="bg-hack-yellow border-y-[3px] border-hack-black py-8">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-hack-black font-bold text-sm uppercase tracking-widest mb-5">
              Follow on every platform to unlock free downloads
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              {socialLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3 bg-hack-black text-hack-yellow border-[3px] border-hack-black rounded-full font-bold text-sm shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition"
                >
                  <s.icon className="w-5 h-5" />
                  <span>{s.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════ HOW IT WORKS — 3 STEPS ════════ */}
      <section id="how-it-works" className="py-20 lg:py-28">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block bg-hack-black text-hack-yellow px-3 py-1 text-xs font-bold tracking-widest uppercase mb-4 rounded-sm">
                Three steps. That's it.
              </div>
              <h2 className="font-display font-bold text-3xl lg:text-5xl text-hack-black mb-4">
                How to get free access
              </h2>
              <p className="text-hack-black/60 text-lg max-w-2xl mx-auto">
                Quick and honest — built so the community keeps growing for everyone.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {terms.map((term, i) => (
                <div
                  key={i}
                  className="bg-white border-[3px] border-hack-black rounded-2xl p-6 lg:p-8 shadow-[6px_6px_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_#000] transition"
                >
                  <div className="flex items-start gap-4 mb-5">
                    <div className="shrink-0 w-14 h-14 bg-hack-yellow border-[3px] border-hack-black rounded-xl flex items-center justify-center">
                      <term.icon className="w-7 h-7 text-hack-black" strokeWidth={2.5} />
                    </div>
                    <div className="shrink-0 w-10 h-10 bg-hack-black text-hack-yellow rounded-full flex items-center justify-center font-display font-bold text-lg">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="font-display font-bold text-xl text-hack-black mb-2">
                    {term.title}
                  </h3>
                  <p className="text-hack-black/70 leading-relaxed mb-5">
                    {term.description}
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-hack-yellow border-2 border-hack-black rounded-full text-xs font-bold text-hack-black">
                    <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                    {term.action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════ WHAT YOU GET ════════ */}
      <section className="py-20 lg:py-28 bg-hack-black text-white">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

              <div>
                <div className="inline-block bg-hack-yellow text-hack-black px-3 py-1 text-xs font-bold tracking-widest uppercase mb-4 rounded-sm">
                  Member benefits
                </div>
                <h3 className="font-display font-bold text-3xl lg:text-5xl mb-6 leading-tight">
                  What you unlock<br />
                  <span className="text-hack-yellow">the moment you join</span>
                </h3>
                <ul className="space-y-4">
                  {benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="shrink-0 w-7 h-7 bg-hack-yellow rounded-full flex items-center justify-center mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-hack-black" strokeWidth={3} />
                      </div>
                      <span className="text-white/90 text-lg leading-snug">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Stat block */}
              <div className="bg-hack-yellow text-hack-black border-[3px] border-white rounded-2xl p-8 lg:p-12 shadow-[8px_8px_0_#fff] text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-hack-black border-[3px] border-hack-black rounded-2xl flex items-center justify-center">
                  <Users className="w-12 h-12 text-hack-yellow" strokeWidth={2.5} />
                </div>
                <div className="font-display font-bold text-5xl lg:text-6xl mb-2">50,000+</div>
                <div className="text-hack-black/70 font-bold uppercase tracking-widest text-sm mb-6">
                  Active community members
                </div>
                <div className="border-t-2 border-hack-black/20 pt-5 grid grid-cols-2 gap-4 text-left">
                  <div>
                    <div className="font-display font-bold text-2xl">1,000+</div>
                    <div className="text-hack-black/60 text-xs uppercase">Free templates</div>
                  </div>
                  <div>
                    <div className="font-display font-bold text-2xl">Weekly</div>
                    <div className="text-hack-black/60 text-xs uppercase">New drops</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ════════ REVIEW GUIDELINES (do / don't) ════════ */}
      <section className="py-20 lg:py-28">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block bg-hack-yellow border-2 border-hack-black text-hack-black px-3 py-1 text-xs font-bold tracking-widest uppercase mb-4 rounded-sm">
                Review playbook
              </div>
              <h2 className="font-display font-bold text-3xl lg:text-5xl text-hack-black mb-4">
                What a great review looks like
              </h2>
              <p className="text-hack-black/60 text-lg max-w-2xl mx-auto">
                Honest reviews build trust. Trust grows the community. Community gets more freebies.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* DO */}
              <div className="bg-hack-yellow border-[3px] border-hack-black rounded-2xl p-7 lg:p-8 shadow-[6px_6px_0_#000]">
                <div className="inline-flex items-center gap-2 bg-hack-black text-hack-yellow px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-5">
                  <CheckCircle2 className="w-4 h-4" />
                  DO this
                </div>
                <h3 className="font-display font-bold text-xl text-hack-black mb-5 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  On social media
                </h3>
                <ul className="space-y-3">
                  {dos.map((d, i) => (
                    <li key={i} className="flex items-start gap-3 text-hack-black font-medium">
                      <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" strokeWidth={2.5} />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* DON'T */}
              <div className="bg-white border-[3px] border-hack-black rounded-2xl p-7 lg:p-8 shadow-[6px_6px_0_#000]">
                <div className="inline-flex items-center gap-2 bg-hack-black text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-5">
                  <X className="w-4 h-4" strokeWidth={3} />
                  Don't do this
                </div>
                <h3 className="font-display font-bold text-xl text-hack-black mb-5 flex items-center gap-2">
                  <Star className="w-5 h-5 text-hack-orange" />
                  Keeps the community real
                </h3>
                <ul className="space-y-3">
                  {dontsForReviews.map((d, i) => (
                    <li key={i} className="flex items-start gap-3 text-hack-black/80 font-medium">
                      <X className="w-5 h-5 mt-0.5 shrink-0 text-red-600" strokeWidth={3} />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Where to review (website CTA strip) */}
            <div className="mt-10 bg-hack-black text-white border-[3px] border-hack-black rounded-2xl p-7 lg:p-8 shadow-[6px_6px_0_#000] flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 bg-hack-yellow text-hack-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3">
                  <Star className="w-4 h-4" />
                  On the website
                </div>
                <h4 className="font-display font-bold text-xl lg:text-2xl">
                  Open the product page → tap "Write a Review" → rate 1-5 ★ → drop honest feedback.
                </h4>
              </div>
              <Link to="/shop?filter=free" className="shrink-0">
                <Button className="h-12 px-6 bg-hack-yellow hover:bg-hack-yellow text-hack-black font-bold rounded-full whitespace-nowrap shadow-[4px_4px_0_#fff] hover:shadow-[2px_2px_0_#fff] hover:translate-x-[2px] hover:translate-y-[2px] transition">
                  Pick a freebie
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ FINAL CTA ════════ */}
      <section className="py-20 lg:py-28 bg-[#fff5d6]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-hack-orange text-white px-4 py-2 rounded-full text-sm font-bold mb-6">
              <Zap className="w-4 h-4" />
              Ready to join?
            </div>
            <h2 className="font-display font-bold text-3xl lg:text-5xl text-hack-black mb-6 leading-tight">
              Follow. Review. Download.<br />
              <span className="text-hack-black/60">It's that simple.</span>
            </h2>
            <p className="text-hack-black/70 text-lg mb-10 max-w-xl mx-auto">
              Tap the freebies button, complete the steps, and the premium stuff is yours — today.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/shop?filter=free">
                <Button className="h-14 px-8 bg-hack-black hover:bg-hack-black text-hack-yellow font-bold rounded-full text-lg shadow-[6px_6px_0_#000] hover:shadow-[3px_3px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition w-full sm:w-auto">
                  <Gift className="w-5 h-5 mr-2" />
                  Get Freebies Now
                </Button>
              </Link>
              <a
                href="https://twitter.com/intent/tweet?text=Just%20joined%20%40hackknow%20community!%20Excited%20to%20get%20premium%20freebies%20%23HackKnowFreebies"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  className="h-14 px-8 border-2 border-hack-black text-hack-black hover:bg-hack-black hover:text-white rounded-full font-bold text-lg w-full sm:w-auto"
                >
                  <Twitter className="w-5 h-5 mr-2" />
                  Share on Twitter
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CommunityPage;
