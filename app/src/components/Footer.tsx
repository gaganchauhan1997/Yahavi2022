import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Twitter, Instagram, Youtube, Linkedin, Check, AlertCircle } from "lucide-react";

const socialLinks = [
  { href: "https://twitter.com/hackknow", icon: Twitter, label: "Twitter" },
  { href: "https://instagram.com/hackknow", icon: Instagram, label: "Instagram" },
  { href: "https://youtube.com/hackknow", icon: Youtube, label: "YouTube" },
  { href: "https://linkedin.com/company/hackknow", icon: Linkedin, label: "LinkedIn" },
];

type SubscribeStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubscribeStatus>({ kind: "idle" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus({ kind: "loading" });
    try {
      const res = await fetch(
        "https://www.hackknow.com/wp-json/hackknow/v1/newsletter/subscribe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ email: trimmed, source: "footer" }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        code?: string;
      };
      if (res.ok && data.ok) {
        setStatus({
          kind: "success",
          message: data.message || "You're in! Check your inbox for a welcome from HackKnow.",
        });
        setEmail("");
      } else {
        setStatus({
          kind: "error",
          message: data.message || "Could not subscribe right now. Please try again.",
        });
      }
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Please check your connection and try again.",
      });
    }
  };

  return (
    <div className="w-full max-w-md">
      <form className="flex w-full gap-3" onSubmit={handleSubmit}>
        <input
          type="email"
          required
          autoComplete="email"
          aria-label="Email address"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status.kind === "loading"}
          className="flex-1 px-5 py-3 bg-white text-hack-black placeholder:text-hack-black/40 rounded-xl text-sm font-medium border-[2.5px] border-hack-white shadow-[4px_4px_0_0_#FFF055] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[2px_2px_0_0_#FFF055] disabled:opacity-60 transition-all"
        />
        <button
          type="submit"
          disabled={status.kind === "loading"}
          className="px-5 py-3 bg-hack-yellow text-hack-black rounded-xl text-sm font-black border-[2.5px] border-hack-white shadow-[4px_4px_0_0_#FF56F0] hover:shadow-[2px_2px_0_0_#FF56F0] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-60 disabled:cursor-not-allowed transition-all whitespace-nowrap"
        >
          {status.kind === "loading" ? "..." : "Subscribe"}
        </button>
      </form>
      {status.kind === "success" && (
        <div
          role="status"
          className="mt-3 flex items-center gap-2 px-3 py-2 bg-emerald-500/15 border-2 border-emerald-400 rounded-lg text-emerald-300 text-sm font-semibold"
        >
          <Check className="w-4 h-4 shrink-0" strokeWidth={3} />
          <span>{status.message}</span>
        </div>
      )}
      {status.kind === "error" && (
        <div
          role="alert"
          className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-500/15 border-2 border-red-400 rounded-lg text-red-300 text-sm font-semibold"
        >
          <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={3} />
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
}

export default function Footer() {
  const navigate = useNavigate();
  
  const scrollToTop = (path: string) => {
    navigate(path);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  return (
    <footer className="bg-hack-black text-hack-white">
      {/* Newsletter Banner */}
      <div className="border-b border-hack-white/10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <h3 className="font-display font-bold text-2xl lg:text-3xl mb-2">
                Get Free Resources Weekly
              </h3>
              <p className="text-hack-white/60 text-sm">
                Join 10,000+ creators getting free templates, tips, and exclusive
                deals.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link to="/" className="font-display font-bold text-2xl">
              HACKKNOW
            </Link>
            <p className="text-hack-white/60 text-sm mt-4 mb-6 max-w-xs">
              Your one-stop marketplace for premium digital products. Made in
              India. Built for the World.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full bg-hack-white/10 flex items-center justify-center hover:bg-hack-yellow hover:text-hack-black transition-colors"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Shop Column */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4">
              Shop
            </h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => scrollToTop('/shop')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  All Products
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/shop?filter=bestseller')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  Best Sellers
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/shop?filter=new')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  New Arrivals
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/shop?filter=free')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  Free Resources
                </button>
              </li>
            </ul>
          </div>

          {/* Categories Column */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4">
              Categories
            </h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => scrollToTop('/shop/themes-templates')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  Themes & Templates
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/shop/excel-sheets')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  Excel & Sheets
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/shop/powerpoint-decks')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  PowerPoint Decks
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/shop/digital-marketing')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  Digital Marketing
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/shop/social-media')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  Social Media
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/shop/dashboards')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  Dashboards
                </button>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4">
              Support
            </h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => scrollToTop('/support')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  Help Center
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/faq')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  FAQ
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/contact')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => scrollToTop('/about')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/community')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  Community
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/testimonials')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  Testimonials
                </button>
              </li>
              <li>
                <a
                  href="https://hackknow.space"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  Tech Blogs & News
                </a>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/affiliate')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  Affiliate Program
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-hack-white/10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 border-b border-hack-white/10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          <a href="mailto:team@hackknow.com" className="text-xs text-hack-white/50 hover:text-hack-yellow transition-colors flex items-center gap-1.5">
            <span>✉</span> team@hackknow.com
          </a>
          <span className="hidden sm:block text-hack-white/20">|</span>
          <a href="tel:+918796018700" className="text-xs text-hack-white/50 hover:text-hack-yellow transition-colors flex items-center gap-1.5">
            <span>📞</span> +91 87960 18700
          </a>
          <span className="hidden sm:block text-hack-white/20">|</span>
          <span className="text-xs text-hack-white/50 flex items-center gap-1.5">
            <span>📍</span> Delhi, India
          </span>
        </div>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-hack-white/40 text-center sm:text-left">
            &copy; 2026 HackKnow. All rights reserved. Made in Delhi, India.
          </p>
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
            <button
              onClick={() => scrollToTop('/terms')}
              className="text-xs text-hack-white/40 hover:text-hack-white/70 transition-colors"
            >
              Terms
            </button>
            <button
              onClick={() => scrollToTop('/privacy')}
              className="text-xs text-hack-white/40 hover:text-hack-white/70 transition-colors"
            >
              Privacy
            </button>
            <button
              onClick={() => scrollToTop('/refund-policy')}
              className="text-xs text-hack-white/40 hover:text-hack-white/70 transition-colors"
            >
              Refunds
            </button>
            <button
              onClick={() => scrollToTop('/dmca')}
              className="text-xs text-hack-white/40 hover:text-hack-white/70 transition-colors"
            >
              DMCA
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
