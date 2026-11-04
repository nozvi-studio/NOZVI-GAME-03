import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSave, load, save } from '../../src/meta';
import { localStore } from '../../src/game/platform/localStore';
import { createSynth } from '../../src/game/audio/synth';

afterEach(() => vi.unstubAllGlobals());
describe('GDD-8.4 browser save adapter', () => {
  it('GDD-8.4 best score and sound survive a fresh adapter using only the versioned key', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) } });
    save(localStore(), { bestScore: 12, settings: { sound: false } });
    expect(load(localStore())).toEqual({ ...defaultSave(), bestScore: 12, settings: { sound: false } });
    expect([...data.keys()]).toEqual(['mango-snake.save']);
  });
  it('GDD-8.4 blocked storage is safe on every access', () => {
    vi.stubGlobal('window', { get localStorage() { throw new Error('blocked'); } });
    expect(localStore().get('mango-snake.save')).toBeNull();
    expect(() => localStore().set('mango-snake.save', 'x')).not.toThrow();
    expect(load(localStore())).toEqual(defaultSave());
  });
});

describe('GDD-13 prototype synth and haptics', () => {
  it('GDD-13 golden chirps retain frequency, envelope, slide and delay', () => {
    const tones: unknown[][] = [];
    let resumes = 0;
    class Audio {
      currentTime = 10; state = 'suspended'; destination = {};
      resume() { resumes++; this.state = 'running'; return Promise.resolve(); }
      createOscillator() {
        const record: unknown[] = []; tones.push(record);
        return { set type(t: string) { record.push(t); },
          frequency: { setValueAtTime: (f: number, t: number) => record.push(f, t), exponentialRampToValueAtTime: (f: number, t: number) => record.push(f, t) },
          connect() {}, start: (t: number) => record.push(t), stop: (t: number) => record.push(t) };
      }
      createGain() { return { gain: { setValueAtTime: (v: number, t: number) => tones.at(-1)!.push(v, t),
        exponentialRampToValueAtTime: (v: number, t: number) => tones.at(-1)!.push(v, t) }, connect() {} }; }
    }
    vi.stubGlobal('window', { AudioContext: Audio });
    const synth = createSynth(); synth.unlock(); synth.play('golden');
    expect(resumes).toBe(1);
    expect(tones).toEqual([
      ['triangle', 660, 10, 990, 10.1, .14, 10, .0001, 10.1, 10, 10.12],
      ['triangle', 990, 10.07, 1480, 10.21, .12, 10.07, .0001, 10.21, 10.07, 10.23],
    ]);
    synth.setOn(false); synth.play('eat'); expect(tones).toHaveLength(2);
  });
  it('GDD-13 sound-off never suppresses haptics and unavailable audio never throws', () => {
    const patterns: unknown[] = [];
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { vibrate: (p: unknown) => patterns.push(p) });
    const synth = createSynth(); synth.setOn(false); synth.buzz([15, 40, 15]);
    expect(patterns).toEqual([[15, 40, 15]]);
    synth.setOn(true);
    expect(() => { synth.unlock(); synth.play('die'); }).not.toThrow();
    vi.stubGlobal('navigator', { vibrate() { throw new Error('blocked'); } });
    expect(() => synth.buzz(12)).not.toThrow();
  });
});
