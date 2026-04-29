import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Send, X, Sparkles, ShoppingBag, Tag, Ticket, CheckCircle2, AlertCircle } from "lucide-react";
import { WP_REST_BASE } from "@/lib/api-base";
import { getAuthToken, getCurrentUser } from "@/lib/auth";

type Suggestion = { label: string; href: string };
type Product    = { id: number; name: string; price: string; href: string; image?: string };

type ChatMsg = {
  role: "user" | "bot";
  text: string;
  suggestions?: Suggestion[];
  products?: Product[];
  upsell?: Product[];
};

type CouponResult =
  | { valid: true; code: string; human: string; description?: string }
  | { valid: false; reason: string };

const STORAGE_KEY      = "hackknow-chat-history";
const SESSION_KEY      = "hackknow-chat-session-id";
const OPEN_KEY         = "hackknow-chat-open";
const MANISH_LOCAL_KEY = "hackknow-manish-step";   // mirror of server state for offline
const OWNER_EMAIL      = "monukumar1991.mk@gmail.com";

const seed: ChatMsg = {
  role: "bot",
  text:
    "Hi, I'm Yahavi AI — built by DeadMan. Ask me anything in any language (English, Hindi, Hinglish, French, German, Spanish…). I know HackKnow inside-out: products, prices, refunds, contact, policies — anything.",
  suggestions: [
    { label: "Show free templates", href: "/shop/free-resources" },
    { label: "Best Excel dashboards", href: "/shop/excel-templates" },
    { label: "Track my order",       href: "/account/orders" },
    { label: "Contact us",           href: "/contact" },
  ],
};

/* ── Manish sir's scripted opener ────────────────────────────────────────
 * Step 0 → show greeting, advance to 1
 * Step 1 → on Manish's next reply, show "if you don't mind…" question, advance to 2
 * Step 2 → if Manish says yes/haan/ok, show Excel joke + 4 templates, advance to 3
 * Step 3 → normal Gemini chat from now on (forever, persisted in user_meta)
 * ────────────────────────────────────────────────────────────────────── */
const MANISH_GREETING: ChatMsg = {
  role: "bot",
  text:
    "Hello Manish sir 🙏 — Welcome to your store. We have hundreds of varieties and we are now selling across the whole world. " +
    "And no need to worry — I am Yahavi, your store manager, and my developer trained me so well… " +
    "arrey template to kya, meh Taj Mahal bech dungi logo ko 😎. " +
    "Apko dikhau kuch bdhiya sa?",
  suggestions: [
    { label: "Haan, dikhao",   href: "/shop/best-sellers" },
    { label: "Free templates", href: "/shop/free-resources" },
    { label: "Today's stats",  href: "/account/dashboard" },
  ],
};
const MANISH_QUESTION: ChatMsg = {
  role: "bot",
  text:
    "Manish sir, agar aap mind na karein toh ek baat pooch sakti hu meh aapse… voh kaise he…\n" +
    "Bole 'haan' ya 'yes' — agree krre toh, toh boliyo… 😊",
};
const MANISH_EXCEL_JOKE: ChatMsg = {
  role: "bot",
  text:
    "Mrko pta hai apko Excel nahi aata chlana… Pulak sir ne bola rha 😂😂😂 — mrko maloom hai, maine sun rha tha. " +
    "Apke liye 4 Excel ke tutorial-cum-templates ekdum garma garam taiyaar — koi dikkat aaye toh meh toh hu he 💛",
  suggestions: [
    { label: "Excel Tutorials Bundle",   href: "/shop/excel-templates" },
    { label: "Founder's Dashboard",      href: "/product/founders-dashboard" },
    { label: "Sales Tracker Pro",        href: "/product/sales-tracker-pro" },
    { label: "Free Inventory Tracker",   href: "/product/free-inventory-tracker" },
  ],
};

const isAffirmative = (s: string): boolean =>
  /\b(haan|haa|han|ji|ji haan|yes|yeah|yep|sure|ok(ay)?|hmm+|theek hai|kar|chalo|bilkul|of course)\b/i.test(s);

function newSessionId(): string {
  // Prefer crypto.randomUUID when available
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch { /* noop */ }
  return "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getSessionId(): string {
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) { sid = newSessionId(); localStorage.setItem(SESSION_KEY, sid); }
    return sid;
  } catch {
    return newSessionId();
  }
}

