/**
 * 14-second cinematic — replays on every fresh login.
 *
 *   0.0 - 2.0s   Comet ignition: white core flash, then radial hyperspace streaks
 *                exploding outward (canvas-rendered) + sub-bass rumble
 *   1.5 - 6.5s   Universe sweep: rotating nebula clouds (purple / orange / blue)
 *                with multi-layer parallax starfield streaking past
 *   5.5 - 9.5s   Earth flyby: NASA Blue Marble zooms in, atmospheric glow,
 *                rotates, drifts back into the void
 *   8.5 - 12.0s  Moon approach: real lunar surface rises and grows as we land
 *  11.0 - 14.0s  Dead Man emerges: the hero portrait rises with cosmic aura,
 *                jacket / hair shimmer via animated SVG turbulence,
 *                ember particles drift across the frame,
 *                tagline typewrites in blood red
 *  13.4 - 14.0s  Overlay fades to black, hands control to chat
 *
 * Background score: SILENT — audio disabled per user request.
 *   (CosmosTheme synthesis class kept in src/lib/cosmosTheme.ts for future toggle.)
 */
import { useEffect, useRef } from 'react';
import earthImg from '../assets/cinema/earth.webp';
import moonImg from '../assets/cinema/moon.webp';

const DURATION_MS = 14000;
const HERO_IMG = `${import.meta.env.BASE_URL || '/'}dead-man-hero.png`;

interface Props {
  onDone: () => void;
}

export default function LaunchAnimation({ onDone }: Props) {
  const doneRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cleanupCanvas = canvasRef.current ? startHyperspace(canvasRef.current) : undefined;

    const t = setTimeout(() => finish(), DURATION_MS);
    return () => {
      clearTimeout(t);
      cleanupCanvas?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  return (
    <div className="launch-overlay" role="dialog" aria-label="Summoning the Dead Man">
      {/* SVG turbulence filter for hero shimmer (jacket / hair flutter) */}
      <svg className="launch-svg-defs" width="0" height="0" aria-hidden="true">
        <defs>
          <filter id="hero-flutter" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" numOctaves="2" seed="3" baseFrequency="0.012 0.018">
              <animate
                attributeName="baseFrequency"
                dur="9s"
                values="0.012 0.018; 0.020 0.026; 0.015 0.022; 0.012 0.018"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="9" />
          </filter>
        </defs>
      </svg>

      {/* Pure black backdrop the cinematic sits on */}
      <div className="launch-bg" />

      {/* Comet hyperspace streaks — canvas radial */}
      <canvas ref={canvasRef} className="launch-hyperspace" />

      {/* Nebula sweep (3 colored clouds rotating in opposite directions) */}
      <div className="launch-nebula launch-nebula-1" />
      <div className="launch-nebula launch-nebula-2" />
      <div className="launch-nebula launch-nebula-3" />

      {/* Multi-layer parallax starfield */}
      <div className="launch-stars launch-stars-far" />
      <div className="launch-stars launch-stars-mid" />
      <div className="launch-stars launch-stars-near" />

      {/* Drifting cosmic dust */}
      <div className="launch-dust" />

      {/* Real Earth — slowly rotates and drifts back into void */}
      <div className="launch-earth-wrap">
        <img src={earthImg} alt="" className="launch-earth-img" draggable={false} />
        <div className="launch-earth-glow" />
      </div>

      {/* Cosmic aura behind the Dead Man (orange→purple→blue radial) */}
      <div className="launch-aura" />

      {/* Real Moon — rises from below */}
      <img src={moonImg} alt="" className="launch-moon-img" draggable={false} />

      {/* Dead Man — animated hero portrait */}
      <div className="launch-hero-wrap">
        <img src={HERO_IMG} alt="" className="launch-hero-img" draggable={false} />
        {/* Ember particles drifting across the figure */}
        <div className="launch-embers">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className={`ember ember-${i}`} />
          ))}
        </div>
      </div>

      {/* Vignette tightens as Dead Man emerges */}
      <div className="launch-vignette" />

      {/* Tagline */}
      <div className="launch-line">
        <span className="typewriter">Ask what you want the most</span><span className="caret" />
      </div>

      {/* Ignition flash — sits above everything for the first 0.6s */}
      <div className="launch-flash" />

      <button className="launch-skip" onClick={finish} aria-label="Skip">Skip ▸</button>
    </div>
  );
}

/** Renders radial hyperspace streaks shooting outward from the screen center. */
function startHyperspace(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
  };
  resize();
  window.addEventListener('resize', resize);

  type Streak = { angle: number; r: number; speed: number; len: number; hue: number; alpha: number };
  const streaks: Streak[] = [];
  const STREAK_COUNT = 240;
  for (let i = 0; i < STREAK_COUNT; i++) {
    streaks.push({
      angle: Math.random() * Math.PI * 2,
      r: Math.random() * 60,
      speed: 5 + Math.random() * 22,
      len: 30 + Math.random() * 70,
      hue: Math.random() < 0.65 ? 28 : Math.random() < 0.5 ? 200 : 0,
      alpha: 0.7 + Math.random() * 0.3,
    });
  }

  const start = performance.now();
  let raf = 0;
  let alive = true;

  const step = (now: number) => {
    if (!alive) return;
    const elapsed = now - start;

    let intensity = 0;
    if (elapsed < 2500) intensity = Math.min(1, elapsed / 350);
    else if (elapsed < 6000) intensity = Math.max(0, 1 - (elapsed - 2500) / 3500);

    if (intensity <= 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      raf = requestAnimationFrame(step);
      return;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxR = Math.hypot(canvas.width, canvas.height) / 2;

    streaks.forEach(s => {
      s.r += s.speed * dpr;
      const x1 = cx + Math.cos(s.angle) * s.r;
      const y1 = cy + Math.sin(s.angle) * s.r;
      const x2 = cx + Math.cos(s.angle) * (s.r + s.len * dpr);
      const y2 = cy + Math.sin(s.angle) * (s.r + s.len * dpr);

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `hsla(${s.hue}, 100%, 65%, ${s.alpha * intensity})`);
      grad.addColorStop(1, `hsla(${s.hue}, 100%, 80%, 0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = (1.2 + Math.random() * 0.8) * dpr;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (s.r > maxR) {
        s.r = Math.random() * 30;
        s.angle = Math.random() * Math.PI * 2;
        s.speed = 5 + Math.random() * 22;
        s.len = 30 + Math.random() * 70;
      }
    });

    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  };
}
