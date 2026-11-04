import { restoreSim, stateOf } from '../../src/core/sim';
import { buildState, QUIET } from '../support/state';
import { describe, it, expect } from 'vitest';
import { biome, isChallenge, quota, levelTickMs, directorIntervalMs, smallHazardCap, familyRow, enabledFamilies, introducedAt, createSim, fenceFirstLevel } from '../../src/core';
import { loadBalance } from '../support/balance';
const b = loadBalance();
const L = Array.from({ length: 30 }, (_, i) => i + 1);
describe('MEC-003 level formulas', () => {
  it('MEC-003-R1 biome of L1 L5 L6 L30 is 1 1 2 6 and challenge levels are 5 10 15 20 25 30', () => {
    expect([1, 5, 6, 30].map(n => biome(b, n))).toEqual([1, 1, 2, 6]);
    expect(L.filter(n => isChallenge(b, n))).toEqual([5, 10, 15, 20, 25, 30]);
  });
  it('MEC-003-R2 quota L1 is 4, L30 is 13, total is 255', () => {
    expect([quota(b, 1), quota(b, 30)]).toEqual([4, 13]);
    expect(L.reduce((s, n) => s + quota(b, n), 0)).toBe(255);
  });
  it('MEC-003-R4 with P1 config interval L1 4880, L29 1600, L30 1600; cap L1 2, L29 10, L30 10', () => {
    expect([1, 29, 30].map(n => directorIntervalMs(b, n))).toEqual([4880, 1600, 1600]);
    expect([1, 29, 30].map(n => smallHazardCap(b, n))).toEqual([2, 10, 10]);
  });
  it('MEC-003-R4 with factor 0.8 and bonus 2 (test balance) challenge L30 is 1280 ms and cap 12, L29 unchanged', () => {
    const p2 = loadBalance(j => { j.director.challengeIntervalFactor = 0.8; j.director.challengeCapBonus = 2; });
    expect([directorIntervalMs(p2, 30), smallHazardCap(p2, 30)]).toEqual([1280, 12]);
    expect([directorIntervalMs(p2, 29), smallHazardCap(p2, 29)]).toEqual([1600, 10]);
  });
  it('MEC-003-R15 L1 spawns only single rocks; maze never spawns before L26', () => {
    expect(familyRow(b, 1).rockShapes).toEqual(['single']);
    expect(enabledFamilies(b, 1)).toEqual(['rock']);
    expect(L.filter(n => enabledFamilies(b, n).includes('maze'))[0]).toBe(26);
    expect(L.map(n => introducedAt(b, n)).filter(Boolean)).toEqual(['rock', 'fence', 'terrain', 'rottenRock', 'maze']);
  });
});

it('MEC-003-R3 tick L1 is 140 ms and L30 is 82 ms', () => {
  expect([1, 2, 30].map(n => levelTickMs(b, n))).toEqual([140, 138, 82]);
  expect(levelTickMs(b, 100)).toBe(82);
});
it('MEC-003-R17 familyRow enables rottenRocks from L12 only', () => {
  expect(L.filter(n => familyRow(b, n).rottenRocks)).toEqual(L.slice(11));
});
it('MEC-003-R14 table rows must cover 1..30 without gaps or overlaps', () => {
  expect(() => loadBalance(j => j.level.table[1].from = 4)).toThrow(/level.table/);
  expect(() => loadBalance(j => j.level.table[0].to = 3)).toThrow(/level.table/);
});
it('MEC-003-R14 unknown family key or shape name fails parseBalance', () => {
  expect(() => loadBalance(j => j.level.table[0].weights.lava = 1)).toThrow(/level.table/);
  expect(() => loadBalance(j => j.level.table[0].rockShapes = ['star'])).toThrow(/level.table/);
  expect(() => loadBalance(j => j.level.table[3].fenceShapes = ['star'])).toThrow(/level.table/);
});
it('MEC-003-R16 parseBalance rejects a level that introduces two families', () => {
  expect(() => loadBalance(j => j.level.table[5].rottenRocks = true)).toThrow(/introduces/);
});
it('MEC-003-R7 balance has no level.transitionMs (no level-up freeze; banner uses ui.bannerMs)', () => {
  const b = loadBalance();
  expect('transitionMs' in b.level).toBe(false);
  expect(b.ui.bannerMs).toBeGreaterThan(0);
});
it('MEC-001-R6 parseBalance rejects start.length greater than minLength + 1', () => {
  expect(() => loadBalance(j => j.snake.start.push([4, 8]))).toThrow(/snake.start/);
});
it('MEC-003-R1 sim level is 1-based', () => {
  expect(createSim(b, 1).snapshot()).toMatchObject({level: 1, need: 4, tickMs: 140});
});
it('MEC-003 section 7 createSim validates startLevel', () => {
  for (const startLevel of [0, 31, 2.5]) expect(() => createSim(b, 1, {startLevel})).toThrow(RangeError);
  expect(createSim(b, 1, {startLevel: 12}).snapshot()).toMatchObject({level: 12, need: 7, tickMs: 140});
});
it('MEC-003-R15 fenceFirstLevel follows the family table', () => { expect(fenceFirstLevel(b)).toBe(6); });
  it('MEC-003-R5 golden progress overflow carries into the next level', () => {
    const sim = restoreSim(b, buildState(b, { progress: 3, golden: true, mango: [9, 8], spawnInMs: QUIET }));
    sim.advance(140);
    expect(sim.snapshot()).toMatchObject({ level: 2, progress: 1 });
  });

  it('MEC-003-R6 max level wins when its quota is cleared', () => {
    const sim = restoreSim(b, { ...buildState(b, { level: 30, progress: 12, mango: [9, 8], spawnInMs: QUIET }), rampActive: false });
    sim.advance(82);
    expect(sim.snapshot()).toMatchObject({ level: 30, progress: 13, status: 'over', outcome: { won: true } });
    expect(sim.drainEvents()).toEqual([{ type: 'ate', x: 9, y: 8, golden: false, points: 1, progressGain: 1, source: 'mango' }, { type: 'runWon', score: 1, timeMs: 82 }]);
  });

  it('MEC-003-R7 eating selects the next level speed from the next step', () => {
    const sim = restoreSim(b, buildState(b, { progress: 3, mango: [9, 8], spawnInMs: QUIET }));
    sim.advance(140);
    expect(stateOf(sim).level).toBe(2);
    expect(stateOf(sim).tickMs).toBe(140); // MEC-008-R9 keeps the eating step's tick.
    expect(sim.drainEvents()).toEqual([
      { type: 'ate', x: 9, y: 8, golden: false, points: 1, progressGain: 1, source: 'mango' },
      { type: 'shrunk', from: 5, to: 4, removed: [{ x: 5, y: 8 }] },
      { type: 'levelUp', level: 2, biome: 1, challenge: false, biomeChanged: false, clearedLevelTimeMs: 140 },
    ]);
    sim.advance(1);
    expect(stateOf(sim).tickMs).toBe(138);
  });
