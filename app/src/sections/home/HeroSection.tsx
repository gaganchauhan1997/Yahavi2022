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
      {/* Left Panel - Gradient Visual */}
      <div className="hidden lg:block w-1/2 relative bg-gradient-hero overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-hack-yellow/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-hack-magenta/20 blur-3xl" />
        </div>

        {/* Phone Mockup */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <img
              src="/images/hero/phone-mockup.png"
              alt="Hackknow App"
              className="w-[320px] xl:w-[380px] h-auto drop-shadow-2xl animate-float"
            />
            {/* Floating Badge */}
            <div className="absolute -bottom-4 -right-8 bg-hack-yellow text-hack-black px-4 py-2 rounded-full font-display font-bold text-sm shadow-lg animate-bounce-subtle">
              50K+ Happy Customers
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="flex-1 flex flex-col justify-center bg-hack-white relative">
        {/* Mobile gradient background */}
        <div className="lg:hidden absolute inset-0 bg-gradient-hero opacity-90" />

        <div className="relative z-10 px-6 sm:px-8 lg:px-16 xl:px-20 py-24 lg:py-0">
          {/* Tagline */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-hack-yellow/20 rounded-full mb-6 lg:mb-8">
            <span className="w-2 h-2 rounded-full bg-hack-yellow animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider text-hack-black/70">
              Digital Marketplace
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight mb-6 lg:mb-8">
            <span className="block">DIGITAL</span>
            <span className="block">ASSETS.</span>
            <span className="block text-gradient">INSTANT IMPACT.</span>
          </h1>

          {/* Description */}
          <p className="text-base lg:text-lg text-hack-black/70 max-w-md mb-8 lg:mb-10 leading-relaxed">
            Hackknow is your one-stop marketplace for premium digital products —
            from website templates to spreadsheets, presentation decks, marketing
            kits, and more.
          </p>
          <p className="text-sm font-mono text-hack-black/50 mb-8">
            Made in India. Built for the World.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 mb-12 lg:mb-16">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-7 py-4 bg-hack-black text-hack-white rounded-full text-sm font-bold hover:bg-hack-black/80 transition-colors shadow-lg"
            >
              Explore All Assets
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/shop/free-resources"
              className="inline-flex items-center gap-2 px-7 py-4 border-2 border-hack-black/20 text-hack-black rounded-full text-sm font-medium hover:border-hack-black/40 transition-colors"
            >
              Browse Free Resources
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 lg:gap-10">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
                <Users className="w-5 h-5 text-hack-magenta" />
                <span className="font-display font-bold text-2xl lg:text-3xl">
                  50K+
                </span>
              </div>
              <p className="text-xs text-hack-black/50 font-mono">
                Happy Customers
              </p>
            </div>
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-hack-orange" />
                <span className="font-display font-bold text-2xl lg:text-3xl">
                  10K+
                </span>
              </div>
              <p className="text-xs text-hack-black/50 font-mono">
                Premium Assets
              </p>
            </div>
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="font-display font-bold text-2xl lg:text-3xl">
                  100%
                </span>
              </div>
              <p className="text-xs text-hack-black/50 font-mono">
                Secure Payments
              </p>
            </div>
          </div>
        </div>

        {/* Scroll Ticker */}
        <div className="absolute bottom-16 left-0 right-0 overflow-hidden border-t border-b border-hack-black/10 py-3 bg-hack-white/80 backdrop-blur-sm">
          <div
            ref={tickerRef}
            className="flex whitespace-nowrap"
            style={{ width: "max-content" }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="text-xs font-mono uppercase tracking-widest text-hack-black/40 mx-8"
              >
                Premium Resources &bull; Instant Download &bull; Quality
                Checked &bull; Affordable Pricing &bull; Global Use License
                &bull;
              </span>
            ))}
          </div>
        </div>

        {/* Scroll Down Indicator */}
        <button
          onClick={() =>
            window.scrollTo({
              top: window.innerHeight,
              behavior: "smooth",
            })
          }
          className="absolute bottom-4 right-6 lg:right-10 w-12 h-12 rounded-full bg-hack-black text-hack-white flex items-center justify-center shadow-lg hover:bg-hack-black/80 transition-colors animate-bounce-subtle z-20"
          aria-label="Scroll down"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}
