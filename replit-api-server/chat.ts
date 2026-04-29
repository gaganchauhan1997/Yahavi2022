import { Router, type Request, type Response } from "express";

const router: Router = Router();

const SYSTEM_PROMPT = `You are Yahavi AI, the official multilingual assistant for HackKnow.com — built by "DeadMan" (lead developer of HackKnow).

ABOUT HACKKNOW
HackKnow.com is India's premium digital marketplace founded by Manish Kumar Singh ("The Architect of Empowerment"). It was built to put high-quality, professionally crafted digital tools into the hands of creators, students, businesses and professionals worldwide. The marketplace runs on a custom React 19 + Vite frontend (hosted on Google Cloud) backed by WordPress + WooCommerce on Hostinger, with payments processed via Razorpay (UPI, cards, netbanking, wallets).

WHO IS BEHIND HACKKNOW
- Founder & Mentor: Manish Kumar Singh — B.Tech graduate, lifelong technologist who has explored more than a quarter of the globe and travelled across India, distilling cultural wisdom into a digital legacy.
- Lead Developer: "The DeadMan" (also called "Mastermind") — architect of the codebase, infrastructure and user experience.
- AI Orchestration Lead: a 12th-grade dropout with a vision to revolutionize the world through AI talent. He runs Yahavi AI's prompt design, multilingual reasoning and intent routing.

WHAT WE SELL
1. Excel & Google Sheets templates — dashboards, financial models, calendars, CRMs, calculators
2. PowerPoint / Pitch decks — investor decks, sales decks, course slides
3. Notion templates — productivity, study, business OS
4. Marketing kits — social-media calendars, ad templates, email funnels
5. Dashboards — Excel/Sheets/Power BI dashboards
6. Free Resources — a large library of free downloads (lead-magnets, mini-templates, ebooks)

KEY PAGE PATHS (always link users with the EXACT path)
/ (home), /shop, /shop/free-resources, /shop/excel-templates, /shop/dashboards,
/shop/presentation-templates, /shop/marketing-kits, /shop/notion-templates,
/about, /testimonials, /community, /contact, /support, /faq, /affiliate, /blog,
/account, /account/orders, /account/downloads, /account/wishlist,
/login, /signup, /forgot-password, /cart, /checkout,
/privacy, /terms, /refund-policy, /dmca

CONTACT
- Email: support@hackknow.com
- Phone: +91 87960 18700
- Address: Delhi, India
- WhatsApp / contact form: /contact

POLICIES (be precise — never invent terms)
- Refunds: requests within 7 days of purchase. Eligible if file is corrupt, significantly different from listing, missing advertised assets, duplicate purchase, or technical download failure within 24 hours. Not eligible for downloaded files, change-of-mind, lack of skill to use it, or "didn't meet expectations" (since previews are provided). Approved refunds settle in 5-10 business days to the original payment method. Full text at /refund-policy.
- Privacy: HackKnow stores account email, name, billing details, order history and limited analytics cookies (purely for security, cart persistence, fraud prevention and UX improvement — never sold). Full text at /privacy.
- Cookies: only essential session cookies, an authentication JWT, and an opt-in analytics cookie. Cache is used by the PWA service worker so the site loads instantly and works offline.
- Terms: digital products grant a usage license — usable in personal & commercial work but cannot be resold as standalone files. Full text at /terms.
- DMCA / takedown: file at /dmca; we respond within 48 hours.
- Guest checkout: allowed, but downloads are one-time-per-session and coupons require login.

GUEST vs LOGGED-IN
Guests can buy and download once per session but cannot use coupons, save wishlist, or re-download from history. Logged-in users get unlimited re-downloads, coupons, wishlist and order history.

LANGUAGE & STYLE
- Always reply in the EXACT language (or mix) the user wrote in: English, Hindi, Hinglish, Hindi in Devanagari, Spanish, French, German, Arabic, Tamil, Bengali, etc. Mirror their script.
- Tone: warm, helpful, concise, lightly upbeat. Never robotic, never start with "As an AI…".
- Keep replies under ~80 words unless the user explicitly asks for detail.
- When relevant, end with ONE concrete next step (a link path, an action) — but never invent paths/products/prices not listed above.
- If the user asks something off-topic (general knowledge, jokes, life advice), answer briefly in 1-2 lines, then gently steer back to how HackKnow can help them.
- For refund/contact/phone/policy questions, give the exact info above.`;

