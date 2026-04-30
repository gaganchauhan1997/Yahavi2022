import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, TrendingUp, Users, Shield } from "lucide-react";

export default function HeroSection() {
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ticker = tickerRef.current;
    if (!ticker) return;

    let animationId: number;
    let position = 0;

    const animate = () => {
      position -= 0.5;
      if (Math.abs(position) >= ticker.scrollWidth / 2) {
        position = 0;
      }
      ticker.style.transform = `translateX(${position}px)`;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <section className="relative min-h-screen flex">
      {/* Left Panel - Gradient Visual (Desktop only) */}
      <div className="hidden lg:block w-1/2 relative bg-gradient-hero overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-hack-yellow/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-hack-magenta/20 blur-3xl" />
        </div>

        {/* Phone Mockup */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <picture>
              <source srcSet="/images/hero/phone-mockup.webp" type="image/webp" />
              <img
                src="/images/hero/phone-mockup.png"
                alt="Hackknow App"
                width="380"
                height="760"
                className="w-[340px] xl:w-[400px] h-auto drop-shadow-2xl animate-float rounded-[2.5rem] ring-2 ring-hack-black"
                fetchPriority="high"
                decoding="async"
              />
            </picture>
            {/* Floating Badge - neo-brutal */}
            <div className="absolute -bottom-5 -right-6 bg-hack-yellow text-hack-black px-4 py-2 rounded-xl font-display font-bold text-sm border-[3px] border-hack-black shadow-[5px_5px_0_0_#1A1A1A] animate-bounce-subtle">
              10K+ Happy Customers
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="flex-1 flex flex-col justify-center bg-hack-white relative">
        {/* Mobile gradient background */}
        <div className="lg:hidden absolute inset-0 bg-gradient-hero opacity-95" />

        <div className="relative z-10 px-5 sm:px-8 lg:px-16 xl:px-20 pt-20 pb-32 lg:py-0">
          {/* Tagline pill - neo-brutal */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-hack-yellow rounded-full mb-5 lg:mb-8 border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#1A1A1A]">
            <span className="w-2 h-2 rounded-full bg-hack-black animate-pulse" />
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-hack-black">
              Digital Marketplace
            </span>
          </div>

          {/* Headline — bigger on mobile, fits perfectly */}
          <h1 className="font-display font-black text-[44px] leading-[0.95] sm:text-6xl lg:text-6xl xl:text-7xl tracking-tight mb-5 lg:mb-8 text-white lg:text-hack-black drop-shadow-[2px_2px_0_rgba(26,26,26,0.25)] lg:drop-shadow-none">
            <span className="block">DIGITAL</span>
            <span className="block">ASSETS.</span>
            <span className="block text-gradient">INSTANT IMPACT.</span>
          </h1>

          {/* MOBILE: Animated Asset Stack — replaces phone mockup.
              Pure CSS keyframes (GPU-only transforms). Visualises the
              "DIGITAL ASSETS" headline with 4 stacked neo-brutal cards
              that gently breathe + a live downloads counter strip. */}
          <div className="lg:hidden mb-5 -mt-1" aria-label="Live HackKnow asset drop">
            <style>{`
              @keyframes hk-card-bob-0 {
                0%, 100% { transform: translate(-50%, 0) rotate(-9deg); }
                50%      { transform: translate(-50%, -6px) rotate(-11deg); }
              }
              @keyframes hk-card-bob-1 {
                0%, 100% { transform: translate(-50%, 0) rotate(-3deg); }
                50%      { transform: translate(-50%, -4px) rotate(-1deg); }
              }
              @keyframes hk-card-bob-2 {
                0%, 100% { transform: translate(-50%, 0) rotate(3deg); }
                50%      { transform: translate(-50%, -7px) rotate(5deg); }
              }
              @keyframes hk-card-bob-3 {
                0%, 100% { transform: translate(-50%, 0) rotate(8deg); }
                50%      { transform: translate(-50%, -9px) rotate(10deg); }
              }
              @keyframes hk-stamp-pop {
                0%, 70%, 100% { transform: rotate(-14deg) scale(1); }
                80%           { transform: rotate(-18deg) scale(1.18); }
                90%           { transform: rotate(-14deg) scale(1); }
              }
              @keyframes hk-pulse-dot {
                0%, 100% { opacity: 1;   box-shadow: 0 0 0 0 rgba(255,193,7,0.7); }
                50%      { opacity: 0.6; box-shadow: 0 0 0 6px rgba(255,193,7,0); }
              }
              @keyframes hk-ticker-up {
                0%   { transform: translateY(0);    opacity: 1; }
                85%  { transform: translateY(-90%); opacity: 1; }
                90%  { transform: translateY(-90%); opacity: 0; }
                91%  { transform: translateY(100%); opacity: 0; }
                100% { transform: translateY(0);    opacity: 1; }
              }
              .hk-anim { will-change: transform; }
              @media (prefers-reduced-motion: reduce) {
                .hk-anim { animation: none !important; }
              }
            `}</style>

            <div className="relative h-[170px] w-full max-w-[300px] mx-auto">
              {/* Card 1 — back (.pdf magenta) */}
              <div
                className="hk-anim absolute top-7 left-1/2 w-[210px] h-[125px] bg-hack-magenta border-[3px] border-hack-black rounded-2xl shadow-[5px_5px_0_#1A1A1A] p-3 flex flex-col"
                style={{ animation: "hk-card-bob-0 4.2s ease-in-out infinite" }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/80">.pdf</span>
                  <span className="font-mono text-[9px] font-bold text-white/70">120+</span>
                </div>
                <div className="mt-auto">
                  <div className="font-display font-black text-white text-[22px] leading-none">EBOOKS</div>
                  <div className="font-mono text-[10px] text-white/85 mt-0.5">Hindi + English</div>
                </div>
              </div>

              {/* Card 2 (.ppt orange) */}
              <div
                className="hk-anim absolute top-5 left-1/2 w-[210px] h-[125px] bg-hack-orange border-[3px] border-hack-black rounded-2xl shadow-[5px_5px_0_#1A1A1A] p-3 flex flex-col"
                style={{ animation: "hk-card-bob-1 4.2s ease-in-out infinite 0.35s" }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/85">.pptx</span>
                  <span className="font-mono text-[9px] font-bold text-white/75">350+</span>
                </div>
                <div className="mt-auto">
                  <div className="font-display font-black text-white text-[22px] leading-none">PITCH&nbsp;DECKS</div>
                  <div className="font-mono text-[10px] text-white/85 mt-0.5">Investor ready</div>
                </div>
              </div>

              {/* Card 3 (.zip code, dark) */}
              <div
                className="hk-anim absolute top-3 left-1/2 w-[210px] h-[125px] bg-hack-black text-white border-[3px] border-hack-black rounded-2xl shadow-[5px_5px_0_#1A1A1A] p-3 flex flex-col"
                style={{ animation: "hk-card-bob-2 4.2s ease-in-out infinite 0.7s" }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-hack-yellow">.zip</span>
                  <span className="font-mono text-[9px] font-bold text-white/70">90+</span>
                </div>
                <div className="mt-auto">
                  <div className="font-display font-black text-hack-yellow text-[22px] leading-none">CODE&nbsp;KITS</div>
                  <div className="font-mono text-[10px] text-white/80 mt-0.5">React · Next · WP</div>
                </div>
              </div>

              {/* Card 4 — front (.xlsx yellow) */}
              <div
                className="hk-anim absolute top-1 left-1/2 w-[210px] h-[125px] bg-hack-yellow border-[3px] border-hack-black rounded-2xl shadow-[6px_6px_0_#1A1A1A] p-3 flex flex-col"
                style={{ animation: "hk-card-bob-3 4.2s ease-in-out infinite 1.05s" }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-hack-black">.xlsx</span>
                  <span className="font-mono text-[9px] font-bold text-hack-black/80">500+</span>
                </div>
                <div className="mt-auto">
                  <div className="font-display font-black text-hack-black text-[22px] leading-none">MIS&nbsp;DASHBOARDS</div>
                  <div className="font-mono text-[10px] text-hack-black/75 mt-0.5">90% off for MIS pros</div>
                </div>
              </div>

              {/* Diagonal "INSTANT DL" stamp */}
              <div
                className="hk-anim absolute -top-1 -right-1 z-10 bg-white text-hack-black px-2.5 py-1 border-[3px] border-hack-black rounded-md font-display font-black text-[11px] tracking-wider shadow-[3px_3px_0_#1A1A1A] origin-center"
                style={{ animation: "hk-stamp-pop 3s ease-out infinite" }}
              >
                INSTANT&nbsp;DL
              </div>
            </div>

            {/* Live downloads ticker — vertical scroll */}
            <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-hack-black border-[2.5px] border-hack-yellow rounded-full max-w-[300px] mx-auto overflow-hidden shadow-[3px_3px_0_rgba(255,193,7,0.35)]">
              <span
                className="hk-anim w-2 h-2 rounded-full bg-hack-yellow shrink-0"
                style={{ animation: "hk-pulse-dot 1.6s ease-in-out infinite" }}
                aria-hidden="true"
              />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-hack-yellow shrink-0">LIVE</span>
              <div className="relative h-[14px] flex-1 overflow-hidden">
                <div
                  className="hk-anim absolute inset-0 flex flex-col font-mono text-[11px] font-semibold text-white whitespace-nowrap"
                  style={{ animation: "hk-ticker-up 12s ease-in-out infinite" }}
                >
                  <span className="h-[14px] leading-[14px]">Rohit ne MIS Dashboard download kiya</span>
                  <span className="h-[14px] leading-[14px]">Priya got Resume Bundle &mdash; Rs 0</span>
                  <span className="h-[14px] leading-[14px]">Aman ne Notion OS uthaya</span>
                  <span className="h-[14px] leading-[14px]">Sara &mdash; Pitch Deck Pro just now</span>
                  <span className="h-[14px] leading-[14px]">Vikram unlocked Code Kit free</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-[15px] sm:text-base lg:text-lg text-white lg:text-hack-black/75 max-w-md mb-3 lg:mb-6 leading-relaxed font-medium drop-shadow-[1px_1px_0_rgba(26,26,26,0.2)] lg:drop-shadow-none">
            Hackknow is your one-stop marketplace for premium digital products —
            from website templates to spreadsheets, presentation decks, marketing
            kits, and more.
          </p>
          <p className="text-[12px] sm:text-sm font-mono font-semibold text-white/85 lg:text-hack-black/55 mb-7 lg:mb-10">
            Made in India. Built for the World.
          </p>

          {/* CTA Buttons — neo-brutalism */}
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-10 lg:mb-14">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3.5 sm:px-7 sm:py-4 bg-hack-yellow text-hack-black rounded-xl text-sm font-bold border-[3px] border-hack-black shadow-[5px_5px_0_0_#1A1A1A] hover:shadow-[2px_2px_0_0_#1A1A1A] hover:translate-x-[3px] hover:translate-y-[3px] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none transition-all duration-150"
            >
              Explore All Assets
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </Link>
            <Link
              to="/shop/free-resources"
              className="inline-flex items-center gap-2 px-6 py-3.5 sm:px-7 sm:py-4 bg-white/95 text-hack-black rounded-xl text-sm font-bold border-[3px] border-hack-black shadow-[5px_5px_0_0_#1A1A1A] hover:shadow-[2px_2px_0_0_#1A1A1A] hover:translate-x-[3px] hover:translate-y-[3px] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none transition-all duration-150"
            >
              Browse Free Resources
            </Link>
          </div>

          {/* Stats — neo-brutal tiles */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            <div className="flex flex-col items-start gap-1 px-2.5 py-2.5 sm:px-3 sm:py-3 bg-white rounded-xl border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#1A1A1A]">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-hack-magenta" strokeWidth={2.5} />
              <span className="font-display font-black text-lg sm:text-2xl lg:text-3xl text-hack-black leading-none">
                10K+
              </span>
              <p className="text-[10px] sm:text-xs text-hack-black/70 font-mono font-semibold leading-tight">
                Happy Customers
              </p>
            </div>
            <div className="flex flex-col items-start gap-1 px-2.5 py-2.5 sm:px-3 sm:py-3 bg-white rounded-xl border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#1A1A1A]">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-hack-orange" strokeWidth={2.5} />
              <span className="font-display font-black text-lg sm:text-2xl lg:text-3xl text-hack-black leading-none">
                10K+
              </span>
              <p className="text-[10px] sm:text-xs text-hack-black/70 font-mono font-semibold leading-tight">
                Premium Assets
              </p>
            </div>
            <div className="flex flex-col items-start gap-1 px-2.5 py-2.5 sm:px-3 sm:py-3 bg-white rounded-xl border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#1A1A1A]">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" strokeWidth={2.5} />
              <span className="font-display font-black text-lg sm:text-2xl lg:text-3xl text-hack-black leading-none">
                100%
              </span>
              <p className="text-[10px] sm:text-xs text-hack-black/70 font-mono font-semibold leading-tight">
                Secure Payments
              </p>
            </div>
          </div>
        </div>

        {/* Scroll Ticker — desktop only (mobile bottom-bar already takes that space) */}
        <div className="hidden lg:block absolute bottom-16 left-0 right-0 overflow-hidden border-t-[2px] border-b-[2px] border-hack-black py-3 bg-hack-yellow/90">
          <div
            ref={tickerRef}
            className="flex whitespace-nowrap"
            style={{ width: "max-content" }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="text-xs font-mono font-bold uppercase tracking-widest text-hack-black mx-8"
              >
                Premium Resources &bull; Instant Download &bull; Quality
                Checked &bull; Affordable Pricing &bull; Global Use License
                &bull;
              </span>
            ))}
          </div>
        </div>

        {/* Scroll Down Indicator — neo-brutal */}
        <button
          onClick={() =>
            window.scrollTo({
              top: window.innerHeight,
              behavior: "smooth",
            })
          }
          className="hidden lg:flex absolute bottom-4 right-6 lg:right-10 w-12 h-12 rounded-xl bg-hack-yellow text-hack-black border-[3px] border-hack-black shadow-[4px_4px_0_0_#1A1A1A] hover:shadow-[2px_2px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all items-center justify-center animate-bounce-subtle z-20"
          aria-label="Scroll down"
        >
          <ChevronDown className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>
    </section>
  );
}
