import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Send, X, Sparkles, ShoppingBag, Tag } from "lucide-react";
import { WP_REST_BASE } from "@/lib/api-base";
import { getAuthToken } from "@/lib/auth";

type ChatMsg = {
  role: "user" | "bot";
  text: string;
  suggestions?: { label: string; href: string }[];
  products?: { id: number; name: string; price: string; href: string; image?: string }[];
};

const STORAGE_KEY = "hackknow-chat-history";
const OPEN_KEY    = "hackknow-chat-open";

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

export default function YahaviChat() {
  const [open, setOpen] = useState<boolean>(() => {
    try { return sessionStorage.getItem(OPEN_KEY) === "1"; } catch { return false; }
  });
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as ChatMsg[];
    } catch { /* noop */ }
    return [seed];
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch { /* noop */ }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    try { sessionStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch { /* noop */ }
  }, [open]);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || sending) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setSending(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = getAuthToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const historyForApi = messages.slice(-8).map((m) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.text,
      }));
      const res = await fetch(`${WP_REST_BASE}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: q, history: historyForApi }),
      });
      const data = await res.json().catch(() => ({})) as Partial<ChatMsg> & { reply?: string };
      const botMsg: ChatMsg = {
        role: "bot",
        text: data.reply || data.text || "I'm here, but I couldn't form a reply. Try asking another way?",
        suggestions: data.suggestions || [],
        products: data.products || [],
      };
      setMessages((m) => [...m, botMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "Connection hiccup — please try again in a moment.", suggestions: [] },
      ]);
    } finally {
      setSending(false);
    }
  }, [messages, sending]);

  const handleSuggestion = (href: string) => {
    setOpen(false);
    navigate(href);
  };

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
          className="fixed bottom-36 lg:bottom-24 right-3 lg:right-5 z-[60] w-[min(380px,calc(100vw-1.5rem))] max-h-[68vh] lg:max-h-[70vh] flex flex-col rounded-2xl bg-white border-2 border-hack-black shadow-[6px_6px_0_0_#0A0A0A] overflow-hidden"
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
              onClick={() => {
                if (confirm("Clear chat history? This deletes the conversation stored on this device.")) {
                  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
                  setMessages([seed]);
                }
              }}
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
