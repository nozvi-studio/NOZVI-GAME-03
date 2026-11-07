import { describe, expect, it } from 'vitest';
import { SFX_TONES, type SfxName } from '../../src/game/audio/synth';
const end = (n: SfxName) => Math.max(...SFX_TONES[n].map(([, dur, , , , delay]) => (delay ?? 0) + dur));
describe('P3a-R3/R5/R6 new SFX', () => {
  it('every sound id has at least one tone and ends within 1.2 s', () => {
    for (const name of Object.keys(SFX_TONES) as SfxName[]) {
      expect(SFX_TONES[name].length, name).toBeGreaterThan(0);
      expect(end(name), name).toBeLessThanOrEqual(1.2);
      for (const [f, d, , v] of SFX_TONES[name]) { expect(f).toBeGreaterThan(0); expect(d).toBeGreaterThan(0); expect(v).toBeGreaterThan(0); expect(v).toBeLessThanOrEqual(0.15); }
    }
  });
  it('the four skill casts are distinct from each other', () => {
    const ids: SfxName[] = ['skillSlowmo', 'skillSnip', 'skillShield', 'skillRain'];
    expect(new Set(ids.map(i => JSON.stringify(SFX_TONES[i]))).size).toBe(4);
  });
  it('biome jingle is longer than the level arpeggio; the checkpoint fanfare starts after the arpeggio ends', () => {
    expect(end('biome')).toBeGreaterThan(end('level'));
    const firstFanfare = Math.min(...SFX_TONES.checkpoint.map(([, , , , , d]) => d ?? 0));
    expect(firstFanfare).toBeGreaterThanOrEqual(end('level'));
  });
  it('energy orb is a soft two-stage zap', () => { expect(SFX_TONES.orb.length).toBe(2); expect(SFX_TONES.orb[0]![3]).toBeLessThanOrEqual(0.08); });
});
