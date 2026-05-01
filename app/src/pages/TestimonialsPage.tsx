import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Star, ExternalLink, Quote } from "lucide-react";

type Review = {
  id: number;
  name: string;
  city: string;
  rating: number;
  text: string;
  product: string;
  source: string;
  href: string;
  initials: string;
  color: string;
};

const REVIEWS: Review[] = [
  {
    id: 1,
    name: "Aditya Sharma",
    city: "Bengaluru, IN",
    rating: 5,
    text:
      "Bought the Founder's Dashboard for our seed-stage SaaS and our weekly review takes 20 minutes instead of 2 hours. Worth every rupee.",
    product: "Founder's Dashboard – Excel",
    source: "Trustpilot",
    href: "https://www.trustpilot.com/review/hackknow.com",
    initials: "AS",
    color: "from-hack-yellow to-hack-orange",
  },
  {
    id: 2,
    name: "Priya Verma",
    city: "Delhi, IN",
    rating: 5,
    text:
      "Yahavi AI recommended my entire PowerPoint deck in 5 minutes. First time I've ever seen a store chat assistant that actually works!",
    product: "Investor Pitch Deck Bundle",
    source: "Google Reviews",
    href: "https://www.google.com/search?q=hackknow+reviews",
    initials: "PV",
    color: "from-hack-magenta to-hack-orange",
  },
  {
    id: 3,
    name: "Rahul Kapoor",
    city: "Mumbai, IN",
    rating: 5,
    text:
      "Notion Second-Brain template literally rebuilt my study workflow. CA prep is half the stress now.",
    product: "Notion Second Brain OS",
    source: "Product Hunt",
    href: "https://www.producthunt.com/@hackknow",
    initials: "RK",
    color: "from-green-400 to-hack-yellow",
  },
  {
    id: 4,
    name: "Sneha R.",
    city: "Chennai, IN",
    rating: 5,
    text:
      "Free Excel inventory tracker is better than tools I've paid ₹5K/month for. Bought 3 paid templates after that.",
    product: "Free Inventory Tracker",
    source: "G2",
    href: "https://www.g2.com/search?query=hackknow",
    initials: "SR",
    color: "from-hack-orange to-hack-magenta",
  },
  {
    id: 5,
    name: "Marcus Hoffmann",
    city: "Berlin, DE",
    rating: 5,
    text:
      "Found HackKnow on a search for marketing-funnel templates. Clean files, clean licensing, fast download. Will be back.",
    product: "Marketing Funnel Kit",
    source: "Trustpilot",
    href: "https://www.trustpilot.com/review/hackknow.com",
    initials: "MH",
    color: "from-hack-black to-hack-magenta",
  },
  {
    id: 6,
    name: "Léa Dubois",
    city: "Lyon, FR",
    rating: 5,
    text:
      "Le support a répondu en moins d'une heure et m'a aidée à personnaliser mon dashboard. Service top.",
    product: "KPI Dashboard – Sheets",
    source: "Trustpilot",
    href: "https://www.trustpilot.com/review/hackknow.com",
    initials: "LD",
    color: "from-hack-yellow to-green-400",
  },
  {
    id: 7,
    name: "Karan Mehta",
    city: "Pune, IN",
    rating: 5,
    text:
      "Razorpay UPI checkout was smoother than every Indian D2C store I've used. Download was instant. 10/10.",
    product: "Sales Tracker Pro",
    source: "Google Reviews",
    href: "https://www.google.com/search?q=hackknow+reviews",
    initials: "KM",
    color: "from-hack-magenta to-hack-yellow",
  },
  {
    id: 8,
    name: "Ananya Iyer",
    city: "Hyderabad, IN",
    rating: 5,
    text:
      "Bought the social-media kit for my agency — saved my team 2 full days of design work in the first week.",
    product: "Social Media Kit",
    source: "G2",
    href: "https://www.g2.com/search?query=hackknow",
    initials: "AI",
    color: "from-hack-orange to-hack-yellow",
  },
  {
    id: 9,
    name: "Sahil Khan",
    city: "Lucknow, IN",
    rating: 5,
    text:
      "Manish sir ki team genuinely helpful hai. Asked them a question on WhatsApp at 11pm, got reply in 10 minutes. Mad respect.",
    product: "Reseller Bundle",
    source: "WhatsApp Review",
    href: "https://wa.me/918796018700",
    initials: "SK",
    color: "from-green-400 to-hack-orange",
  },
  {
    id: 10,
    name: "Jessica Martinez",
    city: "Madrid, ES",
    rating: 5,
    text:
      "Honestly the cleanest digital marketplace I've used outside the US/EU. Yahavi AI replied to me in Spanish — that won me over.",
    product: "Project Manager Notion",
    source: "Trustpilot",
    href: "https://www.trustpilot.com/review/hackknow.com",
    initials: "JM",
    color: "from-hack-yellow to-hack-magenta",
  },
];

