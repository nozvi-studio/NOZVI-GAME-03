import { describe, it, expect } from 'vitest';
import { loadBalance } from '../support/balance';
import { exportState, restoreSim, stateOf } from '../../src/core/sim';
import { quota } from '../../src/core/level';
import { effectiveTick } from '../../src/core/skills';
import { levelUpSlowFactor, levelUpSlowTick, slowdownTier, startLevelUpSlow } from '../../src/core/slowdown';
import { circle, simFromAscii, SQUARE } from '../../src/core/testing';
import { levelTickMs } from '../../src/core/level';
import type { SimState } from '../../src/core/types';

const b = loadBalance();

describe('MEC-003-R22 level-up slowdown config', () => {
  it('MEC-003-R22 balance has tiers 6-15 x1.4 / 1000 ms and 16-30 x1.6 / 1500 ms', () => {
    expect(b.levelUpSlowdown.tiers).toEqual([
      { from: 6, to: 15, factor: 1.4, easeMs: 1000 },
      { from: 16, to: 30, factor: 1.6, easeMs: 1500 },
    ]);
  });
  it('MEC-003-R22 parseBalance rejects unsorted, overlapping, out-of-range or non-slowing tiers', () => {
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers[1].from = 15; })).toThrow(/levelUpSlowdown.tiers\[1\]/);
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers[0].from = 1; })).toThrow(/levelUpSlowdown.tiers\[0\]/);
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers[1].to = 31; })).toThrow(/levelUpSlowdown.tiers\[1\]/);
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers[0].factor = 1; })).toThrow(/levelUpSlowdown.tiers\[0\].factor/);
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers[0].easeMs = 0; })).toThrow(/levelUpSlowdown.tiers\[0\].easeMs/);
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers = []; })).not.toThrow();
  });
});

const at = (extra: Partial<SimState>, startLevel = 1): SimState => exportState(simFromAscii(b, [], {
  snake: SQUARE, quiet: true, options: { startLevel, bestLevel: 30, startEnergy: 100, loadout: ['slowmo', null] },
  extraState: { rampActive: false, ...extra },
}));

describe('MEC-003-R22 slowdown state', () => {
  it('MEC-003-R22 no slowdown for levels 2-5; x1.4 for 6 and 15; x1.6 for 16 and 30', () => {
    for (const n of [2, 3, 4, 5]) expect(slowdownTier(b, n)).toBeNull();
    for (const n of [6, 15]) expect(slowdownTier(b, n)).toEqual({ factor: 1.4, easeMs: 1000 });
    for (const n of [16, 30]) expect(slowdownTier(b, n)).toEqual({ factor: 1.6, easeMs: 1500 });
  });
  it('MEC-003-R22 startLevelUpSlow sets the tier of the current level, or null', () => {
    const s = at({ level: 6 }); startLevelUpSlow(s, b);
    expect(s.levelUpSlow).toEqual({ factor: 1.4, easeMs: 1000, leftMs: 1000 });
    s.level = 5; startLevelUpSlow(s, b); expect(s.levelUpSlow).toBeNull();
  });
  it('MEC-003-R22 curFactor falls linearly and ends exactly at easeMs', () => {
    const s = at({ level: 6, levelUpSlow: { factor: 1.4, easeMs: 1000, leftMs: 1000 } });
    expect(levelUpSlowFactor(s)).toBe(1.4);
    for (let i = 0; i < 500; i++) levelUpSlowTick(s);
    expect(levelUpSlowFactor(s)).toBeCloseTo(1.2, 12);
    expect(effectiveTick(s, b)).toBe(Math.round(levelTickMs(b, 6) * 1.2));
    for (let i = 0; i < 499; i++) levelUpSlowTick(s);
    expect(s.levelUpSlow).toEqual({ factor: 1.4, easeMs: 1000, leftMs: 1 });
    levelUpSlowTick(s);
    expect(s.levelUpSlow).toBeNull();
    expect(levelUpSlowFactor(s)).toBe(1);
    expect(effectiveTick(s, b)).toBe(levelTickMs(b, 6));
  });
  it('MEC-006-R17 Slow-mo and the slowdown do not stack: the larger factor wins', () => {
    const full = at({ level: 6, slowmo: { leftMs: 100 }, levelUpSlow: { factor: 1.4, easeMs: 1000, leftMs: 1000 } });
    expect(effectiveTick(full, b)).toBe(Math.round(levelTickMs(b, 6) * b.skills.slowmo.tickFactor));
    const high = at({ level: 16, slowmo: { leftMs: 100 }, levelUpSlow: { factor: 2, easeMs: 1000, leftMs: 1000 } });
    expect(effectiveTick(high, b)).toBe(Math.round(levelTickMs(b, 16) * 2));
    const none = at({ level: 16, slowmo: null, levelUpSlow: null });
    expect(effectiveTick(none, b)).toBe(levelTickMs(b, 16));
  });
  it('MEC-003-R22 the slowdown multiplies the MEC-008 ramp tick while the ramp is active', () => {
    const s = at({ rampActive: true, rampEaten: 0, levelUpSlow: { factor: 1.4, easeMs: 1000, leftMs: 1000 } }, 12);
    expect(effectiveTick(s, b)).toBe(Math.round(levelTickMs(b, 1) * 1.4));
  });
  it('MEC-003-R22 snapshot exposes levelUpSlow and a fresh run has none', () => {
    const sim = simFromAscii(b, [], { snake: SQUARE, quiet: true, extraState: { levelUpSlow: { factor: 1.4, easeMs: 1000, leftMs: 7 } } });
    expect(sim.snapshot().levelUpSlow).toEqual({ factor: 1.4, easeMs: 1000, leftMs: 7 });
    expect(at({}).levelUpSlow).toBeNull();
  });
  it('MEC-003-R22 the sim counts the slowdown down once per ms', () => {
    const sim = simFromAscii(b, [], { snake: SQUARE, dir: [0, 1], quiet: true,
      extraState: { level: 6, rampActive: false, levelUpSlow: { factor: 1.4, easeMs: 1000, leftMs: 3 } } });
    sim.advance(1); expect(sim.snapshot()).toMatchObject({ levelUpSlow: { leftMs: 2 }, tickMs: Math.round(levelTickMs(b, 6) * (1 + 0.4 * 2 / 1000)) });
    sim.advance(2); expect(sim.snapshot()).toMatchObject({ levelUpSlow: null, tickMs: levelTickMs(b, 6) });
  });
});

