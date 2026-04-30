/**
 * TDM "Dead Boot" — 2.4-second signature reveal.
 *
 * Design rationale:
 *   TDM is a BYOK AI productivity tool, not a game launcher.
 *   The intro must (a) brand-anchor in <3s, (b) never block the user from
 *   reaching the chat surface, (c) honour prefers-reduced-motion, and
 *   (d) load instantly on first paint (no image / audio assets).
 *
 * Sequence (timestamps in ms):
 *   0     Black backdrop, full bleed
 *   100   CRT scanline sweeps top → bottom (single pass, ~280ms)
 *   380   SVG skull glyph draws stroke-by-stroke via strokeDashoffset
 *         (orange line on black, cinematic but minimal — fits the
 *          Blackbox AI / terminal aesthetic)
 *   1180  Eye sockets ignite — orange radial-gradient flash + steady glow
 *   1380  Wordmark "TDM // THE DEAD MAN" types in with monospace cursor
 *   1780  Tagline "your keys · your model · your rules" fades in
 *   2100  Whole overlay fades out (300ms)
 *   2400  onDone() — chat is live
 *
 * If `prefers-reduced-motion: reduce` is set, the overlay paints the
 * final state immediately and dismisses in 600ms (still gives a brand
 * beat, but no motion).
 */
import { useEffect, useRef } from 'react';

const DURATION_MS = 2400;
const REDUCED_DURATION_MS = 600;

interface Props {
  onDone: () => void;
}

export default function LaunchAnimation({ onDone }: Props) {
  const doneRef = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const t = setTimeout(() => finish(), reduced ? REDUCED_DURATION_MS : DURATION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  return (
    <div
      className="tdm-boot"
      role="dialog"
      aria-label="The Dead Man — boot sequence"
      onClick={finish}
      onKeyDown={(e) => (e.key === 'Escape' || e.key === 'Enter') && finish()}
      tabIndex={0}
    >
      {/* CRT scanline sweep */}
      <div className="tdm-boot__scan" aria-hidden="true" />

      {/* Skull glyph + wordmark */}
      <div className="tdm-boot__center">
        <svg
          className="tdm-boot__skull"
          viewBox="0 0 200 220"
          width="180"
          height="200"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Cranium (top arc) */}
          <path
            className="tdm-boot__stroke tdm-boot__stroke--1"
            d="M40 110 C 40 50, 160 50, 160 110 L 160 140 C 160 152, 145 158, 130 158 L 70 158 C 55 158, 40 152, 40 140 Z"
          />
          {/* Jaw (lower) */}
          <path
            className="tdm-boot__stroke tdm-boot__stroke--2"
            d="M65 158 L 70 195 L 95 195 L 100 175 L 105 195 L 130 195 L 135 158"
          />
          {/* Teeth divider */}
          <path
            className="tdm-boot__stroke tdm-boot__stroke--3"
            d="M70 175 L 130 175 M82 175 L82 195 M100 175 L100 195 M118 175 L118 195"
          />
          {/* Nose triangle */}
          <path
            className="tdm-boot__stroke tdm-boot__stroke--4"
            d="M95 120 L 100 138 L 105 120 Z"
          />
          {/* Eye sockets — drawn as paths so they share the stroke animation */}
          <circle
            className="tdm-boot__stroke tdm-boot__stroke--5 tdm-boot__eye"
            cx="72" cy="105" r="14"
          />
          <circle
            className="tdm-boot__stroke tdm-boot__stroke--5 tdm-boot__eye"
            cx="128" cy="105" r="14"
          />
          {/* Eye glow — radial fills, ignite later */}
          <circle className="tdm-boot__eyeglow" cx="72"  cy="105" r="6" />
          <circle className="tdm-boot__eyeglow" cx="128" cy="105" r="6" />
        </svg>

        <div className="tdm-boot__wordmark" aria-hidden="true">
          <span className="tdm-boot__type">TDM&nbsp;&nbsp;//&nbsp;&nbsp;THE&nbsp;DEAD&nbsp;MAN</span>
          <span className="tdm-boot__caret">▮</span>
        </div>

        <div className="tdm-boot__tagline" aria-hidden="true">
          your&nbsp;keys&nbsp;&middot;&nbsp;your&nbsp;model&nbsp;&middot;&nbsp;your&nbsp;rules
        </div>
      </div>

      {/* Vignette + grain (subtle, terminal-CRT vibe) */}
      <div className="tdm-boot__vignette" aria-hidden="true" />
      <div className="tdm-boot__grain" aria-hidden="true" />

      {/* Live region for screen-reader users (so the boot is announced once) */}
      <span className="tdm-boot__sr" aria-live="polite">
        The Dead Man — your keys, your model, your rules.
      </span>
    </div>
  );
}