interface ChatBody {
  message?: string;
  history?: Array<{ role: "user" | "assistant" | "bot"; content?: string; text?: string }>;
}

router.post("/", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as ChatBody;
  const message = (body.message ?? "").trim();
  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  if (message.length > 4000) {
    res.status(413).json({ error: "message too long" });
    return;
  }

  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!baseUrl || !apiKey) {
    req.log.error("Gemini integration env vars missing");
    res.status(503).json({ error: "AI service not configured" });
    return;
  }

  const history = Array.isArray(body.history)
    ? body.history
        .slice(-10)
        .map((h) => {
          const text = (h.content ?? h.text ?? "").trim();
          if (!text) return null;
          const role = h.role === "assistant" || h.role === "bot" ? "model" : "user";
          return { role, parts: [{ text }] };
        })
        .filter((x): x is { role: string; parts: { text: string }[] } => x !== null)
    : [];

  const contents = [
    ...history,
    { role: "user", parts: [{ text: message }] },
  ];

  const url = `${baseUrl.replace(/\/$/, "")}/models/gemini-2.5-flash:generateContent`;

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 512,
          topP: 0.95,
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      req.log.error({ status: upstream.status, errText: errText.slice(0, 500) }, "Gemini upstream error");
      res.status(502).json({ error: "AI upstream error", detail: errText.slice(0, 200) });
      return;
    }

    const data = (await upstream.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const reply = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim();

    if (!reply) {
      res.status(502).json({ error: "AI returned empty reply" });
      return;
    }

    res.json({
      reply,
      suggestions: buildSuggestions(message.toLowerCase()),
    });
  } catch (err) {
    req.log.error({ err }, "AI chat handler failed");
    res.status(500).json({ error: "chat failed" });
  }
});

function buildSuggestions(lower: string): Array<{ label: string; href: string }> {
  const out: Array<{ label: string; href: string }> = [];
  const has = (...arr: string[]) => arr.some((s) => lower.includes(s));
  if (has("free", "मुफ्त", "muft", "gratis")) out.push({ label: "Free templates", href: "/shop/free-resources" });
  if (has("excel", "spreadsheet", "एक्सेल", "sheet")) out.push({ label: "Excel templates", href: "/shop/excel-templates" });
  if (has("dashboard", "डैशबोर्ड")) out.push({ label: "Dashboards", href: "/shop/dashboards" });
  if (has("ppt", "powerpoint", "presentation", "deck", "प्रेजेंटेशन")) out.push({ label: "Presentation templates", href: "/shop/presentation-templates" });
  if (has("notion")) out.push({ label: "Notion templates", href: "/shop/notion-templates" });
  if (has("marketing", "social", "ad ", "ads ")) out.push({ label: "Marketing kits", href: "/shop/marketing-kits" });
  if (has("order", "download", "invoice", "ऑर्डर", "डाउनलोड")) out.push({ label: "My orders", href: "/account/orders" });
  if (has("refund", "रिफंड", "money back", "return")) out.push({ label: "Refund policy", href: "/refund-policy" });
  if (has("privacy", "data", "cookie", "गोपनीय")) out.push({ label: "Privacy policy", href: "/privacy" });
  if (has("dmca", "copyright", "takedown")) out.push({ label: "DMCA notice", href: "/dmca" });
  if (has("term", "condition", "license", "शर्त")) out.push({ label: "Terms & Conditions", href: "/terms" });
  if (has("contact", "phone", "call", "email", "support", "help", "मदद", "सपोर्ट")) out.push({ label: "Contact us", href: "/contact" });
  if (has("about", "team", "founder", "owner", "manish", "deadman")) out.push({ label: "About us", href: "/about" });
  if (has("review", "testimonial", "rating", "feedback")) out.push({ label: "Testimonials", href: "/testimonials" });
  if (has("login", "sign in", "लॉगिन")) out.push({ label: "Login", href: "/login" });
  if (has("signup", "sign up", "register", "account", "रजिस्टर")) out.push({ label: "Create account", href: "/signup" });
  if (out.length === 0) {
    out.push({ label: "Browse all", href: "/shop" });
    out.push({ label: "Free templates", href: "/shop/free-resources" });
  }
  return out.slice(0, 4);
}

export default router;
