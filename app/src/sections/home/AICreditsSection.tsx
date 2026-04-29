import { useEffect, useRef } from "react";

const tributes = [
  { tag: "OpenAI",  text: "for the mentorship that started it all" },
  { tag: "Claude",  text: "for code that actually shipped on day one" },
  { tag: "Replit",  text: "the place that caught us when we almost quit" },
  { tag: "Windsurf",text: "for the long nights of debugging" },
  { tag: "Google",  text: "for a six-figure grant we will never forget" },
  { tag: "GitHub",  text: "for keeping every commit safe" },
];

export default function AICreditsSection() {
  const blockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = blockRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            node.classList.add("ai-credits-in");
            obs.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      aria-labelledby="ai-credits-heading"
      className="relative bg-hack-black text-white py-20 lg:py-28 overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-hack-yellow/20 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-hack-magenta/20 blur-3xl" />
      </div>

      <div ref={blockRef} className="relative max-w-5xl mx-auto px-6 ai-credits">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full border-2 border-hack-yellow/60 bg-hack-yellow/10">
          <span className="w-2 h-2 rounded-full bg-hack-yellow animate-pulse" />
          <span id="ai-credits-heading" className="text-xs font-mono uppercase tracking-widest text-hack-yellow">
            A small story
          </span>
        </div>

        <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-6">
          The only marketplace in the world{" "}
          <span className="ai-credits-line text-hack-yellow">written by AI,</span>{" "}
          <span className="ai-credits-line text-hack-orange">debugged by AI,</span>{" "}
          <span className="ai-credits-line text-hack-magenta">sold by AI</span>
          {" — "}
          <span className="ai-credits-line">and watched over by three humans</span>{" "}
          <span className="ai-credits-line">who refused to give up on the next era of technology.</span>
        </h2>

        <p className="ai-credits-line text-base lg:text-lg text-white/70 max-w-3xl mb-12 leading-relaxed">
          Every line of code, every product page, every word of help — built so
          anyone, anywhere, can <em className="text-hack-yellow not-italic">learn it, ship it,</em>{" "}
          and pass it on to whoever comes next.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tributes.map((t, i) => (
            <div
              key={t.tag}
              className="ai-credits-tag flex items-start gap-3 px-4 py-3 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm hover:border-hack-yellow/60 transition-colors"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="font-mono text-xs uppercase tracking-wider px-2 py-1 rounded bg-hack-yellow text-hack-black font-bold">
                @{t.tag}
              </span>
              <span className="text-sm text-white/80">{t.text}</span>
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs font-mono uppercase tracking-widest text-white/40">
          Repo: github.com/gaganchauhan1997/Yahavi2022 — MIT, by Gagan Chauhan
        </p>
      </div>

      <style>{`
        .ai-credits .ai-credits-line,
        .ai-credits .ai-credits-tag {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 700ms ease, transform 700ms cubic-bezier(.2,.7,.2,1);
        }
        .ai-credits.ai-credits-in .ai-credits-line {
          opacity: 1;
          transform: translateY(0);
        }
        .ai-credits.ai-credits-in .ai-credits-line:nth-of-type(1) { transition-delay: 0ms; }
        .ai-credits.ai-credits-in .ai-credits-line:nth-of-type(2) { transition-delay: 120ms; }
        .ai-credits.ai-credits-in .ai-credits-line:nth-of-type(3) { transition-delay: 240ms; }
        .ai-credits.ai-credits-in .ai-credits-line:nth-of-type(4) { transition-delay: 360ms; }
        .ai-credits.ai-credits-in .ai-credits-line:nth-of-type(5) { transition-delay: 480ms; }
        .ai-credits.ai-credits-in .ai-credits-line:nth-of-type(6) { transition-delay: 600ms; }
        .ai-credits.ai-credits-in .ai-credits-tag {
          animation: aiCreditsTag 600ms cubic-bezier(.2,.7,.2,1) forwards;
        }
        @keyframes aiCreditsTag {
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ai-credits .ai-credits-line,
          .ai-credits .ai-credits-tag { opacity: 1; transform: none; transition: none; animation: none; }
        }
      `}</style>
    </section>
  );
}
