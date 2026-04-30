/**
 * The Dead Man's sigil — the same wax-seal mark used on tdm.hackknow.com,
 * styled for HackKnow's white neobrutal nav (black sigil with orange ember).
 */

interface Props {
  size?: number;
  className?: string;
}

export default function TdmSigil({ size = 28, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-label="The Dead Man's seal"
    >
      <defs>
        <radialGradient id="tdm-skull" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#d4d4d4" />
          <stop offset="100%" stopColor="#3a3a3a" />
        </radialGradient>
        <radialGradient id="tdm-ember" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd680" />
          <stop offset="40%" stopColor="#ff8a1f" />
          <stop offset="100%" stopColor="#ff3b00" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="46" fill="#0A0A0A" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#ff6b00" strokeWidth="2" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="#ff6b00" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.7">
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="22s" repeatCount="indefinite" />
      </circle>

      <ellipse cx="50" cy="46" rx="22" ry="24" fill="url(#tdm-skull)" stroke="#0A0A0A" strokeWidth="0.6" />
      <path d="M30 56 Q34 70 42 74 L58 74 Q66 70 70 56 Q67 66 50 70 Q33 66 30 56 Z" fill="#0A0A0A" opacity="0.55" />
      <rect x="40" y="68" width="20" height="4" rx="0.5" fill="#0A0A0A" />
      <line x1="44" y1="68" x2="44" y2="72" stroke="#5a5a5a" strokeWidth="0.5" />
      <line x1="48" y1="68" x2="48" y2="72" stroke="#5a5a5a" strokeWidth="0.5" />
      <line x1="52" y1="68" x2="52" y2="72" stroke="#5a5a5a" strokeWidth="0.5" />
      <line x1="56" y1="68" x2="56" y2="72" stroke="#5a5a5a" strokeWidth="0.5" />

      <ellipse cx="58" cy="44" rx="5.5" ry="7" fill="#000" />
      <ellipse cx="42" cy="44" rx="5.5" ry="7" fill="#000" />
      <circle cx="42" cy="45" r="3.4" fill="url(#tdm-ember)">
        <animate attributeName="r" values="3.0;3.8;3.0" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.85;1;0.85" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <path d="M50 52 L46.5 60 L53.5 60 Z" fill="#000" />

      <rect x="34" y="80" width="32" height="1.5" fill="#ff6b00" />
      <circle cx="34" cy="80.75" r="1.2" fill="#ff6b00" />
      <circle cx="66" cy="80.75" r="1.2" fill="#ff6b00" />
    </svg>
  );
}
