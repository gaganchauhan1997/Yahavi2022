import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";

const COOKIE_KEY = "hackknow-cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto bg-hack-black text-white rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-white/10 animate-in slide-in-from-bottom-4 duration-500">

        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-hack-yellow/20 flex items-center justify-center">
          <Cookie className="w-5 h-5 text-hack-yellow" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm mb-1">We use cookies</p>
          <p className="text-white/60 text-xs leading-relaxed">
            We use cookies to improve your experience, analyze site traffic and personalise content.
            By clicking "Accept", you agree to our{" "}
            <a href="/privacy-policy" className="text-hack-yellow hover:underline">
              Privacy Policy
            </a>.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-xs font-medium text-white/60 hover:text-white rounded-lg border border-white/20 hover:border-white/40 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-5 py-2 text-xs font-bold bg-hack-yellow text-hack-black rounded-lg hover:bg-hack-yellow/90 transition-colors"
          >
            Accept All
          </button>
        </div>

        {/* Close */}
        <button
          onClick={decline}
          className="absolute top-3 right-3 sm:static text-white/40 hover:text-white/70 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
