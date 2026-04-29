import { Link } from "react-router-dom";
import {
  Globe, MapPin, Sparkles, Code2, Brain, Compass, Award, GraduationCap,
} from "lucide-react";

type Founder = {
  name: string;
  role: string;
  tagline: string;
  bio: string;
  initials: string;
  accent: string;
  border: string;
  Icon: typeof Compass;
};

const founders: Founder[] = [
  {
    name: "Manish Kumar Singh",
    role: "Mentor • Owner • Architect of Empowerment",
    tagline: "B.Tech graduate. Wanderer of one-fourth of the world. Builder of HackKnow.",
    bio:
      "A B.Tech-trained technologist by qualification and a globe-trotting explorer at heart, Manish has wandered through more than a quarter of the world and traversed nearly every corner of India — collecting stories, cultures, languages, and ways of building things that work. HackKnow is the distillation of that journey: a digital empire built to put real, useful, world-class tools into the hands of every creator, student and small business in India and beyond. He calls it his digital legacy — knowledge, opportunity and craft, shared on a global stage.",
    initials: "MKS",
    accent: "from-hack-yellow via-hack-orange to-hack-magenta",
    border: "border-hack-yellow",
    Icon: Compass,
  },
  {
    name: "DeadMan",
    role: "Lead Developer • The Mastermind",
    tagline: "Architect of the codebase, infrastructure and user experience.",
    bio:
      "Known inside the team simply as DeadMan — the engineering mastermind behind everything you see, click and feel on HackKnow. From the React 19 frontend on Google Cloud to the WooCommerce checkout, the Razorpay flow, the offline PWA, and Yahavi AI itself, every line is shaped to be fast, secure and effortless for the customer. Quiet, exact, relentless about quality.",
    initials: "DM",
    accent: "from-hack-black via-hack-magenta to-hack-orange",
    border: "border-hack-magenta",
    Icon: Code2,
  },
  {
    name: "Aarav (AI Orchestration Lead)",
    role: "12th-Grade Dropout • AI Orchestration Expert",
    tagline: "Wants to revolutionize the world through AI talent.",
    bio:
      "Walked away from class-12 to walk straight into building. Today he orchestrates the prompts, multilingual reasoning, intent routing and tool-calling that let Yahavi AI feel human in any language. His mission is simple and loud: prove that raw curiosity, daily reps and a fearless love of AI can outpace any degree — and teach a whole generation to do the same.",
    initials: "AI",
    accent: "from-hack-orange via-hack-yellow to-green-400",
    border: "border-hack-orange",
    Icon: Brain,
  },
];

const stats = [
  { Icon: Globe, value: "120+", label: "Countries served" },
  { Icon: Sparkles, value: "10K+", label: "Premium assets" },
  { Icon: Award, value: "99%", label: "Satisfaction rate" },
  { Icon: GraduationCap, value: "50K+", label: "Creators empowered" },
];

export default function AboutPage() {
  return (
    <div className="pt-28 pb-20 bg-hack-white">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-mono uppercase tracking-widest text-hack-magenta mb-4">
              About HackKnow
            </span>
            <h1 className="font-display font-bold text-4xl lg:text-6xl tracking-tight mb-6">
              A Digital Legacy,
              <br />
              <span className="text-gradient">Built in India for the World</span>
            </h1>
            <p className="text-lg text-hack-black/70 max-w-3xl mx-auto leading-relaxed">
              HackKnow is more than a marketplace. It is a digital empire — handcrafted by a team
              of three: a globe-trotting mentor, a quiet mastermind developer, and a fearless AI
              orchestrator. Together, they put world-class digital tools in your hands.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 text-sm text-hack-black/60">
              <MapPin className="w-4 h-4 text-hack-magenta" /> Delhi, India
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
            {stats.map((s) => (
              <div
                key={s.label}
                className="text-center p-6 rounded-2xl bg-white border border-hack-black/10 shadow-sm"
              >
                <s.Icon className="w-6 h-6 mx-auto mb-3 text-hack-magenta" />
                <p className="font-display font-bold text-2xl lg:text-3xl">{s.value}</p>
                <p className="text-xs text-hack-black/50 font-mono mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Team */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="font-display font-bold text-3xl lg:text-4xl tracking-tight mb-3">
                The People Behind HackKnow
              </h2>
              <p className="text-hack-black/60">Three minds. One mission.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {founders.map((f) => (
                <article
                  key={f.name}
                  className={`bg-white rounded-3xl border-2 ${f.border} shadow-[6px_6px_0_0_#0A0A0A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#0A0A0A] transition-all overflow-hidden`}
                >
                  {/* avatar block — placeholder gradient with initials */}
                  <div className={`relative h-56 bg-gradient-to-br ${f.accent} flex items-center justify-center`}>
                    <span className="font-display font-extrabold text-7xl text-white drop-shadow-md">
                      {f.initials}
                    </span>
                    <div className="absolute top-3 right-3 bg-white/90 rounded-full p-2 backdrop-blur">
                      <f.Icon className="w-5 h-5 text-hack-black" />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-display font-bold text-xl mb-1">{f.name}</h3>
                    <p className="text-xs font-mono uppercase tracking-wider text-hack-magenta mb-3">
                      {f.role}
                    </p>
                    <p className="text-sm font-semibold text-hack-black/80 mb-3 italic">
                      “{f.tagline}”
                    </p>
                    <p className="text-sm text-hack-black/70 leading-relaxed">{f.bio}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Story */}
          <div className="bg-hack-black rounded-3xl p-8 lg:p-12 mb-20 text-hack-white">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-hack-yellow">
                  Our Story
                </span>
                <h2 className="font-display font-bold text-3xl mt-2 mb-4">
                  From a B.Tech dorm to a global digital empire
                </h2>
                <p className="text-hack-white/70 leading-relaxed mb-3">
                  HackKnow began as a personal mission: take everything Manish learned travelling
                  the world, and turn it into tools any creator could use — Excel dashboards,
                  presentation decks, Notion systems, marketing kits — built once, shared with
                  everyone, priced fairly.
                </p>
                <p className="text-hack-white/70 leading-relaxed">
                  Today, HackKnow is a self-funded, India-built digital marketplace serving
                  creators in 120+ countries — wrapped in a custom-coded React storefront,
                  powered by WooCommerce, accelerated by Yahavi AI, and hand-engineered end-to-end
                  by a team of three.
                </p>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-48 h-48 rounded-full bg-gradient-brand flex items-center justify-center shadow-xl">
                  <span className="font-display font-bold text-5xl text-white">HK</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h2 className="font-display font-bold text-2xl lg:text-3xl mb-4">
              Want to be part of the journey?
            </h2>
            <p className="text-hack-black/60 mb-6">
              Browse 10,000+ premium digital assets, or talk to us directly.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-8 py-4 bg-hack-black text-hack-white rounded-full font-bold hover:bg-hack-black/80 transition-colors"
              >
                Explore Products
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-hack-yellow text-hack-black rounded-full font-bold hover:bg-hack-yellow/90 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
