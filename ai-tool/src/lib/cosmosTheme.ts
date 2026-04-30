/**
 * CosmosTheme — 14s original cosmic / interstellar score for the Dead Man cinematic.
 *
 * 100% pure Web Audio synthesis. NO samples, NO copyrighted material.
 * Open chord progression: C major → Em → Am → Fmaj7 (Hans Zimmer "Interstellar"-style).
 *
 * Layers:
 *   - Sub-bass drone (E1) with slow LFO frequency wobble (deep space gravity)
 *   - Sawtooth pad chords with sweeping low-pass (cosmic clouds)
 *   - Crystal bell arpeggios (sine pings, descending — distant star bells)
 *   - Solar wind whoosh (filtered noise with bandpass sweep, x2)
 *   - Opening sub-rumble (60→28 Hz boom)
 *   - Pulsar pings (sparse high-frequency blips at irregular intervals)
 *   - Final climax swell (triangle perfect fifth, last 1.5s)
 */
export class CosmosTheme {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private resumeHandlers: Array<() => void> = [];

  start(durationSec: number = 14): void {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);

      const t0 = this.ctx.currentTime;
      this.scheduleCosmos(t0, durationSec);

      if (this.ctx.state === 'suspended') {
        const resume = () => { void this.ctx?.resume(); this.cleanupResumeHandlers(); };
        (['pointerdown', 'keydown', 'touchstart'] as const).forEach(ev => {
          window.addEventListener(ev, resume, { once: true, passive: true });
          this.resumeHandlers.push(() => window.removeEventListener(ev, resume));
        });
      }
    } catch {
      // silent — audio is enhancement, not critical
    }
  }

  stop(): void {
    this.cleanupResumeHandlers();
    if (this.master && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.linearRampToValueAtTime(0, now + 0.6);
      } catch { /* noop */ }
    }
    setTimeout(() => {
      try { void this.ctx?.close(); } catch { /* noop */ }
      this.ctx = null;
      this.master = null;
    }, 700);
  }

  private cleanupResumeHandlers() {
    this.resumeHandlers.forEach(fn => fn());
    this.resumeHandlers = [];
  }

  private scheduleCosmos(t0: number, dur: number) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const master = this.master;

    /* === SUB-BASS DRONE (E1 41.2Hz) — sustained, slow LFO wobble === */
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 41.2;

    const droneFM = ctx.createOscillator();
    droneFM.type = 'sine';
    droneFM.frequency.value = 0.13;
    const droneFMGain = ctx.createGain();
    droneFMGain.gain.value = 1.6;
    droneFM.connect(droneFMGain);
    droneFMGain.connect(drone.frequency);

    const droneG = ctx.createGain();
    droneG.gain.setValueAtTime(0, t0);
    droneG.gain.linearRampToValueAtTime(0.32, t0 + 2);
    droneG.gain.linearRampToValueAtTime(0.32, t0 + dur - 1.5);
    droneG.gain.linearRampToValueAtTime(0, t0 + dur);
    drone.connect(droneG); droneG.connect(master);
    drone.start(t0); droneFM.start(t0);
    drone.stop(t0 + dur + 0.5); droneFM.stop(t0 + dur + 0.5);

    /* === COSMIC PAD CHORDS: C → Em → Am → Fmaj7 === */
    const chords: number[][] = [
      [130.81, 164.81, 196.00],         // C major
      [164.81, 196.00, 246.94],         // Em
      [220.00, 261.63, 329.63],         // Am
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
    ];
    const chordDur = (dur - 2) / chords.length;
    chords.forEach((freqs, ci) => {
      const tStart = t0 + 1.5 + ci * chordDur;
      freqs.forEach(f => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(800, tStart);
        lp.frequency.linearRampToValueAtTime(1900, tStart + chordDur * 0.5);
        lp.frequency.linearRampToValueAtTime(800, tStart + chordDur);
        lp.Q.value = 2.5;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, tStart);
        g.gain.linearRampToValueAtTime(0.06, tStart + 0.8);
        g.gain.linearRampToValueAtTime(0.06, tStart + chordDur - 0.4);
        g.gain.linearRampToValueAtTime(0, tStart + chordDur);
        o.connect(lp); lp.connect(g); g.connect(master);
        o.start(tStart); o.stop(tStart + chordDur + 0.1);
      });
    });

    /* === CRYSTAL BELL ARPEGGIO (sine pings, descending per chord) === */
    const bellFreqs: number[][] = [
      [523.25, 392.00, 329.63, 261.63], // C5 G4 E4 C4
      [659.25, 493.88, 392.00, 329.63], // E5 B4 G4 E4
      [659.25, 523.25, 440.00, 329.63], // E5 C5 A4 E4
      [698.46, 523.25, 440.00, 349.23], // F5 C5 A4 F4
    ];
    chords.forEach((_, ci) => {
      const tBlockStart = t0 + 3 + ci * chordDur;
      bellFreqs[ci].forEach((f, ni) => {
        const tBell = tBlockStart + ni * 0.6;
        if (tBell > t0 + dur - 0.5) return;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, tBell);
        g.gain.linearRampToValueAtTime(0.18, tBell + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, tBell + 1.4);
        const o2 = ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.value = f * 2;
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0, tBell);
        g2.gain.linearRampToValueAtTime(0.07, tBell + 0.02);
        g2.gain.exponentialRampToValueAtTime(0.001, tBell + 0.9);
        o.connect(g); g.connect(master);
        o2.connect(g2); g2.connect(master);
        o.start(tBell); o.stop(tBell + 1.5);
        o2.start(tBell); o2.stop(tBell + 1.0);
      });
    });

    /* === SOLAR WIND WHOOSH (filtered noise, bandpass sweep) x2 === */
    [t0 + 0.5, t0 + 6.5].forEach((tWhoosh, idx) => {
      const noiseLen = idx === 0 ? 3 : 4;
      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * noiseLen, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 0.7;
      bp.frequency.setValueAtTime(200, tWhoosh);
      bp.frequency.exponentialRampToValueAtTime(2400, tWhoosh + noiseLen * 0.7);
      bp.frequency.exponentialRampToValueAtTime(150, tWhoosh + noiseLen);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, tWhoosh);
      g.gain.linearRampToValueAtTime(0.14, tWhoosh + 0.4);
      g.gain.linearRampToValueAtTime(0.14, tWhoosh + noiseLen - 0.4);
      g.gain.linearRampToValueAtTime(0, tWhoosh + noiseLen);
      noise.connect(bp); bp.connect(g); g.connect(master);
      noise.start(tWhoosh);
    });

    /* === OPENING SUB-RUMBLE (60Hz → 28Hz) === */
    const rumble = ctx.createOscillator();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(60, t0);
    rumble.frequency.exponentialRampToValueAtTime(28, t0 + 1.4);
    const rumbleG = ctx.createGain();
    rumbleG.gain.setValueAtTime(0, t0);
    rumbleG.gain.linearRampToValueAtTime(0.55, t0 + 0.2);
    rumbleG.gain.exponentialRampToValueAtTime(0.001, t0 + 2.5);
    rumble.connect(rumbleG); rumbleG.connect(master);
    rumble.start(t0); rumble.stop(t0 + 2.6);

    /* === PULSAR PINGS (sparse high blips, irregular spacing) === */
    const pulsarTimes = [4.2, 5.8, 7.4, 8.9, 10.3, 11.7, 12.6];
    pulsarTimes.forEach(dt => {
      const tP = t0 + dt;
      const pingFreq = 880 + Math.random() * 800;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = pingFreq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, tP);
      g.gain.linearRampToValueAtTime(0.08, tP + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, tP + 0.4);
      o.connect(g); g.connect(master);
      o.start(tP); o.stop(tP + 0.5);
    });

    /* === FINAL CLIMAX SWELL (perfect fifth C+G triangles, last 1.5s) === */
    const tClimax = t0 + dur - 1.5;
    const swell1 = ctx.createOscillator();
    swell1.type = 'triangle';
    swell1.frequency.value = 130.81; // C3
    const swell2 = ctx.createOscillator();
    swell2.type = 'triangle';
    swell2.frequency.value = 196.00; // G3
    const swellG = ctx.createGain();
    swellG.gain.setValueAtTime(0, tClimax);
    swellG.gain.linearRampToValueAtTime(0.18, tClimax + 0.6);
    swellG.gain.linearRampToValueAtTime(0, tClimax + 1.4);
    swell1.connect(swellG); swell2.connect(swellG); swellG.connect(master);
    swell1.start(tClimax); swell2.start(tClimax);
    swell1.stop(tClimax + 1.5); swell2.stop(tClimax + 1.5);
  }
}