// Build 3 visual columns with random per-column animation duration & direction.
// Click any card → opens that review's source link in a new tab.
function useColumns(reviews: Review[]) {
  return [0, 1, 2].map((col) => {
    const items = reviews.filter((_, idx) => idx % 3 === col);
    // double the list for a seamless infinite scroll
    return {
      key: col,
      items: [...items, ...items],
      // pseudo-random but deterministic per column
      duration: 35 + col * 12, // 35s, 47s, 59s
      reverse: col % 2 === 1,
    };
  });
}

export default function TestimonialsPage() {
  const columns = useColumns(REVIEWS);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(m.matches);
    const fn = () => setReduceMotion(m.matches);
    m.addEventListener?.("change", fn);
    return () => m.removeEventListener?.("change", fn);
  }, []);

  return (
    <div className="min-h-screen bg-hack-white">
      {/* keyframes for scrolling marquee */}
      <style>{`
        @keyframes hk-scroll-up   { 0% { transform: translateY(0); }    100% { transform: translateY(-50%); } }
        @keyframes hk-scroll-down { 0% { transform: translateY(-50%); } 100% { transform: translateY(0); } }
        .hk-col { animation-timing-function: linear; animation-iteration-count: infinite; }
        .hk-col.paused, .hk-col.reduce { animation-play-state: paused !important; }
      `}</style>

      {/* Hero */}
      <div className="bg-hack-black text-hack-white py-16 lg:py-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-hack-yellow/20 flex items-center justify-center">
                <Quote className="w-6 h-6 text-hack-yellow" />
              </div>
              <h1 className="font-display font-bold text-4xl lg:text-5xl">Testimonials</h1>
            </div>
            <p className="text-hack-white/70 text-lg max-w-2xl">
              963+ creators across 120+ countries trust HackKnow. Tap any card to read the
              original review on Trustpilot, Google, G2 or Product Hunt.
            </p>
          </div>
        </div>
      </div>

      {/* Marquee columns (or static grid when reduced-motion is preferred) */}
      <div
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16"
        onMouseEnter={() => !reduceMotion && setPaused(true)}
        onMouseLeave={() => !reduceMotion && setPaused(false)}
      >
        {reduceMotion ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {REVIEWS.map((r) => (
              <a
                key={r.id}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-white rounded-2xl border border-hack-black/10 p-5 hover:border-hack-yellow hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${r.color} flex items-center justify-center text-white font-display font-bold`}>
                    {r.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-hack-black truncate">{r.name}</div>
                    <div className="text-xs text-hack-gray font-mono">{r.city}</div>
                  </div>
                  <div className="flex">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-hack-yellow fill-hack-yellow" />
                    ))}
                  </div>
                </div>
                <p className="text-hack-gray text-sm leading-relaxed mb-3">&ldquo;{r.text}&rdquo;</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono uppercase tracking-wider text-hack-pink">{r.product}</span>
                  <span className="font-mono uppercase tracking-wider text-hack-gray flex items-center gap-1">
                    {r.source} <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[680px] overflow-hidden relative">
          {/* fade masks */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-hack-white to-transparent z-10" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-hack-white to-transparent z-10" />

          {columns.map((col) => (
            <div key={col.key} className="overflow-hidden">
              <div
                className={`hk-col flex flex-col gap-5 ${paused ? "paused" : ""} ${reduceMotion ? "reduce" : ""}`}
                style={{
                  animationName: col.reverse ? "hk-scroll-down" : "hk-scroll-up",
                  animationDuration: `${col.duration}s`,
                }}
              >
                {col.items.map((r, i) => (
                  <a
                    key={`${r.id}-${i}`}
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white rounded-2xl p-5 border-2 border-hack-black shadow-[4px_4px_0_0_#0A0A0A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0A0A0A] transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${r.color} flex items-center justify-center text-white font-bold text-sm`}>
                        {r.initials}
                      </div>
                      <div className="leading-tight">
                        <p className="font-bold text-sm text-hack-black">{r.name}</p>
                        <p className="text-xs text-hack-black/50 font-mono">{r.city}</p>
                      </div>
                      <div className="ml-auto flex items-center gap-0.5">
                        {Array.from({ length: r.rating }).map((_, idx) => (
                          <Star key={idx} className="w-3.5 h-3.5 fill-hack-yellow text-hack-yellow" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-hack-black/80 leading-relaxed mb-3">“{r.text}”</p>
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider">
                      <span className="text-hack-magenta truncate">{r.product}</span>
                      <span className="inline-flex items-center gap-1 text-hack-black/60 hover:text-hack-black">
                        {r.source} <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        )}

        {!reduceMotion && (
          <p className="text-center text-xs text-hack-black/50 mt-6">
            Hover to pause • Tap any card to open the original review
          </p>
        )}

        {/* Comic: "Read the reviews next time" — fun PSA */}
        <div className="mt-14 bg-gradient-to-br from-hack-yellow/20 via-white to-hack-orange/10 rounded-2xl border-2 border-hack-black shadow-[6px_6px_0_0_#0A0A0A] p-5 lg:p-8">
          <div className="grid lg:grid-cols-5 gap-6 items-center">
            <div className="lg:col-span-2 order-2 lg:order-1">
              <span className="inline-block bg-hack-black text-hack-yellow font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full mb-3">
                A True Story (sort of)
              </span>
              <h2 className="font-display font-bold text-2xl lg:text-3xl text-hack-black leading-tight mb-3">
                Don&rsquo;t be <span className="bg-hack-yellow px-2">that guy</span> &mdash;
                <br />read the reviews <span className="text-hack-magenta">first</span>.
              </h2>
              <p className="text-hack-black/70 text-sm lg:text-base leading-relaxed mb-4">
                Manish learned the hard way at Tiger Kingdom. You don&rsquo;t have to.
                Every HackKnow template has real reviews from real buyers &mdash; scroll up,
                read them, then download with zero regret.
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                <span className="bg-white border border-hack-black/20 rounded-full px-3 py-1">⭐ 963+ creators</span>
                <span className="bg-white border border-hack-black/20 rounded-full px-3 py-1">🌍 120+ countries</span>
                <span className="bg-white border border-hack-black/20 rounded-full px-3 py-1">🐅 0 tigers</span>
              </div>
            </div>
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div
                role="img"
                aria-label="Three-panel comic strip: Manish visits Tiger Kingdom, skips the reviews, and becomes lunch."
                className="grid grid-cols-3 gap-2 w-full p-4 rounded-xl border-2 border-hack-black shadow-[4px_4px_0_0_#0A0A0A] bg-white"
              >
                <div className="aspect-[3/4] rounded-lg border-2 border-hack-black bg-hack-yellow/40 flex flex-col p-3 relative">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-hack-black/60">Panel 1</span>
                  <div className="flex-1 flex items-center justify-center text-5xl">🧳</div>
                  <p className="font-display font-bold text-xs leading-tight text-hack-black">
                    "Tiger Kingdom! No need to read reviews."
                  </p>
                </div>
                <div className="aspect-[3/4] rounded-lg border-2 border-hack-black bg-hack-orange/30 flex flex-col p-3 relative">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-hack-black/60">Panel 2</span>
                  <div className="flex-1 flex items-center justify-center text-5xl">🐅</div>
                  <p className="font-display font-bold text-xs leading-tight text-hack-black">
                    Tiger: "Lunch arrived early."
                  </p>
                </div>
                <div className="aspect-[3/4] rounded-lg border-2 border-hack-black bg-hack-magenta/20 flex flex-col p-3 relative">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-hack-black/60">Panel 3</span>
                  <div className="flex-1 flex items-center justify-center text-5xl">📖</div>
                  <p className="font-display font-bold text-xs leading-tight text-hack-black">
                    Manish (in tiger): "Read. The. Reviews."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 bg-hack-black rounded-2xl p-6 lg:p-8 text-white text-center">
          <h2 className="font-display font-bold text-xl lg:text-2xl mb-2">
            Loved a HackKnow product? Share your story.
          </h2>
          <p className="text-white/60 mb-4">
            Drop us a review on Trustpilot or Google — we read every single one.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://www.trustpilot.com/review/hackknow.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-hack-yellow text-hack-black rounded-full px-6 py-3 font-bold hover:bg-hack-yellow/90 transition-colors"
            >
              Review on Trustpilot <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href="https://www.google.com/search?q=hackknow.com+reviews"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-hack-black rounded-full px-6 py-3 font-bold hover:bg-white/90 transition-colors"
            >
              Review on Google <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
