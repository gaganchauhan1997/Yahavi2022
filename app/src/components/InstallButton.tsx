import { useEffect, useState, useCallback } from "react";
import { Download, CheckCircle2 } from "lucide-react";

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

export default function InstallButton({ variant = "compact" }: { variant?: "compact" | "full" }) {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => {
    if (isStandalone()) return true;
    try { return localStorage.getItem(INSTALLED_KEY) === "1"; } catch { return false; }
  });
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === "1"; } catch { return false; }
  });

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
  }, [evt]);

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
  if (!evt || dismissed) return null;

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 px-5 py-3 bg-hack-yellow text-hack-black border-2 border-hack-black rounded-xl font-display font-bold text-sm shadow-[4px_4px_0_0_#0A0A0A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
      >
        <Download className="w-4 h-4" /> Install HackKnow
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={install}
      title="Install HackKnow as an app"
      aria-label="Install HackKnow"
      className="hidden md:inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-hack-yellow text-hack-black border-2 border-hack-black text-xs font-bold shadow-[2px_2px_0_0_#0A0A0A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#0A0A0A] transition-all"
    >
      <Download className="w-3.5 h-3.5" /> Install
    </button>
  );
}
