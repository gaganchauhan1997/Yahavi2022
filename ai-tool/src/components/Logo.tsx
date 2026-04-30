/**
 * The Dead Man's mark — a circular sigil:
 *   - outer thin orange ring (the seal)
 *   - inner stylised skull, one eye an ember (the speaker eye)
 *   - a single horizontal orange bar below the skull (the last word)
 * Two sizes so the same artwork is used in the header and the empty state.
 */

interface Props {
  size?: number;
  className?: string;
  withGlow?: boolean;
  /** When true, plays a slow rotation on the outer dashed ring. */
  animated?: boolean;
}

export default function Logo({ size = 40, className = '', withGlow = false, animated = false }: Props) {
  const filter = withGlow
    ? 'drop-shadow(0 0 10px rgba(255,107,0,0.55)) drop-shadow(0 0 22px rgba(255,107,0,0.25))'
    : undefined;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ filter }}
      aria-label="The Dead Man's seal"
    >
      <defs>
        <radialGradient id="lg-skull" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#cfcfcf" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#5a5a5a" stopOpacity="0.85" />
        </radialGradient>
        <radialGradient id="lg-ember" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd680" />
          <stop offset="40%" stopColor="#ff8a1f" />
          <stop offset="100%" stopColor="#ff3b00" />
        </radialGradient>
      </defs>

      {/* Inner black field */}
      <circle cx="50" cy="50" r="46" fill="#000000" />

      {/* Solid outer ring */}
      <circle cx="50" cy="50" r="46" fill="none" stroke="#ff6b00" strokeWidth="1.5" />

      {/* Dashed inner ring (slowly rotates if animated) */}
      <g style={animated ? { transformOrigin: '50px 50px', animation: 'spin 22s linear infinite' } : undefined}>
        <circle cx="50" cy="50" r="42" fill="none" stroke="#ff6b00" strokeWidth="0.6" strokeDasharray="2 4" opacity="0.7" />
      </g>

      {/* Skull head */}
      <ellipse cx="50" cy="46" rx="22" ry="24" fill="url(#lg-skull)" stroke="#3a3a3a" strokeWidth="0.6" />

      {/* Cheekbones / jaw outline */}
      <path
        d="M30 56 Q34 70 42 74 L58 74 Q66 70 70 56 Q67 66 50 70 Q33 66 30 56 Z"
        fill="#1a1a1a"
        opacity="0.55"
      />
      {/* Lower jaw teeth bar */}
      <rect x="40" y="68" width="20" height="4" rx="0.5" fill="#0a0a0a" />
      <line x1="44" y1="68" x2="44" y2="72" stroke="#5a5a5a" strokeWidth="0.5" />
      <line x1="48" y1="68" x2="48" y2="72" stroke="#5a5a5a" strokeWidth="0.5" />
      <line x1="52" y1="68" x2="52" y2="72" stroke="#5a5a5a" strokeWidth="0.5" />
      <line x1="56" y1="68" x2="56" y2="72" stroke="#5a5a5a" strokeWidth="0.5" />

      {/* Hollow eye (right) */}
      <ellipse cx="58" cy="44" rx="5.5" ry="7" fill="#000000" />

      {/* Speaker eye (left) — the ember */}
      <ellipse cx="42" cy="44" rx="5.5" ry="7" fill="#000000" />
      <circle cx="42" cy="45" r="3.4" fill="url(#lg-ember)">
        {animated && <animate attributeName="r" values="3.0;3.8;3.0" dur="2.2s" repeatCount="indefinite" />}
        {animated && <animate attributeName="opacity" values="0.85;1;0.85" dur="2.2s" repeatCount="indefinite" />}
      </circle>

      {/* Nasal cavity */}
      <path d="M50 52 L46.5 60 L53.5 60 Z" fill="#000000" />

      {/* The last word — a single horizontal bar under the skull */}
      <rect x="34" y="80" width="32" height="1.5" fill="#ff6b00" />
      <circle cx="34" cy="80.75" r="1.2" fill="#ff6b00" />
      <circle cx="66" cy="80.75" r="1.2" fill="#ff6b00" />
    </svg>
  );
}
