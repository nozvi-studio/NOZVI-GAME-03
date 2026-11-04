import { simFromAscii, circle, SQUARE } from '../../src/core/testing';
import { updateDirector } from '../../src/core/hazards/director';
// tests/core/mango.test.ts
import { describe, expect, it } from 'vitest';
import { cellBfsWall, cellReserved } from '../../src/core/cells';
import { key, reachable, nearHead } from '../../src/core/grid';
import { placeMango, rotMango, rotMsFor, rotTimeMs } from '../../src/core/mango';
import { rngFrom, seedRng, type Rng } from '../../src/core/rng';
import { createSim, exportState, restoreSim, simFromState } from '../../src/core/sim';
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
    const fair = buildState(b, { mango: [2, 2], level: 12 });
    rotMango(fair, b, rngFrom(seedRng(5)));
    expect(fair.rottenRocks).toEqual([{ family: 'rottenRock', x: 2, y: 2, state: 'solid', leftMs: 5000 }]);
    expect(fair.events).toEqual([{ type: 'rotted', x: 2, y: 2, leftRock: true }]);
    expect(fair.mango).not.toMatchObject({ x: 2, y: 2 });

    // Unfair: mango in the lane ahead; every cell away from the head is a rotten rock, so "good" is empty.
    const s = buildState(b, { mango: [10, 8] });
    const head = s.snake[0]!;
    for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) {
      const taken = s.snake.some(c => c.x === x && c.y === y) || (x === 10 && y === 8);
      if (!taken && !nearHead(head, s.dir, x, y, 3, 4)) s.rottenRocks.push({ family: 'rottenRock', x, y, state: 'solid', leftMs: b.mango.rottenRockLifeMs });
    }
    const rocks = s.rottenRocks.length;
    const pick = scripted(p => p.find(c => c.x === 10 && c.y === 8) ?? p[0]!);
    rotMango(s, b, pick.rng);
    expect(s.rottenRocks.length).toBe(rocks);
    expect(s.events).toEqual([{ type: 'rotted', x: 10, y: 8, leftRock: false }]);
    expect(s.mango).toMatchObject({ x: 10, y: 8 });
  });

  it('MEC-002 the rot timer runs in sim time', () => {
    const sim = restoreSim(b, buildState(b, { mango: [2, 2], mangoLeftMs: 5, level: 12, spawnInMs: QUIET }));
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
      const s = exportState(createSim(b, seed));
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
      if (!taken && !nearHead(s.snake[0]!, s.dir, x, y, 3, 4)) s.rottenRocks.push({ family: 'rottenRock', x, y, state: 'solid', leftMs: b.mango.rottenRockLifeMs });
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
      if (!(y === 8 && x >= 6 && x <= 9)) s.rottenRocks.push({ family: 'rottenRock', x, y, state: 'solid', leftMs: b.mango.rottenRockLifeMs });
    }
    return s;
  }

  it('MEC-001-R10 eating the last free cell leaves an empty mango slot without winning', () => {
    const sim = restoreSim(b, lastCellBoard());
    sim.advance(140);
    expect(sim.snapshot()).toMatchObject({ status: 'playing', outcome: null, mango: null });
    expect(sim.drainEvents()).toEqual([
      { type: 'ate', x: 9, y: 8, golden: false, points: 1, progressGain: 1, source: 'mango' },
      { type: 'mangoDeferred' },
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
    expect(sim.drainEvents()).toEqual([
      { type: 'ate', x: 9, y: 8, golden: true, points: 3, progressGain: 2, source: 'mango' },
      { type: 'energyChanged', energy: 10, delta: 10, source: 'golden' },
    ]);
  });

  it('MEC-002 snapshot mango ageMs = totalMs - leftMs', () => {
    const sim = restoreSim(b, buildState(b, { mango: [2, 2], mangoLeftMs: 8000 }));
    sim.advance(100);
    expect(sim.snapshot().mango).toMatchObject({ ageMs: 100, leftMs: 7900 });
  });

});

const rotSim = (level: number, x: number, y: number) => simFromAscii(b, [], {
  snake: [[2, 2], [1, 2], [0, 2], [0, 3]], quiet: true, options: { startLevel: level },
  extraState: { mango: { x, y, golden: false, leftMs: 1, totalMs: 8000 } },
});
function deferred() {
  // Reserve even the starting snake's cells: otherwise its tail frees retry candidates.
  return simFromAscii(b, ['wwwwM' + 'w'.repeat(12), ...Array<string>(16).fill('w'.repeat(17))], {
    snake: [[3, 0], [2, 0], [1, 0], [0, 0]], quiet: true,
  });
}

