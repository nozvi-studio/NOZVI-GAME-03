// tests/core/mango.test.ts
import { describe, expect, it } from 'vitest';
import { cellBfsWall, cellReserved } from '../../src/core/cells';
import { key, reachable, nearHead } from '../../src/core/grid';
import { placeMango, rotMango, rotMsFor } from '../../src/core/mango';
import { rngFrom, seedRng, type Rng } from '../../src/core/rng';
import { createSim, restoreSim, stateOf } from '../../src/core/sim';
import type { Cell } from '../../src/core/types';
import { loadBalance } from '../support/balance';
import { buildState, QUIET } from '../support/state';

const b = loadBalance();
function scripted(choose: (pool: readonly Cell[]) => Cell, chanceResult = true) {
  const calls: string[] = [];
  const rng: Rng = {
    next: () => { calls.push('next'); return 0; }, int: () => { calls.push('int'); return 0; },
    pick<T>(arr: readonly T[]): T { calls.push('pick'); return choose(arr as readonly Cell[]) as T; },
    chance: () => { calls.push('chance'); return chanceResult; },
  };
  return { rng, calls };
}

describe('MEC-002 mango', () => {
  it('MEC-002 golden is rolled after the cell pick and only from 3 eaten', () => {
    const s2 = buildState(b, { eaten: 2 }); const a = scripted(p => p[0]!);
    placeMango(s2, b, a.rng);
    expect(a.calls).toEqual(['pick']); expect(s2.mango!.golden).toBe(false);
    const s3 = buildState(b, { eaten: 3 }); const c = scripted(p => p[0]!, true);
    placeMango(s3, b, c.rng);
    expect(c.calls).toEqual(['pick', 'chance']); expect(s3.mango!.golden).toBe(true);
    expect(s3.mango!.totalMs).toBe(3775);           // max(4000, 8000 - 450) * 0.5
  });

  it('MEC-002 a fair rot leaves a rotten rock; an unfair rot does not and may re-pick the same cell', () => {
    const fair = buildState(b, { mango: [2, 2] });
    rotMango(fair, b, rngFrom(seedRng(5)));
    expect(fair.rottenRocks).toEqual([{ x: 2, y: 2 }]);
    expect(fair.events).toEqual([{ type: 'rotted', x: 2, y: 2, leftRock: true }]);
    expect(fair.mango).not.toMatchObject({ x: 2, y: 2 });

    // Unfair: mango in the lane ahead; every cell away from the head is a rotten rock, so "good" is empty.
    const s = buildState(b, { mango: [10, 8] });
    const head = s.snake[0]!;
    for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) {
      const taken = s.snake.some(c => c.x === x && c.y === y) || (x === 10 && y === 8);
      if (!taken && !nearHead(head, s.dir, x, y, 3, 4)) s.rottenRocks.push({ x, y });
    }
    const rocks = s.rottenRocks.length;
    const pick = scripted(p => p.find(c => c.x === 10 && c.y === 8) ?? p[0]!);
    rotMango(s, b, pick.rng);
    expect(s.rottenRocks.length).toBe(rocks);
    expect(s.events).toEqual([{ type: 'rotted', x: 10, y: 8, leftRock: false }]);
    expect(s.mango).toMatchObject({ x: 10, y: 8 });
  });

  it('MEC-002 the rot timer runs in sim time', () => {
    const sim = restoreSim(b, buildState(b, { mango: [2, 2], mangoLeftMs: 5, spawnInMs: QUIET }));
    sim.advance(4); expect(sim.drainEvents()).toEqual([]);
    sim.advance(1); expect(sim.drainEvents()[0]).toEqual({ type: 'rotted', x: 2, y: 2, leftRock: true });
  });

  it('MEC-002 rot time formula', () => {
    expect(rotMsFor(b, 0, false)).toBe(8000);
    expect(rotMsFor(b, 10, false)).toBe(6500);
    expect(rotMsFor(b, 30, false)).toBe(4000);
    expect(rotMsFor(b, 4, true)).toBe(3700);
    expect(rotMsFor(b, 40, true)).toBe(2000);
  });

  it('MEC-002 createSim places a non-golden mango on a good cell', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = stateOf(createSim(b, seed));
      const m = s.mango!;
      expect(m).toMatchObject({ golden: false, totalMs: 8000 });
      const withoutMango = structuredClone(s); withoutMango.mango = null;
      expect(cellReserved(withoutMango, m.x, m.y)).toBe(false);
      expect(nearHead(s.snake[0]!, s.dir, m.x, m.y, 3, 4)).toBe(false);
      expect(reachable(17, 17, s.snake[0]!, (x, y) => cellBfsWall(s, x, y)).has(key(17, m.x, m.y))).toBe(true);
    }
  });

  it('MEC-002 placement offers only good cells when any exist', () => {
    const s = buildState(b);
    let pool: readonly Cell[] = [];
    const pick = scripted(p => { pool = p; return p[0]!; });
    expect(placeMango(s, b, pick.rng)).toBe(true);
    expect(pool).toHaveLength(273);
    const withoutMango = structuredClone(s); withoutMango.mango = null;
    for (const c of pool) {
      expect(cellReserved(withoutMango, c.x, c.y)).toBe(false);
      expect(nearHead(s.snake[0]!, s.dir, c.x, c.y, 3, 4)).toBe(false);
    }
  });

  function unfairBoard() {
    const s = buildState(b, { mango: [10, 8] });
    for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) {
      const taken = s.snake.some(c => c.x === x && c.y === y) || (x === 10 && y === 8);
      if (!taken && !nearHead(s.snake[0]!, s.dir, x, y, 3, 4)) s.rottenRocks.push({ x, y });
    }
    return s;
  }

  it('MEC-002 placement falls back to any free cell', () => {
    const s = unfairBoard();
    let pool: readonly Cell[] = [];
    placeMango(s, b, scripted(p => { pool = p; return p[0]!; }).rng);
    expect(pool).toEqual([
      { x: 8, y: 6 },
      { x: 7, y: 7 }, { x: 8, y: 7 }, { x: 9, y: 7 },
      { x: 9, y: 8 }, { x: 10, y: 8 }, { x: 11, y: 8 }, { x: 12, y: 8 },
      { x: 7, y: 9 }, { x: 8, y: 9 }, { x: 9, y: 9 },
      { x: 8, y: 10 },
    ]);
  });

  it('MEC-002 the old mango cell is not reserved for its own replacement', () => {
    const s = unfairBoard();
    let pool: readonly Cell[] = [];
    placeMango(s, b, scripted(p => { pool = p; return p[0]!; }).rng);
    expect(pool).toContainEqual({ x: 10, y: 8 });
  });

  function lastCellBoard(leftMs = 8000) {
    const s = buildState(b, { snake: [[8, 8], [7, 8], [6, 8]], mango: [9, 8], mangoLeftMs: leftMs, spawnInMs: QUIET });
    for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) {
      if (!(y === 8 && x >= 6 && x <= 9)) s.rottenRocks.push({ x, y });
    }
    return s;
  }

  it('MEC-002 eating the last free cell fills the board', () => {
    const sim = restoreSim(b, lastCellBoard());
    sim.advance(140);
    expect(sim.snapshot()).toMatchObject({ status: 'over', outcome: { won: true } });
    expect(sim.drainEvents()).toEqual([
      { type: 'ate', x: 9, y: 8, golden: false, points: 1 }, { type: 'boardFull' },
    ]);
  });

  it('MEC-002 an unfair rot on a full board re-places the mango on the same cell', () => {
    const sim = restoreSim(b, lastCellBoard(1));
    sim.advance(1);
    expect(sim.drainEvents()).toEqual([{ type: 'rotted', x: 9, y: 8, leftRock: false }]);
    expect(sim.snapshot()).toMatchObject({ mango: { x: 9, y: 8 }, status: 'playing' });
  });

  it('MEC-002 eating a golden mango scores 3 and adds 2 progress', () => {
    const sim = restoreSim(b, buildState(b, { mango: [9, 8], golden: true }));
    sim.advance(140);
    expect(sim.snapshot()).toMatchObject({ score: 3, progress: 2 });
    expect(sim.drainEvents()).toEqual([{ type: 'ate', x: 9, y: 8, golden: true, points: 3 }]);
  });

  it('MEC-002 snapshot mango ageMs = totalMs - leftMs', () => {
    const sim = restoreSim(b, buildState(b, { mango: [2, 2], mangoLeftMs: 8000 }));
    sim.advance(100);
    expect(sim.snapshot().mango).toMatchObject({ ageMs: 100, leftMs: 7900 });
  });

});
