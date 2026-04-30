/**
 * Six-second cinematic on first key save — REAL imagery, not SVG cartoons.
 *
 *   0.0-0.6s   subtle white flash, then settle into pitch black void
 *   0.3-3.0s   real NASA Earth zooms IN slowly, rotates, then drifts back into void
 *               (subtle atmospheric rim glow, slight parallax tilt)
 *   2.6-4.2s   real Moon rises from below with lateral drift, craters sharpen
 *   3.8-5.4s   Dead Man (red skull bust) rises in front of moon, red aura pulses,
 *               vignette tightens, low rumble feel
 *   4.6-6.0s   "Ask what you want the most" typewrites in blood red
 *   5.6-6.2s   overlay fades out
 */
import { useEffect, useRef } from 'react';
import earthImg from '../assets/cinema/earth.webp';
import moonImg from '../assets/cinema/moon.webp';
import skullImg from '../assets/cinema/skull.webp';

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
      {/* Vignette — gives depth and cinema feel */}
      <div className="launch-vignette" />

      {/* Twinkling starfield — multiple layers for parallax depth */}
      <div className="launch-stars launch-stars-far" />
      <div className="launch-stars launch-stars-mid" />
      <div className="launch-stars launch-stars-near" />

      {/* Drifting cosmic dust */}
      <div className="launch-dust" />

      {/* Real Earth — slowly rotates, then pulls back into the void */}
      <div className="launch-earth-wrap">
        <img src={earthImg} alt="" className="launch-earth-img" draggable={false} />
        <div className="launch-earth-glow" />
      </div>

      {/* Red ember halo behind the Dead Man */}
      <div className="launch-aura" />

      {/* Real Moon — rises from bottom with lateral drift */}
      <img src={moonImg} alt="" className="launch-moon-img" draggable={false} />

      {/* Dead Man / Red Skull bust — rises onto the moon */}
      <img src={skullImg} alt="" className="launch-skull-img" draggable={false} />

      {/* Title line — typewrites in blood red */}
      <div className="launch-line">
        <span className="typewriter">Ask what you want the most</span><span className="caret" />
      </div>

      {/* Initial flash — last to render so it sits above everything */}
      <div className="launch-flash" />

      <button className="launch-skip" onClick={skip} aria-label="Skip">Skip ▸</button>
    </div>
  );
}
