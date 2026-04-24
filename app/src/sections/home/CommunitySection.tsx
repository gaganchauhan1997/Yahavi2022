import { useEffect, useRef } from "react";

function createOrbitalText(container: HTMLDivElement, text: string) {
  const chars = text.split("");
  const degreeStep = 360 / chars.length;
  container.innerHTML = "";
  chars.forEach((char, index) => {
    const span = document.createElement("span");
    span.innerText = char;
    span.style.position = "absolute";
    span.style.left = "50%";
    span.style.top = "0";
    span.style.fontFamily = "'Space Grotesk', sans-serif";
    span.style.fontSize = "1rem";
    span.style.fontWeight = "700";
    span.style.transformOrigin = `0 ${container.offsetWidth / 2}px`;
    span.style.transform = `rotate(${index * degreeStep}deg)`;
    span.style.color = "#F9F9F9";
    container.appendChild(span);
  });
}

export default function CommunitySection() {
  const ring1Ref = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ring1Ref.current) {
      createOrbitalText(ring1Ref.current, "HACKKNOW COMMUNITY • DESIGN • CODE • ASSETS • ");
    }
    if (ring2Ref.current) {
      createOrbitalText(ring2Ref.current, "CREATE • INSPIRE • SHARE • GROW • LEARN • BUILD • ");
    }
  }, []);

  return (
    <section className="bg-hack-black py-20 lg:py-32 overflow-hidden">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Orbital Typography */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <div className="relative w-[300px] h-[300px] lg:w-[400px] lg:h-[400px]">
                {/* Outer Ring */}
                <div
                  ref={ring1Ref}
                  className="absolute inset-0 animate-spin-slow"
                  style={{ width: "100%", height: "100%" }}
                />
                {/* Inner Ring */}
                <div
                  ref={ring2Ref}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] lg:w-[260px] lg:h-[260px] animate-spin-reverse"
                />
                {/* Center Dot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-hack-yellow shadow-glow" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center lg:text-left">
              <span className="inline-block text-xs font-mono uppercase tracking-widest text-hack-yellow mb-4">
                Join 50,000+ Creators
              </span>
              <h2 className="font-display font-bold text-3xl lg:text-5xl text-hack-white tracking-tight mb-6">
                The Hackknow
                <br />
                Community
              </h2>
              <p className="text-hack-white/60 text-base lg:text-lg max-w-lg mb-8 leading-relaxed">
                Connect with fellow creators, share your work, get feedback, and
                access exclusive free resources. Our vibrant community is the
                heart of Hackknow.
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 px-7 py-4 bg-hack-yellow text-hack-black rounded-full text-sm font-bold hover:bg-hack-yellow/90 transition-colors"
                >
                  Join Community
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 px-7 py-4 border border-hack-white/20 text-hack-white rounded-full text-sm font-medium hover:border-hack-yellow hover:text-hack-yellow transition-colors"
                >
                  Explore Freebies
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 mt-12">
                <div>
                  <p className="font-display font-bold text-2xl lg:text-3xl text-hack-yellow">
                    50K+
                  </p>
                  <p className="text-xs text-hack-white/50 font-mono mt-1">
                    Members
                  </p>
                </div>
                <div>
                  <p className="font-display font-bold text-2xl lg:text-3xl text-hack-magenta">
                    2.5K+
                  </p>
                  <p className="text-xs text-hack-white/50 font-mono mt-1">
                    Free Resources
                  </p>
                </div>
                <div>
                  <p className="font-display font-bold text-2xl lg:text-3xl text-hack-orange">
                    100+
                  </p>
                  <p className="text-xs text-hack-white/50 font-mono mt-1">
                    Weekly Uploads
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
