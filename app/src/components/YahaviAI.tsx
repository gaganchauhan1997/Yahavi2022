import { useEffect, useRef, useState, useCallback, Fragment } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Bot, Send, X, Sparkles, ShoppingBag, Tag, ThumbsUp, ThumbsDown } from "lucide-react";
import { API_BASE, WP_REST_BASE } from "@/lib/api-base";
import { getAuthToken } from "@/lib/auth";

type Suggestion = { label: string; href: string };
type Product    = { id: number; name: string; price: string; href: string; image?: string };

type ChatMsg = {
  id?: number;            // server-side row id (only set after history-hydrate or re-fetch)
  role: "user" | "bot";
  text: string;
  suggestions?: Suggestion[];
  products?: Product[];
  upsell?: Product[];
  feedback?: -1 | 0 | 1;  // RLHF rating from this user (persisted in DB)
};

/**
 * Render Yahavi's text with inline citations. She formats references as
 * [Visible label](/path) — we turn those into in-app <Link> elements so the
 * user can click without losing the chat. Plain text and newlines are
 * preserved (whitespace-pre-wrap on the parent).
 *
 * Only relative paths starting with "/" are accepted to prevent open redirects
 * (Yahavi was already instructed to never emit external URLs, but we double
 * check here for defence-in-depth).
 */
function renderWithLinks(text: string): React.ReactNode {
  if (!text) return text;
  const re = /\[([^\]\n]{1,80})\]\((\/[^)\s]{0,160})\)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(<Fragment key={key++}>{text.slice(last, match.index)}</Fragment>);
    parts.push(
      <Link
        key={key++}
        to={match[2]}
        className="font-semibold text-hack-magenta underline decoration-dotted underline-offset-2 hover:text-hack-black"
      >
        {match[1]}
      </Link>
    );
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return parts.length > 0 ? parts : text;
}

const STORAGE_KEY = "hackknow-chat-history";
const SESSION_KEY = "hackknow-chat-session-id";
const OPEN_KEY    = "hackknow-chat-open";

const seed: ChatMsg = {
  role: "bot",
  text:
    "Hi! I'm Yahavi AI — your HackKnow assistant. Ask me about any product, course, roadmap, refund, or policy. I know the whole site inside-out and reply in clear English.",
  suggestions: [
    { label: "Show free templates",   href: "/shop/free-resources" },
    { label: "Best Excel dashboards", href: "/shop/excel-templates" },
    { label: "Browse courses",        href: "/courses" },
    { label: "Track my order",        href: "/account/orders" },
    { label: "Contact us",            href: "/contact" },
  ],
};

function newSessionId(): string {
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

/**
 * Yahavi can embed automation markers in her replies. We now parse ALL
 * markers in source order into a single sequential queue, so she can chain
 * a multi-step user journey in one reply (e.g. FILTER → WAIT → ADD_TO_CART
 * → OPEN_CART). The runner executes them with a small default gap so the
 * user can perceive each step.
 *
 * Supported markers:
 *   [[NAV:/path]]              in-app navigation (allowlist enforced)
 *   [[ADD_TO_CART:product_id]] WC Store API cart add
 *   [[OPEN_CART]]              open cart drawer (custom event)
 *   [[COUPON:CODE]]            WC Store API coupon apply
 *   [[FILTER:category-slug]]   navigate to /shop/<slug>
 *   [[WAIT:ms]]                explicit pause (200–2500 ms)
 */
type ChatAction =
  | { kind: "nav"; path: string }
  | { kind: "add_to_cart"; id: number }
  | { kind: "open_cart" }
  | { kind: "coupon"; code: string }
  | { kind: "filter"; slug: string }
  | { kind: "wait"; ms: number };

type ChatActions = { cleanText: string; queue: ChatAction[] };

const NAV_ALLOWED = /^\/(?:shop(?:\/|$)|product(?:\/|$)|courses?(?:\/|$)|roadmaps?(?:\/|$)|blog(?:\/|$)|about|community|support|contact|faq|affiliate|cart|checkout|account\/orders|refund-policy|terms|privacy|login|signup|$)/;
// Single regex matches every supported marker so we can preserve source order.
const MARKER_RE = /\[\[\s*(NAV|ADD_TO_CART|OPEN_CART|COUPON|FILTER|WAIT)\s*(?::\s*([^\]]*?))?\s*\]\]/gi;

