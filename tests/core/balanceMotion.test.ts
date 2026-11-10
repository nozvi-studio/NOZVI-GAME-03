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