export default function YahaviChat() {
  const [open, setOpen] = useState<boolean>(() => {
    try { return sessionStorage.getItem(OPEN_KEY) === "1"; } catch { return false; }
  });
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMsg[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* noop */ }
    return [seed];
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // We deliberately do NOT seed manishStep from localStorage. The server is the
  // source of truth (user_meta), and seeding from localStorage would let a
  // different user on the same device inherit Manish's scripted-state and
  // accidentally trigger the owner branches in send().
  const [manishStep, setManishStep] = useState<number>(3); // 3 = normal chat
  const [isOwnerLocal, setIsOwnerLocal] = useState<boolean>(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);

  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(getSessionId());

  /* ── Helpers: server-side history ────────────────────────────────── */
  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    const t = getAuthToken();
    if (t) h.Authorization = `Bearer ${t}`;
    return h;
  }, []);

  const persistMessage = useCallback(async (m: ChatMsg) => {
    try {
      await fetch(`${WP_REST_BASE}/chat/history`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          session_id:  sessionIdRef.current,
          role:        m.role,
          text:        m.text,
          suggestions: m.suggestions ?? [],
          products:    m.products ?? [],
        }),
      });
    } catch { /* fire-and-forget */ }
  }, [authHeaders]);

  const setManishStepBoth = useCallback(async (step: number) => {
    setManishStep(step);
    try { localStorage.setItem(MANISH_LOCAL_KEY, String(step)); } catch { /* noop */ }
    if (getAuthToken()) {
      try {
        await fetch(`${WP_REST_BASE}/chat/owner-state`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ step }),
        });
      } catch { /* noop */ }
    }
  }, [authHeaders]);

  /* ── On mount: hydrate from server + detect Manish ───────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = getCurrentUser();
      const emailIsOwner = user?.email?.toLowerCase() === OWNER_EMAIL;

      // 1. Pull server history if we have a token (covers cross-device)
      if (getAuthToken()) {
        try {
          const r = await fetch(`${WP_REST_BASE}/chat/history?limit=100`, { headers: authHeaders() });
          if (r.ok) {
            const j = await r.json() as { messages?: Array<{ role: string; text: string; suggestions?: Suggestion[]; products?: Product[] }> };
            if (!cancelled && Array.isArray(j.messages) && j.messages.length > 0) {
              setMessages(j.messages.map((m) => ({
                role: m.role === "bot" ? "bot" : "user",
                text: m.text,
                suggestions: m.suggestions ?? [],
                products: m.products ?? [],
              })));
            }
          }
        } catch { /* noop */ }
      } else {
        // Anon: try fetching by session id
        try {
          const r = await fetch(`${WP_REST_BASE}/chat/history?session_id=${encodeURIComponent(sessionIdRef.current)}&limit=100`);
          if (r.ok) {
            const j = await r.json() as { messages?: Array<{ role: string; text: string; suggestions?: Suggestion[]; products?: Product[] }> };
            if (!cancelled && Array.isArray(j.messages) && j.messages.length > 0) {
              setMessages(j.messages.map((m) => ({
                role: m.role === "bot" ? "bot" : "user",
                text: m.text,
                suggestions: m.suggestions ?? [],
                products: m.products ?? [],
              })));
            }
          }
        } catch { /* noop */ }
      }

      // 2. Owner-state detection (server is the source of truth for "isOwner"
      //    and the scripted-greeting step, so we never trust localStorage here)
      if (emailIsOwner && getAuthToken()) {
        try {
          const r = await fetch(`${WP_REST_BASE}/chat/owner-state`, { headers: authHeaders() });
          if (r.ok) {
            const j = await r.json() as { isOwner?: boolean; step?: number };
            if (!cancelled && j.isOwner) {
              setIsOwnerLocal(true);
              // Server returns the step it WAS at, then atomically advances 0→1
              // so a fast reload can't replay the greeting.
              const serverStep = Number.isFinite(j.step) ? Number(j.step) : 0;
              if (serverStep === 0) {
                // We display the greeting; server has already moved to step 1,
                // so locally we set 1 too — Manish's next message will trigger
                // MANISH_QUESTION via the send() interceptor.
                setMessages((prev) => {
                  const alreadyHasGreeting = prev.some((m) => m.text.startsWith("Hello Manish sir"));
                  if (alreadyHasGreeting) return prev;
                  return [...prev.filter((m) => m !== seed), MANISH_GREETING];
                });
                persistMessage(MANISH_GREETING);
                setManishStep(1);
              } else {
                // Already greeted previously — pick up wherever we left off.
                setManishStep(serverStep);
              }
              try { localStorage.setItem(MANISH_LOCAL_KEY, String(Math.max(serverStep, 1))); } catch { /* noop */ }
            }
          }
        } catch { /* noop */ }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Local cache + autoscroll ─────────────────────────────────────── */
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch { /* noop */ }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    try { sessionStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch { /* noop */ }
  }, [open]);

  /* ── Sender ──────────────────────────────────────────────────────── */
  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || sending) return;

    const userMsg: ChatMsg = { role: "user", text: q };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    /* ── Manish scripted-opener interception ───────────────────────── */
    // Owner-guard: only the verified owner can ever enter the scripted branches,
    // so a non-owner sharing the device with stale state cannot trigger them.
    if (isOwnerLocal && manishStep === 1) {
      // We are NOT calling /chat here, so the user message must be persisted
      // explicitly. The bot reply MANISH_QUESTION is also persisted explicitly.
      persistMessage(userMsg);
      // Advance state SYNCHRONOUSLY before the setTimeout, so a fast double-send
      // can't be processed twice as step-1.
      setManishStepBoth(2);
      setTimeout(() => {
        setMessages((m) => [...m, MANISH_QUESTION]);
        persistMessage(MANISH_QUESTION);
        setSending(false);
      }, 600);
      return;
    }
    if (isOwnerLocal && manishStep === 2) {
      persistMessage(userMsg);
      setManishStepBoth(3); // exit the scripted flow regardless of yes/no
      if (isAffirmative(q)) {
        setTimeout(() => {
          setMessages((m) => [...m, MANISH_EXCEL_JOKE]);
          persistMessage(MANISH_EXCEL_JOKE);
          setSending(false);
        }, 700);
        return;
      }
      // Manish said no — gracefully bow out & continue normal chat.
      const polite: ChatMsg = {
        role: "bot",
        text: "Bilkul sir 🙏 koi baat nahi. Aap jab bhi chahein, meh yahin hu. Ab batao — kya dikhau?",
        suggestions: [
          { label: "New arrivals",   href: "/new-arrivals" },
          { label: "Best sellers",   href: "/shop/best-sellers" },
          { label: "Today's orders", href: "/account/orders" },
        ],
      };
      setTimeout(() => {
        setMessages((m) => [...m, polite]);
        persistMessage(polite);
        setSending(false);
      }, 500);
      return;
    }
    // Normal flow → /chat will be called below. The PHP rest_pre_dispatch hook
    // auto-saves both the user message and the bot reply, so we deliberately
    // do NOT call persistMessage(userMsg) here to avoid duplicate rows.

    /* ── Normal Gemini round-trip ──────────────────────────────────── */
    try {
      const historyForApi = [...messages, userMsg].slice(-8).map((m) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.text,
      }));
      const res = await fetch(`${WP_REST_BASE}/chat`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          message: q,
          history: historyForApi,
          session_id: sessionIdRef.current,
        }),
      });
      const data = await res.json().catch(() => ({})) as Partial<ChatMsg> & { reply?: string };
      const botMsg: ChatMsg = {
        role: "bot",
        text: data.reply || data.text || "I'm here, but I couldn't form a reply. Try asking another way?",
        suggestions: data.suggestions || [],
        products: data.products || [],
      };

      // Upsell: if the bot returned products, fetch related cross-sell items.
      if (botMsg.products && botMsg.products.length > 0) {
        try {
          const ids = botMsg.products.map((p) => p.id).filter((n) => n > 0).join(",");
          if (ids) {
            const r = await fetch(`${WP_REST_BASE}/upsell?ids=${encodeURIComponent(ids)}`);
            if (r.ok) {
              const j = await r.json() as { products?: Product[] };
              if (Array.isArray(j.products) && j.products.length > 0) {
                botMsg.upsell = j.products.slice(0, 3);
              }
            }
          }
        } catch { /* noop */ }
      }

      setMessages((m) => [...m, botMsg]);
      // /chat already auto-saves bot reply server-side via the rest_pre_dispatch hook,
      // so we deliberately do NOT call persistMessage(botMsg) here to avoid duplicates.
    } catch {
      const fallback: ChatMsg = {
        role: "bot",
        text: "Connection hiccup — please try again in a moment.",
        suggestions: [],
      };
      setMessages((m) => [...m, fallback]);
    } finally {
      setSending(false);
    }
  }, [messages, sending, manishStep, isOwnerLocal, persistMessage, setManishStepBoth, authHeaders]);

  const handleSuggestion = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const handleClear = useCallback(async () => {
    if (!confirm("Clear chat history? This permanently deletes the conversation on this device and on the server.")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    try {
      const url = `${WP_REST_BASE}/chat/history?session_id=${encodeURIComponent(sessionIdRef.current)}`;
      await fetch(url, { method: "DELETE", headers: authHeaders() });
    } catch { /* noop */ }
    setMessages([seed]);
    // Reset session id so the next message starts a fresh thread.
    const fresh = newSessionId();
    try { localStorage.setItem(SESSION_KEY, fresh); } catch { /* noop */ }
    sessionIdRef.current = fresh;
  }, [authHeaders]);

  const validateCoupon = useCallback(async () => {
    const code = couponInput.trim();
    if (!code || couponBusy) return;
    setCouponBusy(true);
    setCouponResult(null);
    try {
      const r = await fetch(`${WP_REST_BASE}/coupon/validate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ code }),
      });
      const j = await r.json() as CouponResult;
      setCouponResult(j);
      // Echo result into the chat as a bot message so it persists in history.
      const echo: ChatMsg = j.valid
        ? {
            role: "bot",
            text: `🎟️ Coupon "${j.code}" applied — ${j.human}.\n${j.description ? j.description + "\n" : ""}Add it at checkout to redeem.`,
            suggestions: [{ label: "Continue to checkout", href: "/checkout" }, { label: "Browse shop", href: "/shop" }],
          }
        : {
            role: "bot",
            text: `❌ Sorry, that coupon isn't valid: ${j.reason}`,
            suggestions: [{ label: "See all deals", href: "/shop/best-sellers" }],
          };
      setMessages((m) => [...m, echo]);
      persistMessage(echo);
    } catch {
      setCouponResult({ valid: false, reason: "Could not reach the coupon service. Try again shortly." });
    } finally {
      setCouponBusy(false);
    }
  }, [couponInput, couponBusy, authHeaders, persistMessage]);

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        aria-label={open ? "Close Yahavi AI chat" : "Open Yahavi AI chat"}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 lg:bottom-5 right-4 lg:right-5 z-[60] w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-hack-yellow text-hack-black border-2 border-hack-black shadow-[4px_4px_0_0_#0A0A0A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0A0A0A] transition-all flex items-center justify-center"
      >
        {open ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Yahavi AI assistant"
          className="fixed bottom-36 lg:bottom-24 right-3 lg:right-5 z-[60] w-[min(380px,calc(100vw-1.5rem))] max-h-[72vh] lg:max-h-[74vh] flex flex-col rounded-2xl bg-white border-2 border-hack-black shadow-[6px_6px_0_0_#0A0A0A] overflow-hidden"
        >
          <header className="flex items-center gap-2 px-4 py-3 bg-hack-black text-white">
            <div className="w-8 h-8 rounded-lg bg-hack-yellow text-hack-black flex items-center justify-center font-display font-bold border border-hack-black">
              H
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-sm flex items-center gap-1">
                Yahavi AI <Sparkles className="w-3 h-3 text-hack-yellow" />
              </div>
              <div className="text-[10px] uppercase tracking-wider text-white/60 font-mono">
                by DeadMan • any language
              </div>
            </div>
            <button
              onClick={handleClear}
              className="ml-auto text-[10px] uppercase tracking-wider font-mono text-white/60 hover:text-hack-yellow border border-white/20 hover:border-hack-yellow rounded px-2 py-1"
              aria-label="Clear chat history"
              title="Clear history (DPDP right to erasure)"
            >
              Clear
            </button>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-hack-white">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={
                  m.role === "user"
                    ? "max-w-[85%] px-3 py-2 rounded-2xl rounded-br-sm bg-hack-yellow text-hack-black border border-hack-black text-sm"
                    : "max-w-[90%] space-y-2"
                }>
                  <div className={
                    m.role === "user"
                      ? ""
                      : "px-3 py-2 rounded-2xl rounded-bl-sm bg-white border border-hack-black/15 text-sm text-hack-black whitespace-pre-wrap"
                  }>
                    {m.text}
                  </div>
                  {m.role === "bot" && (m.suggestions?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.suggestions!.map((s) => (
                        <button
                          key={s.href + s.label}
                          onClick={() => handleSuggestion(s.href)}
                          className="text-xs font-medium px-2.5 py-1 rounded-full border border-hack-black/30 bg-white hover:bg-hack-yellow transition-colors flex items-center gap-1"
                        >
                          <Tag className="w-3 h-3" />{s.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.role === "bot" && (m.products?.length ?? 0) > 0 && (
                    <div className="grid grid-cols-1 gap-1.5">
                      {m.products!.slice(0, 3).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleSuggestion(p.href)}
                          className="flex items-center gap-2 p-2 rounded-xl border border-hack-black/15 bg-white hover:border-hack-yellow text-left"
                        >
                          {p.image && <img src={p.image} alt="" loading="lazy" className="w-10 h-10 rounded-lg object-cover" />}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate">{p.name}</div>
                            <div className="text-[11px] text-hack-black/60">{p.price}</div>
                          </div>
                          <ShoppingBag className="w-4 h-4 text-hack-black/50" />
                        </button>
                      ))}
                    </div>
                  )}
                  {m.role === "bot" && (m.upsell?.length ?? 0) > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-mono text-hack-magenta mb-1">
                        People also love
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                        {m.upsell!.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleSuggestion(p.href)}
                            className="flex-shrink-0 w-32 p-2 rounded-xl border border-hack-black/10 bg-white hover:border-hack-yellow text-left"
                          >
                            {p.image && <img src={p.image} alt="" loading="lazy" className="w-full h-16 rounded-lg object-cover mb-1" />}
                            <div className="text-[11px] font-bold truncate">{p.name}</div>
                            <div className="text-[10px] text-hack-black/60 truncate">{p.price}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl rounded-bl-sm bg-white border border-hack-black/15 text-sm text-hack-black/60">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-hack-black/40 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-hack-black/40 animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-hack-black/40 animate-bounce" style={{ animationDelay: "240ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Coupon panel */}
          {showCoupon && (
            <div className="px-3 py-3 bg-hack-yellow/10 border-t border-hack-black/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                  className="flex-1 h-9 px-3 rounded-lg border border-hack-black/20 text-sm font-mono uppercase tracking-wider focus:outline-none focus:border-hack-black"
                  autoComplete="off"
                  disabled={couponBusy}
                />
                <button
                  type="button"
                  onClick={validateCoupon}
                  disabled={couponBusy || !couponInput.trim()}
                  className="h-9 px-3 rounded-lg bg-hack-black text-hack-yellow text-xs font-bold disabled:opacity-50 hover:bg-hack-magenta transition-colors"
                >
                  {couponBusy ? "Checking…" : "Apply"}
                </button>
              </div>
              {couponResult && (
                <div className={
                  "mt-2 text-xs flex items-start gap-1.5 " +
                  (couponResult.valid ? "text-emerald-700" : "text-red-700")
                }>
                  {couponResult.valid
                    ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    : <AlertCircle  className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                  <span>
                    {couponResult.valid
                      ? <><strong>{couponResult.code}</strong> · {couponResult.human}{couponResult.description ? ` — ${couponResult.description}` : ""}</>
                      : couponResult.reason}
                  </span>
                </div>
              )}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 px-3 py-3 bg-white border-t border-hack-black/10"
          >
            <button
              type="button"
              onClick={() => { setShowCoupon((v) => !v); setCouponResult(null); }}
              className={
                "h-10 w-10 rounded-xl border flex items-center justify-center transition-colors " +
                (showCoupon
                  ? "bg-hack-yellow text-hack-black border-hack-black"
                  : "bg-white text-hack-black/70 border-hack-black/20 hover:border-hack-black")
              }
              aria-label={showCoupon ? "Hide promo code" : "Apply promo code"}
              title="Apply promo code"
            >
              <Ticket className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hindi, English, French, German…"
              className="flex-1 h-10 px-3 rounded-xl border border-hack-black/20 text-sm focus:outline-none focus:border-hack-black"
              autoComplete="off"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="h-10 w-10 rounded-xl bg-hack-black text-hack-yellow border border-hack-black disabled:opacity-50 flex items-center justify-center hover:bg-hack-magenta transition-colors"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
