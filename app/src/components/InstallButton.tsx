import { useEffect, useState, useCallback } from "react";
import { Download, CheckCircle2, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISSED_KEY = "hackknow-install-dismissed-v1";
const INSTALLED_KEY = "hackknow-installed-v1";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return true;
  return false;
}

function detectIOS(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPhone / iPod / iPad (legacy) — and iPadOS 13+ which reports as MacIntel + touch.
  const isiOSUA = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  const isiPadOS =
    navigator.platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1;
  return isiOSUA || isiPadOS;
}

function isSafariOnIOS(): boolean {
  if (!detectIOS()) return false;
  const ua = navigator.userAgent || "";
  // Exclude in-app browsers (FB, Instagram, Line, WeChat) where Add-to-Home-Screen is hidden.
  if (/FBAN|FBAV|Instagram|Line|MicroMessenger|GSA\//.test(ua)) return false;
  // Safari has "Safari" but not "CriOS" (Chrome iOS) / "FxiOS" (Firefox iOS) / "EdgiOS".
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

export default function InstallButton({ variant = "compact" }: { variant?: "compact" | "full" }) {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => {
    if (isStandalone()) return true;
    try { return localStorage.getItem(INSTALLED_KEY) === "1"; } catch { return false; }
  });
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === "1"; } catch { return false; }
  });
  const [iosOpen, setIosOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [iosCanInstall, setIosCanInstall] = useState(false);

  useEffect(() => {
    setIos(detectIOS());
    setIosCanInstall(isSafariOnIOS());
  }, []);

  useEffect(() => {
    if (installed) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvt(null);
      try { localStorage.setItem(INSTALLED_KEY, "1"); } catch { /* noop */ }
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [installed]);

  const install = useCallback(async () => {
    // iOS path: open instruction modal (Apple does not allow programmatic install).
    if (ios) {
      setIosOpen(true);
      return;
    }
    if (!evt) return;
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        try { localStorage.setItem(INSTALLED_KEY, "1"); } catch { /* noop */ }
      } else {
        setDismissed(true);
        try { localStorage.setItem(DISMISSED_KEY, "1"); } catch { /* noop */ }
      }
    } finally {
      setEvt(null);
    }
  }, [evt, ios]);

  const showFor = ios ? iosCanInstall : !!evt;

  if (installed) {
    if (variant === "full") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-green-700">
          <CheckCircle2 className="w-3.5 h-3.5" /> App installed
        </span>
      );
    }
    return null;
  }
  if (!showFor || dismissed) return null;

  const buttonLabel = ios ? "Add to Home Screen" : "Install";
  const fullLabel = ios ? "Add to Home Screen" : "Install HackKnow";
  const Icon = ios ? Share : Download;

  return (
    <div className="relative inline-flex">
      {variant === "full" ? (
        <button
          type="button"
          onClick={install}
          className="inline-flex items-center gap-2 px-5 py-3 bg-hack-yellow text-hack-black border-2 border-hack-black rounded-xl font-display font-bold text-sm shadow-[4px_4px_0_0_#0A0A0A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
        >
          <Icon className="w-4 h-4" strokeWidth={2.5} /> {fullLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={install}
          title={ios ? "Tap Share, then Add to Home Screen" : "Install HackKnow as an app"}
          aria-label={fullLabel}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-hack-yellow text-hack-black border-2 border-hack-black text-xs font-bold shadow-[2px_2px_0_0_#0A0A0A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#0A0A0A] transition-all whitespace-nowrap"
        >
          <Icon className="w-3.5 h-3.5" strokeWidth={2.5} /> {buttonLabel}
        </button>
      )}

      {/* iOS quick hint — single-line popover (no big modal) */}
      {iosOpen && (
        <div
          role="dialog"
          aria-label="Add to Home Screen hint"
          className="absolute right-0 top-full mt-2 z-[9999] w-[260px] bg-hack-black text-white border-[2.5px] border-hack-black rounded-xl shadow-[4px_4px_0_0_#0A0A0A] p-3 pr-9"
        >
          <button
            type="button"
            onClick={() => setIosOpen(false)}
            aria-label="Close hint"
            className="absolute top-1.5 right-1.5 w-6 h-6 inline-flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.75} />
          </button>
          <p className="text-xs leading-relaxed font-medium">
            Tap the{" "}
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 bg-hack-yellow text-hack-black border border-hack-black rounded font-bold align-middle">
              <Share className="w-3 h-3" strokeWidth={2.75} />
            </span>{" "}
            <span className="font-bold text-hack-yellow">Share</span> button below, then{" "}
            <span className="font-bold text-hack-yellow">Add to Home Screen</span>.
          </p>
          {/* tail arrow pointing up to the button */}
          <span
            aria-hidden
            className="absolute -top-[7px] right-6 w-3 h-3 bg-hack-black border-t-[2.5px] border-l-[2.5px] border-hack-black rotate-45"
          />
        </div>
      )}
    </div>
  );
}
