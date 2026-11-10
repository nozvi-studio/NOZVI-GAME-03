import { describe, expect, it } from 'vitest';
import { isTurn, landedCells, mangoSpawnInput, newSparkleClock, sparkleStep } from '../../src/game/juice/derived';

const cell = (x: number, y: number, on = true) => ({ x, y, on, ageMs: 0 });
const hz = (type: 'rock' | 'fence' | 'maze', state: 'warn' | 'solid', t: number, cells = [cell(1, 1)]) =>
  ({ type, state, t, warnMs: 1000, lifeMs: 9000, cells }) as never;

describe('MOT-3-R9 landedCells', () => {
  it('returns the cells of the most recently landed hazard of that type, only `on` cells, capped', () => {
    const list = [hz('rock', 'solid', 5000, [cell(0, 0)]), hz('rock', 'solid', 1200, [cell(2, 2), cell(3, 2, false), cell(4, 2), cell(5, 2)]), hz('fence', 'solid', 1100, [cell(9, 9)])];
    expect(landedCells(list, 'rock', 2)).toEqual([{ x: 2, y: 2 }, { x: 4, y: 2 }]);
    expect(landedCells(list, 'fence', 4)).toEqual([{ x: 9, y: 9 }]);
  });
  it('ignores hazards still in warn and returns [] when none landed', () => {
    expect(landedCells([hz('rock', 'warn', 500)], 'rock', 4)).toEqual([]);
    expect(landedCells([], 'maze', 4)).toEqual([]);
  });
});
describe('MOT-3-R12 isTurn', () => {
  it('true only when the new direction differs from the head direction', () => {
    expect(isTurn({ x: 1, y: 0 }, 0, 1)).toBe(true);
    expect(isTurn({ x: 1, y: 0 }, 1, 0)).toBe(false);
  });
});
describe('MOT-3-R11 mangoSpawnInput', () => {
  const m = { x: 3, y: 4, golden: false };
  const ate = { type: 'ate', x: 1, y: 1, golden: false, points: 1, progressGain: 1, source: 'mango' } as never;
  const rain = { type: 'ate', x: 1, y: 1, golden: false, points: 1, progressGain: 1, source: 'rain' } as never;
  it('spawns after a mango ate / rot event, or when a mango appears from nothing', () => {
    expect(mangoSpawnInput(true, [ate], m)).toEqual({ type: 'mangoSpawned', x: 3, y: 4, golden: false });
    expect(mangoSpawnInput(true, [{ type: 'rotted', x: 0, y: 0, leftRock: true } as never], { ...m, golden: true })).toEqual({ type: 'mangoSpawned', x: 3, y: 4, golden: true });
    expect(mangoSpawnInput(false, [], m)).toMatchObject({ type: 'mangoSpawned' });
  });
  it('does not spawn without a mango, on rain eats, or on an ordinary frame', () => {
    expect(mangoSpawnInput(true, [ate], null)).toBeNull();
    expect(mangoSpawnInput(true, [rain], m)).toBeNull();
    expect(mangoSpawnInput(true, [], m)).toBeNull();
  });
});
describe('MOT-3-R13 sparkleStep', () => {
  const mg = { x: 5, y: 5 };
  it('emits one point every `everyMs` on the ring, deterministically', () => {
    const a = newSparkleClock(), b = newSparkleClock();
    const pa: unknown[] = [], pb: unknown[] = [];
    for (let i = 0; i < 20; i++) { pa.push(sparkleStep(a, 100, 700, true, mg, 0.47)); pb.push(sparkleStep(b, 100, 700, true, mg, 0.47)); }
    expect(pa).toEqual(pb);
    const pts = pa.filter(Boolean) as { x: number; y: number }[];
    expect(pts.length).toBe(2);
    for (const p of pts) expect(Math.hypot(p.x - 5, p.y - 5)).toBeCloseTo(0.47, 10);
    expect(pts[0]).not.toEqual(pts[1]);
  });
  it('is silent and resets when inactive or without a mango', () => {
    const c = newSparkleClock();
    expect(sparkleStep(c, 600, 700, true, mg, 0.47)).toBeNull();
    expect(sparkleStep(c, 600, 700, false, mg, 0.47)).toBeNull(); expect(c.acc).toBe(0);
    expect(sparkleStep(c, 800, 700, true, null, 0.47)).toBeNull();
  });
});
