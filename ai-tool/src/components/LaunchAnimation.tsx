/**
 * Six-second cinematic on first key save.
 *
 *   0.0-0.8s   white flash
 *   0.4-2.9s   Earth zooms in then pulls back into the void
 *   2.4-4.0s   Moon rises
 *   4.0-5.2s   Dead Man / Red Skull rises onto the moon, red aura pulses
 *   4.6-6.0s   "Ask what you want the most" typewrites, blood-red glow
 *   5.6-6.2s   overlay fades out
 */
import { useEffect, useRef } from 'react';

interface Props {
  onDone: () => void;
}

export default function LaunchAnimation({ onDone }: Props) {
  const doneRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => { if (!doneRef.current) { doneRef.current = true; onDone(); } }, 6200);
    return () => clearTimeout(t);
  }, [onDone]);

  const skip = () => { if (!doneRef.current) { doneRef.current = true; onDone(); } };

  return (
    <div className="launch-overlay" role="dialog" aria-label="Summoning the Dead Man">
      {/* Drifting starfield */}
      <div
        className="launch-stars"
        style={{
          backgroundImage:
            'radial-gradient(1px 1px at 12% 18%, #fff 1px, transparent 0),' +
            'radial-gradient(1px 1px at 32% 75%, #fff 1px, transparent 0),' +
            'radial-gradient(1px 1px at 55% 25%, #fff 1px, transparent 0),' +
            'radial-gradient(2px 2px at 70% 60%, #fff 1px, transparent 0),' +
            'radial-gradient(1px 1px at 82% 12%, #ff6b00 1px, transparent 0),' +
            'radial-gradient(1px 1px at 88% 45%, #fff 1px, transparent 0),' +
            'radial-gradient(1px 1px at 18% 90%, #ff3344 1px, transparent 0),' +
            'radial-gradient(1px 1px at 47% 5%, #fff 1px, transparent 0),' +
            'radial-gradient(2px 2px at 5% 50%, #ff6b00 1px, transparent 0)',
          backgroundSize: '700px 700px',
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Earth — pulls back into the void */}
      <svg className="launch-earth" width="380" height="380" viewBox="0 0 380 380">
        <defs>
          <radialGradient id="earthGrad" cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#5fb3ff" />
            <stop offset="50%" stopColor="#1e6dc7" />
            <stop offset="100%" stopColor="#0a1f44" />
          </radialGradient>
          <radialGradient id="earthShade" cx="70%" cy="70%" r="60%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.7)" />
          </radialGradient>
        </defs>
        <circle cx="190" cy="190" r="180" fill="url(#earthGrad)" />
        <path d="M70 140 Q110 110 160 130 T240 120 Q280 130 300 160 Q310 200 280 220 Q220 230 180 210 Q120 200 100 230 Q80 220 70 180 Z"
              fill="#3a8b3a" opacity="0.85" />
        <path d="M150 240 Q190 230 230 250 Q260 270 240 290 Q200 295 170 280 Q150 270 150 240 Z"
              fill="#2e7d2e" opacity="0.85" />
        <circle cx="190" cy="190" r="180" fill="url(#earthShade)" />
        <circle cx="190" cy="190" r="180" fill="none" stroke="rgba(110,180,255,0.35)" strokeWidth="2" />
      </svg>

      {/* Moon — rises from bottom */}
      <svg className="launch-moon" width="340" height="340" viewBox="0 0 340 340">
        <defs>
          <radialGradient id="moonGrad" cx="38%" cy="38%" r="72%">
            <stop offset="0%" stopColor="#e8e3d6" />
            <stop offset="55%" stopColor="#9b958a" />
            <stop offset="100%" stopColor="#262421" />
          </radialGradient>
          <radialGradient id="moonShade" cx="80%" cy="80%" r="60%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.85)" />
          </radialGradient>
        </defs>
        <circle cx="170" cy="170" r="160" fill="url(#moonGrad)" />
        {/* Craters */}
        <circle cx="110" cy="120" r="22" fill="#5a554b" opacity="0.55" />
        <circle cx="225" cy="100" r="14" fill="#5a554b" opacity="0.55" />
        <circle cx="240" cy="200" r="30" fill="#4d4a42" opacity="0.5" />
        <circle cx="130" cy="220" r="18" fill="#5a554b" opacity="0.55" />
        <circle cx="80" cy="180" r="9" fill="#5a554b" opacity="0.5" />
        <circle cx="195" cy="250" r="11" fill="#5a554b" opacity="0.5" />
        <circle cx="170" cy="170" r="160" fill="url(#moonShade)" />
      </svg>

      {/* Red aura behind skull */}
      <div className="launch-aura show" style={{ width: 420, height: 420, marginLeft: 0 }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,10,30,0.7) 0%, rgba(255,10,30,0.25) 35%, transparent 70%)',
          filter: 'blur(20px)',
        }} />
      </div>

      {/* Dead Man / Red Skull silhouette */}
      <svg className="launch-skull" width="220" height="280" viewBox="0 0 220 280" style={{ filter: 'drop-shadow(0 0 20px rgba(255,10,30,0.85)) drop-shadow(0 0 40px rgba(255,10,30,0.55))' }}>
        <defs>
          <radialGradient id="skullGrad" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#ff5566" />
            <stop offset="60%" stopColor="#cc1122" />
            <stop offset="100%" stopColor="#660011" />
          </radialGradient>
        </defs>
        {/* Cape / shoulders silhouette */}
        <path d="M30 280 L50 200 Q110 180 170 200 L190 280 Z" fill="#0a0000" stroke="#660011" strokeWidth="1.5" />
        {/* Head / skull */}
        <ellipse cx="110" cy="100" rx="70" ry="80" fill="url(#skullGrad)" />
        {/* Cheekbones / jaw */}
        <path d="M55 130 Q65 175 90 195 L130 195 Q155 175 165 130 Q160 165 110 175 Q60 165 55 130 Z" fill="#2a0008" opacity="0.85" />
        {/* Eye sockets — pure black voids with red inner glow */}
        <ellipse cx="85" cy="105" rx="14" ry="18" fill="#000" />
        <ellipse cx="135" cy="105" rx="14" ry="18" fill="#000" />
        <ellipse cx="85" cy="108" rx="6" ry="9" fill="#ff0a1e" opacity="0.95">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="135" cy="108" rx="6" ry="9" fill="#ff0a1e" opacity="0.95">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite" />
        </ellipse>
        {/* Nose cavity */}
        <path d="M110 130 L102 155 L118 155 Z" fill="#000" />
        {/* Teeth */}
        <rect x="80"  y="160" width="60" height="10" fill="#1a0004" />
        <line x1="90" y1="160" x2="90" y2="170" stroke="#660011" strokeWidth="1" />
        <line x1="100" y1="160" x2="100" y2="170" stroke="#660011" strokeWidth="1" />
        <line x1="110" y1="160" x2="110" y2="170" stroke="#660011" strokeWidth="1" />
        <line x1="120" y1="160" x2="120" y2="170" stroke="#660011" strokeWidth="1" />
        <line x1="130" y1="160" x2="130" y2="170" stroke="#660011" strokeWidth="1" />
        {/* Cracks on skull */}
        <path d="M70 70 L90 90 L75 110" stroke="#330006" strokeWidth="2" fill="none" />
        <path d="M150 60 L140 90 L155 105" stroke="#330006" strokeWidth="2" fill="none" />
      </svg>

      {/* Title line — typewrites in blood red */}
      <div className="launch-line">
        <span className="typewriter">Ask what you want the most</span><span className="caret" />
      </div>

      {/* Initial flash — last to render so it sits above */}
      <div className="launch-flash" />

      <button className="launch-skip" onClick={skip} aria-label="Skip">Skip ▸</button>
    </div>
  );
}