// Snake on row 8 heading right, regular mango one cell ahead, one mango short of the quota.
const upAt = (level: number, extra: Partial<SimState> = {}) => {
  const sim = simFromAscii(b, [], { snake: [[4, 8], [3, 8], [2, 8], [1, 8], [0, 8]], quiet: true,
    options: { bestLevel: 30, startEnergy: 100, loadout: ['slowmo', null] },
    extraState: { level, progress: quota(b, level) - 1, rampActive: false,
      mango: { x: 5, y: 8, golden: false, totalMs: 8000, leftMs: 8000 }, ...extra } });
  sim.advance(levelTickMs(b, level));
  return sim;
};
const curTick = (level: number, factor: number, easeMs: number, leftMs: number) =>
  Math.round(levelTickMs(b, level) * (1 + (factor - 1) * leftMs / easeMs));

describe('MEC-003-R22 slowdown at a level up', () => {
  it('MEC-003-R22 no slowdown when reaching levels 2-5', () => {
    for (const from of [1, 2, 3, 4]) {
      const sim = upAt(from); expect(stateOf(sim)).toMatchObject({ level: from + 1, levelUpSlow: null });
      sim.advance(1); expect(sim.snapshot().tickMs).toBe(levelTickMs(b, from + 1));
    }
  });
  it('MEC-003-R22 x1.4 / 1000 ms when reaching 6 and 15', () => {
    for (const from of [5, 14]) {
      const sim = upAt(from); expect(stateOf(sim).levelUpSlow).toEqual({ factor: 1.4, easeMs: 1000, leftMs: 1000 });
      sim.advance(1); expect(sim.snapshot().tickMs).toBe(curTick(from + 1, 1.4, 1000, 999));
    }
  });
  it('MEC-003-R22 x1.6 / 1500 ms when reaching 16', () => {
    const sim = upAt(15); expect(stateOf(sim).levelUpSlow).toEqual({ factor: 1.6, easeMs: 1500, leftMs: 1500 });
    sim.advance(1); expect(sim.snapshot().tickMs).toBe(curTick(16, 1.6, 1500, 1499));
  });
  it('MEC-003-R22 ease midpoint and exact end in sim time', () => {
    const sim = upAt(5);
    sim.advance(500); expect(sim.snapshot().tickMs).toBe(curTick(6, 1.4, 1000, 500));
    sim.advance(499); expect(stateOf(sim).levelUpSlow).toEqual({ factor: 1.4, easeMs: 1000, leftMs: 1 });
    sim.advance(1); expect(stateOf(sim).levelUpSlow).toBeNull();
    expect(sim.snapshot().tickMs).toBe(levelTickMs(b, 6));
  });
  it('MEC-003-R22 a level up during an active slowdown restarts it with the new tier', () => {
    const first = upAt(5); first.advance(200);
    const s = exportState(first), head = s.snake[0]!;
    expect(s.levelUpSlow!.leftMs).toBe(800);
    s.progress = quota(b, 6) - 1; s.mango = { x: head.x + 1, y: head.y, golden: false, totalMs: 8000, leftMs: 8000 };
    const sim = restoreSim(b, s);
    for (let n = 0; stateOf(sim).level === 6 && n < 400; n++) sim.advance(1);
    expect(stateOf(sim)).toMatchObject({ level: 7, levelUpSlow: { factor: 1.4, easeMs: 1000, leftMs: 1000 } });
  });
  it('MEC-006-R17 Slow-mo during a level-up slowdown uses the larger factor', () => {
    const sim = upAt(5); sim.useSkill(0); sim.advance(1);
    expect(sim.snapshot().tickMs).toBe(Math.round(levelTickMs(b, 6) * b.skills.slowmo.tickFactor));
  });
  it('MEC-003-R22 / MEC-008-R8 a level up ends the checkpoint ramp, then the slowdown multiplies the level tick', () => {
    const sim = simFromAscii(b, [], { snake: [[4, 8], [3, 8], [2, 8], [1, 8], [0, 8]], quiet: true,
      options: { startLevel: 12 }, extraState: { progress: quota(b, 12) - 1, mango: { x: 5, y: 8, golden: false, totalMs: 8000, leftMs: 8000 } } });
    sim.advance(levelTickMs(b, 1));
    expect(stateOf(sim)).toMatchObject({ level: 13, rampActive: false, levelUpSlow: { leftMs: 1000 } });
    sim.advance(1); expect(sim.snapshot().tickMs).toBe(curTick(13, 1.4, 1000, 999));
  });
  it('MEC-006-R13 a skill cast right after a level up is accepted (no busy rejection)', () => {
    const sim = upAt(5); sim.drainEvents(); sim.useSkill(0);
    const types = sim.drainEvents().map(e => e.type);
    expect(types).toContain('skillUsed'); expect(types).not.toContain('skillRejected');
  });
});