describe('MEC-002 P1 mango rules', () => {
  it('MEC-002-R4 rot time uses eatenInLevel: 8000 at level start, 7550 after 3, golden half', () => {
    expect([rotTimeMs(b, 0, false), rotTimeMs(b, 3, false), rotTimeMs(b, 0, true), rotTimeMs(b, 3, true)]).toEqual([8000, 7550, 4000, 3775]);
    const fractional = loadBalance(j => { j.mango.goldenRotFactor = 0.333; });
    expect(rotTimeMs(fractional, 3, true)).toBe(2514);
  });

  it('MEC-002-R6 rot below L12 leaves no rock; at L12 a fair rot leaves a rock; unfair rot leaves none', () => {
    const low = rotSim(11, 12, 12); low.advance(1);
    expect(low.drainEvents()[0]).toEqual({ type: 'rotted', x: 12, y: 12, leftRock: false });
    const fair = rotSim(12, 12, 12); fair.advance(1);
    expect(fair.drainEvents()[0]).toEqual({ type: 'rotted', x: 12, y: 12, leftRock: true });
    expect(fair.snapshot().rottenRocks).toEqual([{ x: 12, y: 12, state: 'solid', leftMs: 5000 }]);
    expect(fair.snapshot().mango).not.toBeNull();
    expect(fair.snapshot().mango).not.toMatchObject({ x: 12, y: 12 });
    const unfair = rotSim(12, 4, 2); unfair.advance(1);
    expect(unfair.drainEvents()[0]).toMatchObject({ type: 'rotted', leftRock: false });
  });

  it('MEC-002-R7 rotten rock is solid 5000 ms, crumbles 450 ms, then is removed', () => {
    const sim = simFromAscii(b, [], { snake: SQUARE, dir: [0, 1], quiet: true, options: { startLevel: 12 },
      extraState: { rottenRocks: [{ family: 'rottenRock', x: 10, y: 10, state: 'solid', leftMs: 5000 }] } });
    circle(sim, 4999); expect(sim.snapshot().rottenRocks[0]).toMatchObject({ state: 'solid', leftMs: 1 });
    circle(sim, 1); expect(sim.snapshot().rottenRocks[0]).toMatchObject({ state: 'crumble', leftMs: 450 });
    circle(sim, 449); expect(sim.snapshot().rottenRocks[0]).toMatchObject({ state: 'crumble', leftMs: 1 });
    circle(sim, 1); expect(sim.snapshot().rottenRocks).toEqual([]);
  });

  it('MEC-002-R1 first mango is reachable and not near the head', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = exportState(createSim(b, seed)), m = s.mango!;
      expect(nearHead(s.snake[0]!, s.dir, m.x, m.y, 3, b.fairness.frontLaneCells)).toBe(false);
      expect(reachable(b.board.cols, b.board.rows, s.snake[0]!, (x, y) => cellBfsWall(s, x, y)).has(key(b.board.cols, m.x, m.y))).toBe(true);
    }
  });

  it.each([false, true])('MEC-002-R3 regular mango increments eatenInLevel and eatenInRun; both start at 0 at a checkpoint start (golden %s)', golden => {
    expect(createSim(b, 1, { startLevel: 12 }).snapshot()).toMatchObject({ eatenInLevel: 0, eatenInRun: 0 });
    const sim = simFromAscii(b, [golden ? '.....G' : '.....M'], { snake: [[4, 0], [3, 0], [2, 0], [1, 0]], quiet: true, options: { startLevel: 12 } });
    sim.advance(140);
    expect(sim.snapshot()).toMatchObject({ eatenInLevel: 1, eatenInRun: 1 });
    expect(sim.drainEvents()[0]).toMatchObject({ type: 'ate', progressGain: golden ? 2 : 1, source: 'mango' });
    const s = exportState(sim); s.progress = sim.snapshot().need - 1;
    s.mango = { x: 6, y: 0, golden: false, leftMs: 8000, totalMs: 8000 };
    const next = simFromState(b, s); next.advance(136);
    expect(next.snapshot()).toMatchObject({ level: 13, eatenInLevel: 0, eatenInRun: 2 });
  });

  it('MEC-002-R4 rot time returns to 8000 after a level up', () => {
    const sim = simFromAscii(b, ['.....M'], { snake: [[4, 0], [3, 0], [2, 0], [1, 0]], quiet: true,
      extraState: { progress: 3, eatenInLevel: 3, eatenInRun: 0 } });
    sim.advance(140);
    expect(sim.snapshot()).toMatchObject({ level: 2, mango: { totalMs: 8000, ageMs: 0 } });
  });

  it('MEC-002-R5 no golden before 3 regular mangoes in the run, also at a checkpoint start', () => {
    for (let eatenInRun = 0; eatenInRun <= 3; eatenInRun++) {
      let gold = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const s = exportState(createSim(b, seed, { startLevel: 12 })); s.eatenInRun = eatenInRun;
        placeMango(s, b, rngFrom(s.rng)); gold += Number(s.mango!.golden);
      }
      if (eatenInRun < 3) expect(gold).toBe(0);
      else { expect(gold).toBeGreaterThanOrEqual(10); expect(gold).toBeLessThanOrEqual(60); }
    }
  });

  it.each(['solid', 'crumble'] as const)('MEC-002-R7 rotten rock kills with cause rotten only while solid: %s', state => {
    const sim = simFromAscii(b, ['.....R'], { snake: [[4, 0], [3, 0], [2, 0], [1, 0]], quiet: true,
      extraState: { rottenRocks: [{ family: 'rottenRock', x: 5, y: 0, state, leftMs: 5000 }] } });
    sim.advance(140);
    if (state === 'solid') expect(sim.drainEvents()).toContainEqual({ type: 'died', cause: 'rotten', x: 4, y: 0 });
    else { expect(sim.snapshot().snake[0]).toEqual({ x: 5, y: 0 }); expect(sim.snapshot().status).toBe('playing'); }
  });

  it('MEC-002-R9 no candidate defers the mango, emits mangoDeferred once, retries every 250 ms', () => {
    const sim = deferred(); sim.advance(140);
    expect(sim.drainEvents().filter(e => e.type === 'mangoDeferred')).toEqual([{ type: 'mangoDeferred' }]);
    expect(sim.snapshot().mango).toBeNull(); const rng = exportState(sim).rng;
    sim.advance(249); expect(exportState(sim).retryMs).toBe(249);
    sim.advance(1); expect(exportState(sim).retryMs).toBe(0);
    expect(sim.drainEvents()).toEqual([]); expect(exportState(sim).rng).toEqual(rng);
    const s = exportState(sim); s.hazards = s.hazards.filter(h => !h.cells.some(c => c.x === 16 && c.y === 16));
    const next = simFromState(b, s); next.advance(249); expect(next.snapshot().mango).toBeNull();
    next.advance(1); expect(next.snapshot().mango).toMatchObject({ x: 16, y: 16, ageMs: 0 });
    expect(next.drainEvents()).toEqual([]);
  });

  it('MEC-001-R10 failed mango placement does not end the run and the snake keeps moving', () => {
    const sim = deferred(); sim.advance(560);
    expect(sim.snapshot()).toMatchObject({ status: 'playing', mango: null });
    expect(sim.snapshot().snake[0]).toEqual({ x: 7, y: 0 });
  });

  it('MEC-003-R13 director does not spawn while no mango is on the board', () => {
    const s = exportState(deferred()); s.mango = null; s.spawnInMs = -1;
    const before = structuredClone(s);
    for (let ms = 0; ms < 3000; ms++) updateDirector(s, b, rngFrom(s.rng));
    expect(s.hazards).toEqual(before.hazards); expect(s.spawnInMs).toBe(-1); expect(s.rng).toEqual(before.rng);
  });

  it('MEC-002-EC1 mango rotting the ms the head would enter it leaves no rock', () => {
    const sim = rotSim(12, 3, 2), s = exportState(sim); s.acc = 139;
    const next = simFromState(b, s); next.advance(1);
    expect(next.drainEvents()).toEqual([{ type: 'rotted', x: 3, y: 2, leftRock: false }]);
    expect(next.snapshot()).toMatchObject({ status: 'playing', snake: [{ x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }] });
  });
});
