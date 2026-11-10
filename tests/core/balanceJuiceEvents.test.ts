import { describe, expect, it } from 'vitest';
import { loadBalance } from '../support/balance';

const withEvents = (patch: Record<string, unknown>) => (j: any) => { j.juice.events = { ...j.juice.events, ...patch }; };

describe('MOT-3 balance.juice.events', () => {
  it('MOT-3-R3 config exposes the spec numbers', () => {
    const e = loadBalance().juice.events;
    expect(e.shieldBreakBurst).toBe(14); expect(e.ringScale).toBe(2.2); expect(e.ringMs).toBe(320); expect(e.ringMax).toBe(4);
    expect(e.shieldShakeFactor).toBe(0.4); expect(e.shieldShakeMs).toBe(160);
    expect(e.unlockPopFactor).toBe(1.2); expect(e.unlockExtraMs).toBe(140);
    expect(e.winGlowMs).toBe(1200); expect(e.winBurstCount).toBe(24); expect(e.winCornerBurst).toBe(6);
    expect(e.landDust).toBe(4); expect(e.landCellsMax).toBe(4); expect(e.landShakePx).toBe(2); expect(e.landShakeMs).toBe(120);
    expect(e.goFlashAlpha).toBe(0.2); expect(e.goFlashMs).toBe(260); expect(e.spawnPuffCount).toBe(5);
    expect(e.turnTiltDeg).toBe(10); expect(e.turnMs).toBe(140); expect(e.turnBodyBulge).toBe(1.06);
    expect(e.sparkleEveryMs).toBe(700); expect(e.sparkleLifeMs).toBe(420); expect(e.sparkleRadius).toBe(0.2); expect(e.sparkleMax).toBe(3);
    expect(e.landShakeFamilies).toEqual({ rock: true, fence: false, maze: false });
  });
  it('MOT-3-R2 rejects winGlowMs longer than the run-over hold (juice.death.totalMs)', () => {
    expect(() => loadBalance(withEvents({ winGlowMs: 1401 }))).toThrow(/juice\.events\.winGlowMs/);
  });
  it('MOT-3-R2 rejects burst counts above the particle cap', () => {
    expect(() => loadBalance(withEvents({ shieldBreakBurst: 301 }))).toThrow(/juice\.events\.shieldBreakBurst/);
    expect(() => loadBalance(withEvents({ winBurstCount: 290, winCornerBurst: 6 }))).toThrow(/juice\.events\.winBurstCount/);
    expect(() => loadBalance(withEvents({ landDust: 100, landCellsMax: 4 }))).toThrow(/juice\.events\.landDust/);
    expect(() => loadBalance(withEvents({ sparkleMax: 301 }))).toThrow(/juice\.events\.sparkleMax/);
  });
  it('MOT-3 rejects non-integer counts, negative values and scales that cannot animate', () => {
    expect(() => loadBalance(withEvents({ shieldBreakBurst: 1.5 }))).toThrow(/juice\.events\.shieldBreakBurst/);
    expect(() => loadBalance(withEvents({ landShakePx: -1 }))).toThrow(/juice\.events\.landShakePx/);
    expect(() => loadBalance(withEvents({ ringScale: 1 }))).toThrow(/juice\.events\.ringScale/);
    expect(() => loadBalance(withEvents({ turnBodyBulge: 1 }))).toThrow(/juice\.events\.turnBodyBulge/);
    expect(() => loadBalance(withEvents({ unlockPopFactor: 0.9 }))).toThrow(/juice\.events\.unlockPopFactor/);
    expect(() => loadBalance(withEvents({ landShakeFamilies: { rock: 1, fence: false, maze: false } }))).toThrow(/juice\.events\.landShakeFamilies\.rock/);
  });
});
