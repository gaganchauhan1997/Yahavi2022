import { Link, useNavigate } from "react-router-dom";
import { Twitter, Instagram, Youtube, Linkedin } from "lucide-react";

const socialLinks = [
  { href: "https://twitter.com/hackknow", icon: Twitter, label: "Twitter" },
  { href: "https://instagram.com/hackknow", icon: Instagram, label: "Instagram" },
  { href: "https://youtube.com/hackknow", icon: Youtube, label: "YouTube" },
  { href: "https://linkedin.com/company/hackknow", icon: Linkedin, label: "LinkedIn" },
];

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
                Join 50,000+ creators getting free templates, tips, and exclusive
                deals.
              </p>
            </div>
            <form className="flex w-full max-w-md gap-3" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-5 py-3 bg-hack-white/10 border border-hack-white/20 rounded-full text-sm text-hack-white placeholder:text-hack-white/40 focus:outline-none focus:border-hack-yellow"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-hack-yellow text-hack-black rounded-full text-sm font-bold hover:bg-hack-yellow/90 transition-colors whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
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
                  onClick={() => scrollToTop('/support')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  FAQ
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/support')}
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
                  onClick={() => scrollToTop('/support')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  Contact
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/community')}
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors text-left"
                >
                  Blog
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToTop('/about')}
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
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-hack-white/40">
            &copy; 2026 Hackknow. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <button
              onClick={() => scrollToTop('/support')}
              className="text-xs text-hack-white/40 hover:text-hack-white/70 transition-colors"
            >
              Terms & Conditions
            </button>
            <button
              onClick={() => scrollToTop('/support')}
              className="text-xs text-hack-white/40 hover:text-hack-white/70 transition-colors"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