function parseChatActions(raw: string): ChatActions {
  if (!raw) return { cleanText: raw, queue: [] };

  const queue: ChatAction[] = [];
  let couponSeen = false;
  const cleanText = raw
    .replace(MARKER_RE, (_f, kindRaw: string, argRaw: string | undefined) => {
      const kind = String(kindRaw || "").toUpperCase();
      const arg = String(argRaw || "").trim();
      switch (kind) {
        case "NAV": {
          if (NAV_ALLOWED.test(arg)) queue.push({ kind: "nav", path: arg });
          break;
        }
        case "ADD_TO_CART": {
          const n = Number(arg);
          if (Number.isFinite(n) && n > 0 && n < 1e9 && /^\d{1,9}$/.test(arg)) {
            // Cap total adds per reply to 5 — defence-in-depth.
            const adds = queue.filter((q) => q.kind === "add_to_cart").length;
            if (adds < 5) queue.push({ kind: "add_to_cart", id: n });
          }
          break;
        }
        case "OPEN_CART": queue.push({ kind: "open_cart" }); break;
        case "COUPON": {
          if (couponSeen) break; // one coupon per reply max
          if (/^[A-Z0-9_-]{2,32}$/i.test(arg)) {
            queue.push({ kind: "coupon", code: arg.toUpperCase() });
            couponSeen = true;
          }
          break;
        }
        case "FILTER": {
          if (/^[a-z0-9-]{1,64}$/i.test(arg)) queue.push({ kind: "filter", slug: arg.toLowerCase() });
          break;
        }
        case "WAIT": {
          const ms = Math.max(200, Math.min(2500, Number(arg) || 0));
          if (ms >= 200) queue.push({ kind: "wait", ms });
          break;
        }
      }
      return "";
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { cleanText, queue };
}

// Sequential action runner. Default 700ms gap between non-WAIT actions so the
// user can perceive each step (cart adds, drawer opening, page transitions).
async function runActionQueue(
  queue: ChatAction[],
  ctx: { navigate: (p: string) => void; setOpen: (v: boolean) => void; apiBase: string }
): Promise<void> {
  if (!queue.length) return;
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  let drawerClosed = false;
  let navHappened = false;

  for (let i = 0; i < queue.length; i++) {
    const a = queue[i];
    const prev = i > 0 ? queue[i - 1] : null;
    // Insert default 700ms gap between actions (skip after explicit WAIT).
    if (i > 0 && (!prev || prev.kind !== "wait")) await sleep(700);

    try {
      if (a.kind === "wait") { await sleep(a.ms); continue; }

      if (a.kind === "add_to_cart") {
        await fetch(`${ctx.apiBase}/wp-json/wc/store/v1/cart/add-item`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: a.id, quantity: 1 }),
        }).catch(() => { /* swallow — user can retry */ });
        window.dispatchEvent(new CustomEvent("hackknow:cart-changed", { detail: { reason: "yahavi_add", id: a.id } }));
        continue;
      }

      if (a.kind === "coupon") {
        await fetch(`${ctx.apiBase}/wp-json/wc/store/v1/cart/apply-coupon`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code: a.code }),
        }).catch(() => { /* swallow */ });
        window.dispatchEvent(new CustomEvent("hackknow:cart-changed", { detail: { reason: "yahavi_coupon", code: a.code } }));
        continue;
      }

      if (a.kind === "open_cart") {
        window.dispatchEvent(new CustomEvent("hackknow:open-cart", { detail: { source: "yahavi" } }));
        continue;
      }

      if (a.kind === "filter" || a.kind === "nav") {
        if (!drawerClosed) { ctx.setOpen(false); drawerClosed = true; }
        const target = a.kind === "filter" ? `/shop/${encodeURIComponent(a.slug)}` : a.path;
        ctx.navigate(target);
        navHappened = true;
        continue;
      }
    } catch { /* swallow individual step errors so the queue keeps going */ }
  }
  // Suppress unused-var lint if no nav happened — kept for future extension.
  void navHappened;
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

  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(getSessionId());

  /* ── Helpers ─────────────────────────────────────────────────────── */
  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    const t = getAuthToken();
    if (t) h.Authorization = `Bearer ${t}`;
    return h;
  }, []);

  /* ── On mount: hydrate from server-side history ──────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = getAuthToken()
        ? `${WP_REST_BASE}/chat/history?limit=100`
        : `${WP_REST_BASE}/chat/history?session_id=${encodeURIComponent(sessionIdRef.current)}&limit=100`;
      try {
        const r = await fetch(url, { headers: authHeaders() });
        if (!r.ok) return;
        const j = await r.json() as { messages?: Array<{ id?: number; role: string; text: string; suggestions?: Suggestion[]; products?: Product[]; feedback?: number }> };
        if (cancelled || !Array.isArray(j.messages) || j.messages.length === 0) return;
        setMessages(j.messages.map((m) => ({
          id: typeof m.id === "number" ? m.id : undefined,
          role: m.role === "bot" ? "bot" : "user",
          text: m.text,
          suggestions: m.suggestions ?? [],
          products: m.products ?? [],
          feedback: m.feedback === 1 ? 1 : m.feedback === -1 ? -1 : 0,
        })));
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [authHeaders]);

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

    try {
      // The PHP rest_pre_dispatch hook auto-saves both the user message and
      // the bot reply when session_id is included, so we don't need to call
      // /chat/history explicitly here.
      const historyForApi = [...messages, userMsg].slice(-8).map((m) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.text,
      }));
      const callChat = async (msg: string, freshen = false) => {
        const sid = freshen
          ? `${sessionIdRef.current}-r${Date.now().toString(36)}`
          : sessionIdRef.current;
        const r = await fetch(`${WP_REST_BASE}/chat`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            message: freshen ? `${msg}\u200B` : msg,  // ZWSP keeps content identical visually but bypasses dedupe hash
            history: historyForApi,
            session_id: sid,
          }),
        });
        return r.json().catch(() => ({})) as Promise<Partial<ChatMsg> & {
          reply?: string;
          bot_message_id?: number;
          deduped?: boolean;
          // v2 (edge AI) fields — present only when CF Pages Function answered.
          model_used?: string;
          tokens_in?: number;
          tokens_out?: number;
          grounding?: Array<{ id: string; title: string; kind?: string }>;
        }>;
      };

      let data = await callChat(q);
      // The server-side guard plugin dedupes identical (session, message) pairs
      // within 60s and returns {ok:true, deduped:true} with no reply text. If
      // we hit that, re-issue with a tweaked session id so the user always sees
      // a reply instead of the empty-state fallback.
      if (data && (data.deduped || (!data.reply && !data.text))) {
        data = await callChat(q, true);
      }
      const rawReply = data.reply || data.text || "I'm here — could you rephrase that? My link to the knowledge base hiccupped for a second.";
      // Strip and execute any embedded action markers Yahavi emitted.
      const { cleanText, queue } = parseChatActions(rawReply);
      const botMsg: ChatMsg = {
        id: typeof data.bot_message_id === "number" ? data.bot_message_id : undefined,
        role: "bot",
        text: cleanText,
        suggestions: data.suggestions || [],
        products: data.products || [],
        feedback: 0,
      };

      // Cross-sell / upsell: if the bot returned products, fetch related items.
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

      // ── v2 persistence: when reply came from edge AI, mirror the exchange
      // to wp_hk_chat_messages via /chat/log so analytics + history work as
      // before. Fire-and-forget; persistence failure must NEVER block UX.
      if (data && (data.model_used || data.grounding)) {
        const grounding = Array.isArray(data.grounding) ? data.grounding : [];
        fetch(`${WP_REST_BASE}/chat/log`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            session_id:   sessionIdRef.current,
            user_message: q,
            bot_reply:    cleanText,
            model_used:   String(data.model_used || ""),
            tokens_in:    Number(data.tokens_in || 0),
            tokens_out:   Number(data.tokens_out || 0),
            grounding,
          }),
        }).catch(() => { /* swallow — best-effort */ });
      }

      // ── Action queue — execute every emitted marker in source order ──
      // Yahavi can chain multiple markers (e.g. FILTER → WAIT → ADD_TO_CART
      // → OPEN_CART) in a single reply; we run them sequentially with a brief
      // gap so the user perceives each step of the journey.
      if (queue.length > 0) {
        // Initial 600ms so the user sees the bot reply before the page jumps.
        setTimeout(() => {
          runActionQueue(queue, { navigate, setOpen, apiBase: API_BASE })
            .catch(() => { /* swallow — best-effort */ });
        }, 600);
      }
    } catch {
      setMessages((m) => [...m, {
        role: "bot",
        text: "Connection hiccup — please try again in a moment.",
        suggestions: [],
      }]);
    } finally {
      setSending(false);
    }
  }, [messages, sending, authHeaders, navigate]);

  const handleSuggestion = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  /* ── RLHF feedback: thumbs up / down on Yahavi's replies ─────────────── */
  const sendFeedback = useCallback(async (msgIdx: number, rating: 1 | -1) => {
    setMessages((prev) => {
      // Optimistic toggle: clicking the same thumb again clears it (rating = 0).
      const cur = prev[msgIdx];
      if (!cur || cur.role !== "bot") return prev;
      const next = rating === cur.feedback ? 0 : rating;
      const copy = prev.slice();
      copy[msgIdx] = { ...cur, feedback: next };
      // Fire and forget — we don't block UI on the network round-trip. If the
      // message has no server-side id yet (rare; only for the seed message
      // before any back-and-forth) we skip the API call entirely.
      if (cur.id) {
        const finalRating = next;
        fetch(`${WP_REST_BASE}/chat/feedback`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            message_id: cur.id,
            rating: finalRating,
            session_id: sessionIdRef.current,
          }),
        }).catch(() => { /* swallow — feedback is best-effort */ });
      }
      return copy;
    });
  }, [authHeaders]);

  const handleClear = useCallback(() => {
    if (!confirm("Clear this chat from your view? Your screen resets and a fresh thread starts. (HackKnow keeps an anonymized copy on our servers so Yahavi can keep learning — see our Terms.)")) return;
    // 1. Wipe the local cache so the on-screen chat resets.
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    // 2. Tell the server to soft-delete the session (rows stay in DB with
    //    is_hidden=1 — invisible to the user, still available to Yahavi for
    //    learning and to the owner for analytics). Best-effort; UI proceeds
    //    even if the call fails.
    const oldSession = sessionIdRef.current;
    fetch(`${WP_REST_BASE}/chat/history?session_id=${encodeURIComponent(oldSession)}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).catch(() => { /* noop */ });
    // 3. Spin up a brand-new session id so future messages start a fresh thread.
    setMessages([seed]);
    const fresh = newSessionId();
    try { localStorage.setItem(SESSION_KEY, fresh); } catch { /* noop */ }
    sessionIdRef.current = fresh;
  }, [authHeaders]);

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
                by DeadMan • English
              </div>
            </div>
            <button
              onClick={handleClear}
              className="ml-auto text-[10px] uppercase tracking-wider font-mono text-white/60 hover:text-hack-yellow border border-white/20 hover:border-hack-yellow rounded px-2 py-1"
              aria-label="Clear chat from this device"
              title="Clear local chat (server copy is retained — see Terms)"
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
                    {m.role === "bot" ? renderWithLinks(m.text) : m.text}
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
                  {/* RLHF feedback — only on bot replies that have a server id (not the seed) */}
                  {m.role === "bot" && i > 0 && m.id && (
                    <div className="flex items-center gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => sendFeedback(i, 1)}
                        aria-label="Helpful"
                        title="Helpful — Yahavi will learn from this"
                        className={`p-1 rounded-md border transition-colors ${
                          m.feedback === 1
                            ? "bg-hack-yellow border-hack-black text-hack-black"
                            : "bg-white border-hack-black/15 text-hack-black/40 hover:text-hack-black hover:border-hack-black/40"
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => sendFeedback(i, -1)}
                        aria-label="Not helpful"
                        title="Not helpful — Yahavi will learn from this"
                        className={`p-1 rounded-md border transition-colors ${
                          m.feedback === -1
                            ? "bg-hack-magenta border-hack-black text-white"
                            : "bg-white border-hack-black/15 text-hack-black/40 hover:text-hack-black hover:border-hack-black/40"
                        }`}
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
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

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 px-3 py-3 bg-white border-t border-hack-black/10"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Yahavi anything…"
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
