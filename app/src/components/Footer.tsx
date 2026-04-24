import { Link } from "react-router-dom";
import { Twitter, Instagram, Youtube, Linkedin } from "lucide-react";

export default function Footer() {
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
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-hack-white/10 flex items-center justify-center hover:bg-hack-yellow hover:text-hack-black transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-hack-white/10 flex items-center justify-center hover:bg-hack-yellow hover:text-hack-black transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-hack-white/10 flex items-center justify-center hover:bg-hack-yellow hover:text-hack-black transition-colors"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-hack-white/10 flex items-center justify-center hover:bg-hack-yellow hover:text-hack-black transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Shop Column */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4">
              Shop
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/shop"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?filter=bestseller"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  Best Sellers
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?filter=new"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?filter=free"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  Free Resources
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?filter=bundle"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  Bundles
                </Link>
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
                <Link
                  to="/shop/themes-templates"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  Themes & Templates
                </Link>
              </li>
              <li>
                <Link
                  to="/shop/excel-sheets"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  Excel & Sheets
                </Link>
              </li>
              <li>
                <Link
                  to="/shop/powerpoint-decks"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  PowerPoint Decks
                </Link>
              </li>
              <li>
                <Link
                  to="/shop/digital-marketing"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  Digital Marketing
                </Link>
              </li>
              <li>
                <Link
                  to="/shop/social-media"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  Social Media Kits
                </Link>
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
                <Link
                  to="/support"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  How Downloads Work
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  License Info
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  Refund Policy
                </Link>
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
                <Link
                  to="/about"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm text-hack-white/60 hover:text-hack-yellow transition-colors"
                >
                  Affiliate Program
                </a>
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
            <Link
              to="/support"
              className="text-xs text-hack-white/40 hover:text-hack-white/70 transition-colors"
            >
              Terms & Conditions
            </Link>
            <Link
              to="/support"
              className="text-xs text-hack-white/40 hover:text-hack-white/70 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/support"
              className="text-xs text-hack-white/40 hover:text-hack-white/70 transition-colors"
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
