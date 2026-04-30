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

          {/* Mobile Phone Mockup — bigger but fitted */}
          <div className="lg:hidden flex justify-end -mt-2 mb-4">
            <div className="relative">
              <img
                src="/images/hero/phone-mockup.png"
                alt="Hackknow App"
                width="200"
                height="400"
                className="w-[170px] sm:w-[200px] h-auto drop-shadow-2xl animate-float rounded-[1.75rem] border-[3px] border-hack-black"
                loading="lazy"
              />
              <div className="absolute -bottom-3 -left-3 bg-hack-yellow text-hack-black px-2.5 py-1 rounded-lg font-display font-bold text-[10px] whitespace-nowrap border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#1A1A1A]">
                10K+ Customers
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
