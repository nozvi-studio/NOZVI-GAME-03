import { describe, expect, it } from 'vitest';
import { loadBalance } from '../support/balance';

const withMotion = (patch: Record<string, unknown>) => (j: any) => { j.motion = { ...j.motion, ...patch }; };

describe('MOT-0 balance.motion', () => {
  it('MOT-0 config exposes every balance.motion key', () => {
    const m = loadBalance().motion;
    expect(m.tapDownMs).toBe(80); expect(m.pressScale).toBe(0.94); expect(m.releaseOvershoot).toBe(1.06);
    expect(m.maxTweens).toBe(40); expect(m.reducedPressAlpha).toBe(0.85);
  });
  it('MOT-0 rejects releaseOvershoot <= 1 and pressScale >= 1', () => {
    expect(() => loadBalance(withMotion({ releaseOvershoot: 1 }))).toThrow(/motion\.releaseOvershoot/);
    expect(() => loadBalance(withMotion({ pressScale: 1 }))).toThrow(/motion\.pressScale/);
  });
  it('MOT-0 rejects staggerCapMs < staggerMs, telegraphHzEnd <= Start, disabledAlpha >= 1, idleBreathAmp >= pulseAmp', () => {
    expect(() => loadBalance(withMotion({ staggerCapMs: 10 }))).toThrow(/motion\.staggerCapMs/);
    expect(() => loadBalance(withMotion({ telegraphHzEnd: 2 }))).toThrow(/motion\.telegraphHzEnd/);
    expect(() => loadBalance(withMotion({ disabledAlpha: 1 }))).toThrow(/motion\.disabledAlpha/);
    expect(() => loadBalance(withMotion({ idleBreathAmp: 0.05 }))).toThrow(/motion\.idleBreathAmp/);
  });
  it('MOT-0 rejects resultsSeqMs shorter than 200 + countUpMs + popInMs and non-positive numbers', () => {
    expect(() => loadBalance(withMotion({ resultsSeqMs: 500 }))).toThrow(/motion\.resultsSeqMs/);
    expect(() => loadBalance(withMotion({ tapUpMs: 0 }))).toThrow(/motion\.tapUpMs/);
  });
});

describe('MOT-4 balance.motion', () => {
  it('MOT-4 config exposes the telegraph and HUD keys', () => {
    const m = loadBalance().motion;
    expect(m.telegraphHzStart).toBe(2); expect(m.telegraphHzEnd).toBe(6); expect(m.telegraphAlphaMin).toBe(0.55);
    expect(m.telegraphUrgentMs).toBe(300); expect(m.hudTickMs).toBe(360); expect(m.energyLowFrac).toBe(0.2);
    expect(m.digitPopScale).toBe(1.2); expect(m.readyDipMs).toBe(80);
  });
  it('MOT-4 rejects telegraphAlphaMin outside (0, 1), digitPopScale outside (1, 2), telegraphSnapScale outside (1, 2)', () => {
    expect(() => loadBalance(withMotion({ telegraphAlphaMin: 0 }))).toThrow(/motion\.telegraphAlphaMin/);
    expect(() => loadBalance(withMotion({ telegraphAlphaMin: 1 }))).toThrow(/motion\.telegraphAlphaMin/);
    expect(() => loadBalance(withMotion({ digitPopScale: 1 }))).toThrow(/motion\.digitPopScale/);
    expect(() => loadBalance(withMotion({ digitPopScale: 2 }))).toThrow(/motion\.digitPopScale/);
    expect(() => loadBalance(withMotion({ telegraphSnapScale: 1 }))).toThrow(/motion\.telegraphSnapScale/);
  });
  it('MOT-4 rejects non-positive telegraph and HUD durations', () => {
    for (const k of ['telegraphHzStart', 'telegraphUrgentMs', 'telegraphSnapMs', 'digitPopMs', 'hudTickMs', 'barEaseMs', 'barSpendMs', 'readyDipMs'])
      expect(() => loadBalance(withMotion({ [k]: 0 }))).toThrow(new RegExp(`motion\\.${k}`));
  });
});

describe('D3-R23 balance.motion.d3', () => {
  const withD3 = (patch: Record<string, number>) => (j: any) => { j.motion.d3 = { ...j.motion.d3, ...patch }; };
  it('D3-R23 motion.d3 holds the touch feedback numbers', () => {
    const d = loadBalance().motion.d3;
    expect(d.burstMs).toBe(220); expect(d.burstFromScale).toBe(0.6); expect(d.burstToScale).toBe(1.4);
    expect(d.burstSparks).toBe(6); expect(d.burstMaxParticles).toBe(24);
    expect(d.shakeCycles).toBe(3); expect(d.shakePx).toBe(6); expect(d.shakeMs).toBe(240);
  });
  it('D3-R23 motion.d3 cross-field rules reject bad values', () => {
    expect(() => loadBalance(withD3({ burstToScale: 0.5 }))).toThrow(/motion\.d3\.burstToScale/);
    expect(() => loadBalance(withD3({ burstSparks: 30 }))).toThrow(/motion\.d3\.burstSparks/);
    expect(() => loadBalance(withD3({ burstSparkEndScale: 1.2 }))).toThrow(/motion\.d3\.burstSparkEndScale/);
  });
});
