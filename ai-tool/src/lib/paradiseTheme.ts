/**
 * "Paradise Theme" — Web Audio synthesis of a Gangsta's Paradise-style
 * minor-key fateful theme. Pure synthesis (no sample, no copyright).
 *
 * Based on the Cm progression that gives that haunting feel:
 *   Cm  →  Eb  →  Ab  →  G  (and repeat)
 *
 * Layers:
 *   - Bass:  root note, sine + triangle, low octave
 *   - Pad:   chord triad on saw → low-pass filter, sustained
 *   - Lead:  descending arpeggio on triangle (piano-ish)
 *   - Choir: high held note (filtered noise + saw blend) for the "ahh" feel
 *   - Sub-rumble: deep cinematic boom for the launch moment
 */

export class ParadiseTheme {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private startTime = 0;
  private resumeHandlers: Array<() => void> = [];

  start(durationSec: number = 14): void {
    try {
      const Ctx: typeof AudioContext =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.0001;
      this.master.connect(this.ctx.destination);

      // Fade in / fade out the whole theme
      const t0 = this.ctx.currentTime;
      this.master.gain.setValueAtTime(0.0001, t0);
      this.master.gain.exponentialRampToValueAtTime(0.32, t0 + 1.0);
      this.master.gain.setValueAtTime(0.32, t0 + durationSec - 0.8);
      this.master.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec - 0.05);

      this.startTime = t0;
      this.scheduleSong(durationSec);

      // Browser autoplay policy: try to resume now, then on first user gesture
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
        const resume = () => {
          this.ctx?.resume().catch(() => {});
          this.resumeHandlers.forEach(fn => fn());
          this.resumeHandlers = [];
        };
        const onPtr = () => resume();
        const onKey = () => resume();
        window.addEventListener('pointerdown', onPtr, { once: true });
        window.addEventListener('keydown', onKey, { once: true });
        window.addEventListener('touchstart', onPtr, { once: true });
        this.resumeHandlers.push(() => {
          window.removeEventListener('pointerdown', onPtr);
          window.removeEventListener('keydown', onKey);
          window.removeEventListener('touchstart', onPtr);
        });
      }
    } catch {
      // audio unavailable — silent fallback
    }
  }

  stop(): void {
    if (this.ctx) {
      try {
        const t = this.ctx.currentTime;
        this.master?.gain.cancelScheduledValues(t);
        this.master?.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        const ctx = this.ctx;
        setTimeout(() => { try { ctx.close(); } catch {} }, 350);
      } catch {}
      this.ctx = null;
    }
    this.resumeHandlers.forEach(fn => fn());
    this.resumeHandlers = [];
  }

  private freq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /** Single-shot piano-like note (triangle + sine blend with decay envelope). */
  private playNote(midi: number, offset: number, dur: number, type: OscillatorType, gain: number) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = this.freq(midi);
    const t = this.startTime + offset;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env);
    env.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Sustained pad (saw → lowpass) on a chord. */
  private playPad(midiNotes: number[], offset: number, dur: number, peak = 0.07) {
    if (!this.ctx || !this.master) return;
    midiNotes.forEach(n => {
      const osc = this.ctx!.createOscillator();
      const env = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1100;
      filter.Q.value = 1.5;
      osc.type = 'sawtooth';
      osc.frequency.value = this.freq(n);
      const t = this.startTime + offset;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(peak, t + 0.55);
      env.gain.setValueAtTime(peak, t + dur - 0.45);
      env.gain.linearRampToValueAtTime(0.0001, t + dur);
      osc.connect(filter);
      filter.connect(env);
      env.connect(this.master!);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
  }

  /** Cinematic sub-rumble (low sine + filtered noise) for opening boom. */
  private playRumble(offset: number, dur: number) {
    if (!this.ctx || !this.master) return;
    const t = this.startTime + offset;

    // sub-bass sine sweep
    const osc = this.ctx.createOscillator();
    const oscEnv = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + dur);
    oscEnv.gain.setValueAtTime(0, t);
    oscEnv.gain.linearRampToValueAtTime(0.5, t + 0.15);
    oscEnv.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(oscEnv);
    oscEnv.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);

    // noise burst (white-noise buffer through low-pass filter)
    const sr = this.ctx.sampleRate;
    const noiseBuf = this.ctx.createBuffer(1, sr * dur, sr);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.7;
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 220;
    const noiseEnv = this.ctx.createGain();
    noiseEnv.gain.setValueAtTime(0, t);
    noiseEnv.gain.linearRampToValueAtTime(0.18, t + 0.1);
    noiseEnv.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseEnv);
    noiseEnv.connect(this.master);
    noise.start(t);
    noise.stop(t + dur + 0.05);
  }

  private scheduleSong(duration: number) {
    // Cinematic opening rumble — the "comet ignition"
    this.playRumble(0, 2.5);

    // 4 chords over the duration (Cm - Eb - Ab - G)
    const chordDur = duration / 4; // ~3.5s each for 14s
    const chords: Array<{ root: number; triad: number[]; lead: number[] }> = [
      { root: 36, triad: [60, 63, 67], lead: [79, 75, 72, 75, 79, 82, 79, 75] },        // Cm
      { root: 39, triad: [63, 67, 70], lead: [82, 79, 75, 79, 82, 87, 82, 79] },        // Eb
      { root: 32, triad: [56, 60, 63], lead: [75, 72, 68, 72, 75, 80, 75, 72] },        // Ab (lower)
      { root: 31, triad: [55, 59, 62], lead: [74, 71, 67, 71, 74, 79, 74, 71] },        // G  (lower)
    ];

    chords.forEach((c, i) => {
      const tBase = i * chordDur;
      // Bass — root + octave-up triangle for body
      this.playNote(c.root, tBase, chordDur * 0.95, 'sine', 0.55);
      this.playNote(c.root + 12, tBase, chordDur * 0.95, 'triangle', 0.18);
      // Bass pulse on the half-bar
      this.playNote(c.root, tBase + chordDur / 2, chordDur * 0.45, 'sine', 0.38);

      // Pad — chord triad sustained
      this.playPad(c.triad, tBase, chordDur, 0.085);

      // Lead arpeggio — 8 notes per chord, eighth-note feel
      const noteDur = chordDur / 8;
      c.lead.forEach((n, j) => {
        // First chord starts soft, builds up by chord 3-4
        const intensity = i === 0 ? 0.10 : i === 1 ? 0.14 : 0.17;
        this.playNote(n, tBase + j * noteDur, noteDur * 0.9, 'triangle', intensity);
      });

      // High choir-like drone (saw + heavy lowpass) on chord top
      this.playPad([c.triad[2] + 12], tBase, chordDur, 0.035);
    });
  }
}
