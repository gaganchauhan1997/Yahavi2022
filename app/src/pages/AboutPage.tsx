import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Globe,
  MapPin,
  Sparkles,
  Code2,
  Brain,
  Compass,
  Award,
  GraduationCap,
  Volume2,
  VolumeX,
  Pause,
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
  { Icon: GraduationCap, value: "963+", label: "Creators empowered" },
];

/* ---------------------- Mentor Voice Reader (pre-rendered MP3, studio quality) ---------------------- */

type VoiceState = "idle" | "playing" | "paused";

const MENTOR_AUDIO_SRC = "/manish-mentor.mp3";

/* ----------------------------------- Page ----------------------------------- */

export default function AboutPage() {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const supported =
    typeof window !== "undefined" && typeof window.Audio !== "undefined";
  // Audio plays only on user tap, so browser autoplay policies never apply.
  const autoplayBlocked = false;

  const ensureAudio = useCallback((): HTMLAudioElement | null => {
    if (!supported) return null;
    if (audioRef.current) return audioRef.current;
    const a = new Audio(MENTOR_AUDIO_SRC);
    a.preload = "auto";
    a.addEventListener("play", () => setVoiceState("playing"));
    a.addEventListener("pause", () => {
      if (a.ended || a.currentTime === 0) {
        setVoiceState("idle");
      } else {
        setVoiceState("paused");
      }
    });
    a.addEventListener("ended", () => setVoiceState("idle"));
    a.addEventListener("error", () => setVoiceState("idle"));
    audioRef.current = a;
    return a;
  }, [supported]);

  const stopSpeech = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
    } catch {
      /* noop */
    }
    setVoiceState("idle");
  }, []);

  const startSpeech = useCallback(() => {
    const a = ensureAudio();
    if (!a) return;
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => setVoiceState("idle"));
      }
    } catch {
      setVoiceState("idle");
    }
  }, [ensureAudio]);

  const togglePause = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!a.paused) {
      a.pause();
      setVoiceState("paused");
    } else {
      const p = a.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => setVoiceState("idle"));
      }
    }
  }, []);

  // Per request: every tap on the photo (re)starts the story from the beginning.
  const handleSpeakerTap = useCallback(() => {
    if (!supported) return;
    startSpeech();
  }, [startSpeech, supported]);

  // Stop audio when the tab becomes hidden so it doesn't keep playing in background.
  useEffect(() => {
    if (!supported) return;
    const onVis = () => {
      const a = audioRef.current;
      if (!a) return;
      if (document.hidden && !a.paused) {
        a.pause();
        a.currentTime = 0;
        setVoiceState("idle");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [supported]);

  // Cleanup audio on unmount.
  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) {
        try {
          a.pause();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  const speakerLabel =
    voiceState === "playing"
      ? "Now playing — tap to restart"
      : voiceState === "paused"
        ? "Paused — tap to restart"
        : "Tap to hear the mentor's story";

  const mentor = founders[0];
  const others = founders.slice(1);

  return (
    <div className="pt-28 pb-20 bg-hack-white">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-mono uppercase tracking-widest text-hack-magenta mb-4">
              About HackKnow
            </span>
            <h1 className="font-display font-black text-4xl lg:text-6xl tracking-tight mb-6">
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

          {/* ====================== MENTOR HERO BOX (with photo + voice) ====================== */}
          <section
            className="relative mb-16 rounded-3xl border-[3px] border-hack-black bg-white shadow-[10px_10px_0_0_#1A1A1A] overflow-hidden"
            aria-label="Meet your mentor — tap the photo to hear the story"
          >
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
              {/* Photo column */}
              <div className="relative lg:col-span-3 bg-gradient-to-br from-hack-yellow/30 via-white to-hack-magenta/20 p-4 sm:p-6">
                {/* Comic-style "MENTOR" badge */}
                <span className="absolute -top-2 -left-2 z-20 bg-hack-magenta text-hack-black font-display font-black text-xs sm:text-sm uppercase tracking-widest px-3 py-1.5 rounded-md border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#1A1A1A] -rotate-6">
                  ★ Mentor
                </span>
                <span className="absolute top-3 right-3 z-20 hidden sm:inline-flex items-center gap-1 bg-hack-yellow text-hack-black font-display font-black text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md border-[2px] border-hack-black shadow-[2px_2px_0_0_#1A1A1A] rotate-3">
                  One Life, Endless Memories
                </span>

                {/* Photo frame — neo-brutal with comic-style frame, tap-to-toggle voice */}
                <button
                  type="button"
                  onClick={handleSpeakerTap}
                  aria-label={speakerLabel}
                  aria-pressed={voiceState === "playing"}
                  className="group relative block w-full overflow-hidden rounded-2xl border-[3px] border-hack-black shadow-[6px_6px_0_0_#1A1A1A] hover:shadow-[3px_3px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150 cursor-pointer"
                >
                  <img
                    src="/manish-mentor.jpg"
                    alt="Manish Kumar Singh — comic-style travel collage with the caption One Life, Many Stories, Endless Memories"
                    className="block w-full h-auto select-none"
                    width={1024}
                    height={945}
                    loading="eager"
                    decoding="async"
                    draggable={false}
                  />

                  {/* Speaker overlay — bottom-right chip */}
                  <span
                    className={`absolute bottom-3 right-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl border-[2.5px] border-hack-black shadow-[3px_3px_0_0_#1A1A1A] font-display font-black text-xs sm:text-sm transition-colors ${
                      voiceState === "playing"
                        ? "bg-hack-magenta text-hack-black"
                        : voiceState === "paused"
                          ? "bg-hack-orange text-hack-black"
                          : "bg-hack-yellow text-hack-black"
                    }`}
                  >
                    {voiceState === "playing" ? (
                      <>
                        <Volume2 className="w-4 h-4 animate-pulse" strokeWidth={2.75} />
                        Now playing…
                      </>
                    ) : voiceState === "paused" ? (
                      <>
                        <Pause className="w-4 h-4" strokeWidth={2.75} />
                        Paused — tap to stop
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" strokeWidth={2.75} />
                        Tap to hear the story
                      </>
                    )}
                  </span>

                  {/* Subtle pulsing ring while playing */}
                  {voiceState === "playing" && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-2xl ring-4 ring-hack-magenta/50 animate-pulse"
                    />
                  )}
                </button>

                {/* Helper line + secondary controls */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm text-hack-black/70 font-semibold">
                    {supported
                      ? autoplayBlocked && voiceState === "idle"
                        ? "Your browser blocked auto-play — tap the photo to listen."
                        : voiceState === "playing"
                          ? "Now narrating the mentor's story."
                          : "Tap the photo to hear the mentor's story."
                      : "Your browser doesn't support voice — please read the text."}
                  </p>

                  {voiceState === "playing" && (
                    <button
                      type="button"
                      onClick={togglePause}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-hack-black text-xs font-black border-[2px] border-hack-black shadow-[2px_2px_0_0_#1A1A1A] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      <Pause className="w-3.5 h-3.5" strokeWidth={2.75} /> Pause
                    </button>
                  )}
                  {voiceState === "paused" && (
                    <button
                      type="button"
                      onClick={togglePause}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-hack-yellow text-hack-black text-xs font-black border-[2px] border-hack-black shadow-[2px_2px_0_0_#1A1A1A] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      <Volume2 className="w-3.5 h-3.5" strokeWidth={2.75} /> Resume
                    </button>
                  )}
                  {voiceState !== "idle" && (
                    <button
                      type="button"
                      onClick={stopSpeech}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-hack-black text-xs font-black border-[2px] border-hack-black shadow-[2px_2px_0_0_#1A1A1A] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      <VolumeX className="w-3.5 h-3.5" strokeWidth={2.75} /> Stop
                    </button>
                  )}
                </div>
              </div>

              {/* Mentor bio column */}
              <div className="lg:col-span-2 p-6 lg:p-8 lg:border-l-[3px] border-hack-black bg-white">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-hack-magenta font-bold">
                  <mentor.Icon className="w-3.5 h-3.5" /> Founder &amp; Mentor
                </span>
                <h2 className="font-display font-black text-2xl sm:text-3xl text-hack-black mt-2 leading-tight">
                  {mentor.name}
                </h2>
                <p className="text-xs font-mono uppercase tracking-wider text-hack-black/60 mt-1">
                  {mentor.role}
                </p>
                <p className="text-sm font-bold text-hack-black mt-4 italic border-l-[3px] border-hack-yellow pl-3">
                  “{mentor.tagline}”
                </p>
                <p className="text-sm text-hack-black/75 leading-relaxed mt-4">
                  {mentor.bio}
                </p>
              </div>
            </div>
          </section>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
            {stats.map((s) => (
              <div
                key={s.label}
                className="text-center p-6 rounded-2xl bg-white border-[2.5px] border-hack-black shadow-[4px_4px_0_0_#1A1A1A]"
              >
                <s.Icon className="w-6 h-6 mx-auto mb-3 text-hack-magenta" strokeWidth={2.5} />
                <p className="font-display font-black text-2xl lg:text-3xl">{s.value}</p>
                <p className="text-xs text-hack-black/55 font-mono mt-1 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Other team — kept for context, simplified to avoid duplicating mentor */}
          <div className="mb-20">
            <div className="text-center mb-10">
              <h2 className="font-display font-black text-3xl lg:text-4xl tracking-tight mb-3">
                The Rest of the Team
              </h2>
              <p className="text-hack-black/60">Two minds. One mission.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {others.map((f) => (
                <article
                  key={f.name}
                  className={`bg-white rounded-3xl border-[3px] border-hack-black shadow-[6px_6px_0_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#1A1A1A] transition-all overflow-hidden`}
                >
                  <div className={`relative h-48 bg-gradient-to-br ${f.accent} flex items-center justify-center border-b-[3px] border-hack-black`}>
                    <span className="font-display font-black text-7xl text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.3)]">
                      {f.initials}
                    </span>
                    <div className="absolute top-3 right-3 bg-white rounded-lg p-2 border-[2px] border-hack-black shadow-[2px_2px_0_0_#1A1A1A]">
                      <f.Icon className="w-5 h-5 text-hack-black" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-display font-black text-xl mb-1">{f.name}</h3>
                    <p className="text-xs font-mono uppercase tracking-wider text-hack-magenta mb-3 font-bold">
                      {f.role}
                    </p>
                    <p className="text-sm font-bold text-hack-black/85 mb-3 italic">
                      “{f.tagline}”
                    </p>
                    <p className="text-sm text-hack-black/70 leading-relaxed">{f.bio}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Story */}
          <div className="bg-hack-black rounded-3xl p-8 lg:p-12 mb-20 text-hack-white border-[3px] border-hack-black shadow-[10px_10px_0_0_#FFF055]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-hack-yellow font-bold">
                  Our Story
                </span>
                <h2 className="font-display font-black text-3xl mt-2 mb-4">
                  From a B.Tech dorm to a global digital empire
                </h2>
                <p className="text-hack-white/80 leading-relaxed mb-3">
                  HackKnow began as a personal mission: take everything Manish learned travelling
                  the world, and turn it into tools any creator could use — Excel dashboards,
                  presentation decks, Notion systems, marketing kits — built once, shared with
                  everyone, priced fairly.
                </p>
                <p className="text-hack-white/80 leading-relaxed">
                  Today, HackKnow is a self-funded, India-built digital marketplace serving
                  creators in 120+ countries — wrapped in a custom-coded React storefront,
                  powered by WooCommerce, accelerated by Yahavi AI, and hand-engineered end-to-end
                  by a team of three.
                </p>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-44 h-44 rounded-2xl bg-hack-yellow flex items-center justify-center border-[3px] border-hack-white shadow-[6px_6px_0_0_#E91E63]">
                  <span className="font-display font-black text-5xl text-hack-black">HK</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h2 className="font-display font-black text-2xl lg:text-3xl mb-4">
              Want to be part of the journey?
            </h2>
            <p className="text-hack-black/60 mb-6 font-medium">
              Browse 10,000+ premium digital assets, or talk to us directly.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-hack-black text-hack-white rounded-xl font-black border-[3px] border-hack-black shadow-[5px_5px_0_0_#FFF055] hover:shadow-[2px_2px_0_0_#FFF055] hover:translate-x-[3px] hover:translate-y-[3px] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none transition-all duration-150"
              >
                Explore Products
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-hack-yellow text-hack-black rounded-xl font-black border-[3px] border-hack-black shadow-[5px_5px_0_0_#E91E63] hover:shadow-[2px_2px_0_0_#E91E63] hover:translate-x-[3px] hover:translate-y-[3px] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none transition-all duration-150"
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
