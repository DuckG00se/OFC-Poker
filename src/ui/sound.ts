/**
 * Sound effects synthesised with the Web Audio API: no audio files to download, and they
 * work offline. The audio context is created on the first sound after a user gesture, as
 * browsers require.
 */
export type SoundName =
  | 'deal'
  | 'place'
  | 'discard'
  | 'undo'
  | 'confirm'
  | 'rowWin'
  | 'rowLose'
  | 'rowTie'
  | 'win'
  | 'lose'
  | 'push'
  | 'foul'
  | 'fantasyland'
  | 'achievement';

type AudioCtor = typeof AudioContext;

interface Tone {
  freq: number;
  /** Seconds after the sound starts. */
  at: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  /** Optional pitch glide target. */
  to?: number;
}

const RECIPES: Readonly<Record<Exclude<SoundName, 'deal' | 'place' | 'discard' | 'undo'>, readonly Tone[]>> = {
  confirm: [{ freq: 660, at: 0, dur: 0.07, type: 'sine', gain: 0.5 }, { freq: 990, at: 0.05, dur: 0.09, type: 'sine', gain: 0.4 }],
  rowWin: [{ freq: 880, at: 0, dur: 0.14, type: 'triangle', gain: 0.5 }],
  rowLose: [{ freq: 220, at: 0, dur: 0.16, type: 'triangle', gain: 0.5 }],
  rowTie: [{ freq: 440, at: 0, dur: 0.1, type: 'sine', gain: 0.3 }],
  win: [
    { freq: 523.25, at: 0, dur: 0.14, type: 'triangle' },
    { freq: 659.25, at: 0.1, dur: 0.14, type: 'triangle' },
    { freq: 783.99, at: 0.2, dur: 0.14, type: 'triangle' },
    { freq: 1046.5, at: 0.3, dur: 0.32, type: 'triangle' },
  ],
  lose: [
    { freq: 392, at: 0, dur: 0.18, type: 'triangle' },
    { freq: 311.13, at: 0.16, dur: 0.2, type: 'triangle' },
    { freq: 261.63, at: 0.34, dur: 0.36, type: 'triangle' },
  ],
  push: [{ freq: 440, at: 0, dur: 0.12, type: 'sine' }, { freq: 440, at: 0.16, dur: 0.16, type: 'sine' }],
  foul: [
    { freq: 150, at: 0, dur: 0.34, type: 'sawtooth', gain: 0.5, to: 90 },
    { freq: 157, at: 0, dur: 0.34, type: 'sawtooth', gain: 0.4, to: 95 },
  ],
  achievement: [
    { freq: 659.25, at: 0, dur: 0.1, type: 'triangle' },
    { freq: 880, at: 0.09, dur: 0.1, type: 'triangle' },
    { freq: 1318.5, at: 0.18, dur: 0.34, type: 'triangle', gain: 0.7 },
  ],
  fantasyland: [
    { freq: 783.99, at: 0, dur: 0.12, type: 'sine' },
    { freq: 987.77, at: 0.09, dur: 0.12, type: 'sine' },
    { freq: 1174.66, at: 0.18, dur: 0.12, type: 'sine' },
    { freq: 1567.98, at: 0.27, dur: 0.14, type: 'sine' },
    { freq: 1975.53, at: 0.38, dur: 0.5, type: 'sine', gain: 0.7 },
    { freq: 1567.98, at: 0.38, dur: 0.5, type: 'triangle', gain: 0.3 },
  ],
};

/** Card noises: a short burst of filtered noise. */
const SWISH: Readonly<Record<'deal' | 'place' | 'discard' | 'undo', { freq: number; dur: number; gain: number }>> = {
  deal: { freq: 2600, dur: 0.07, gain: 0.5 },
  place: { freq: 1500, dur: 0.06, gain: 0.8 },
  discard: { freq: 900, dur: 0.1, gain: 0.6 },
  undo: { freq: 2000, dur: 0.05, gain: 0.4 },
};

export class SoundEngine {
  enabled = true;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  /** Plays a sound, optionally delayed (seconds). Never throws. */
  play(name: SoundName, delay = 0): void {
    if (!this.enabled) return;
    try {
      const ctx = this.context();
      if (!ctx || !this.master) return;
      const start = ctx.currentTime + delay + 0.005;
      if (name === 'deal' || name === 'place' || name === 'discard' || name === 'undo') {
        this.swish(ctx, start, SWISH[name]);
      } else {
        for (const tone of RECIPES[name]) this.tone(ctx, start, tone);
      }
    } catch {
      // Audio is a nicety; never let it break the game.
    }
  }

  private context(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor: AudioCtor | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(ctx: AudioContext, start: number, t: Tone): void {
    if (!this.master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const peak = t.gain ?? 0.6;
    osc.type = t.type ?? 'sine';
    osc.frequency.setValueAtTime(t.freq, start + t.at);
    if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, start + t.at + t.dur);
    gain.gain.setValueAtTime(0.0001, start + t.at);
    gain.gain.exponentialRampToValueAtTime(peak, start + t.at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.at + t.dur);
    osc.connect(gain).connect(this.master);
    osc.start(start + t.at);
    osc.stop(start + t.at + t.dur + 0.02);
  }

  private swish(ctx: AudioContext, start: number, s: { freq: number; dur: number; gain: number }): void {
    if (!this.master) return;
    if (!this.noise) {
      const length = Math.floor(ctx.sampleRate * 0.2);
      this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = s.freq;
    filter.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(s.gain, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + s.dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(start);
    src.stop(start + s.dur + 0.02);
  }
}

/** The one sound engine for the app. */
export const sound = new SoundEngine();

/** Subtle vibration on devices that support it (most Android phones; not iOS Safari). */
export const vibrate = (pattern: number | number[]): void => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Unsupported or blocked: ignore.
  }
};
