export type SfxName = 'eat' | 'golden' | 'level' | 'land' | 'rot' | 'tick' | 'go' | 'die'
  | 'orb' | 'skillSlowmo' | 'skillSnip' | 'skillShield' | 'skillRain' | 'shieldBreak' | 'nope' | 'uiTap' | 'uiGo' | 'unlock';
export interface Synth {
  unlock(): void;
  setOn(on: boolean): void;
  play(name: SfxName): void;
  buzz(pattern: number | number[]): void;
}
type Tone = [freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay?: number];
// Prototype L254–262, including the original per-tone delays and envelope values.
const SFX: Record<SfxName, Tone[]> = {
  eat: [[520, .09, 'triangle', .14, 880]],
  golden: [[660, .1, 'triangle', .14, 990], [990, .14, 'triangle', .12, 1480, .07]],
  level: [523, 659, 784, 1046].map((f, i) => [f, .14, 'square', .05, 0, i * .08]),
  land: [[150, .14, 'sine', .12, 60]], rot: [[240, .2, 'triangle', .06, 120]],
  tick: [[700, .06, 'square', .04]], go: [[1050, .12, 'square', .05]], die: [[320, .45, 'sawtooth', .08, 50]],
  // MEC-006 §8 / MEC-007 §8 P1 synth tones.
  orb: [[880, .08, 'sine', .08, 1320]], skillSlowmo: [[600, .3, 'triangle', .1, 300]],
  skillSnip: [[900, .06, 'square', .05, 400], [500, .06, 'square', .05, 250, .06]],
  skillShield: [[440, .2, 'triangle', .1, 880]], skillRain: [[700, .1, 'sine', .08, 1000], [1000, .1, 'sine', .08, 1400, .08]],
  shieldBreak: [[200, .18, 'sawtooth', .08, 80]], nope: [[140, .12, 'square', .05]],
  uiTap: [[800, .04, 'triangle', .06]], uiGo: [[660, .1, 'triangle', .08, 1100]],
  unlock: [659, 784, 988, 1318].map((f, i) => [f, .12, 'triangle', .07, 0, i * .07]),
};

// GDD-13 tiny synth and independent haptics, ported from prototype L238–264.
export function createSynth(): Synth {
  let audio: AudioContext | null = null, on = true;
  const ac = (): AudioContext | null => {
    try {
      if (!audio) {
        const Audio = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Audio) return null;
        audio = new Audio();
      }
      if (audio.state === 'suspended') void audio.resume().catch(() => {});
      return audio;
    } catch { return null; }
  };
  const tone = ([freq, dur, type, vol, slideTo, delay]: Tone): void => {
    if (!on) return;
    const a = ac(); if (!a) return;
    try {
      const t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + .02);
    } catch { /* Audio may become unavailable after unlock. */ }
  };
  return {
    unlock: () => { ac(); }, setOn: value => { on = value; },
    play: name => { for (const t of SFX[name]) tone(t); },
    buzz: pattern => { try { navigator.vibrate?.(pattern); } catch { /* Haptics unavailable. */ } },
  };
}
