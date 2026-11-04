// tests/qa/task4-mango-placement.qa.test.ts — black-box QA tests for Task 4 mango placement & golden chance
import { describe, expect, it } from 'vitest';
import type { Cell } from '../../src/core';
import { createSim, restoreSim, stateOf } from '../../src/core/sim';
import { nearHead } from '../../src/core/grid';
import { placeMango, rotMsFor } from '../../src/core/mango';
import type { Rng } from '../../src/core/rng';
import { loadBalance } from '../support/balance';
import { buildState, QUIET } from '../support/state';

function scriptedRng(choose: (pool: readonly Cell[]) => Cell, chanceResult = false) {
  const calls: string[] = [];
  const rng: Rng = {
    next: () => { calls.push('next'); return 0; },
    int: () => { calls.push('int'); return 0; },
    pick<T>(arr: readonly T[]): T {
      calls.push('pick');
      return choose(arr as readonly Cell[]) as T;
    },
    chance: () => {
      calls.push('chance');
      return chanceResult;
    },
  };
  return { rng, calls };
}

describe('QA Task 4: Mango Placement & Golden Chance (Black-Box)', () => {
  const b = loadBalance();

  it('QA-T4-01 candidate pool only contains free non-reserved cells', () => {
    // Spec: design §5 MEC-002: "Reserved = snake, rotten rock, any hazard cell in any state,
    // any terrain cell, the mango if present. Candidates: every cell not reserved."
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      rottenRocks: [[2, 2]],
      spawnInMs: QUIET,
    });
    let recordedPool: readonly Cell[] = [];
    const { rng } = scriptedRng((pool) => {
      recordedPool = pool;
      return pool[0]!;
    });
    const placed = placeMango(s, b, rng);

    expect(placed).toBe(true);
    // Reserved cells must never appear in the candidate pool
    expect(recordedPool).not.toContainEqual({ x: 8, y: 8 });
    expect(recordedPool).not.toContainEqual({ x: 7, y: 8 });
    expect(recordedPool).not.toContainEqual({ x: 6, y: 8 });
    expect(recordedPool).not.toContainEqual({ x: 2, y: 2 });
  });

  it('QA-T4-02 placement prefers good cells that are reachable and not near head', () => {
    // Spec: design §5 MEC-002: "'Good' = also reachable (BFS) and not near the head with distance 3.
    // Pick from good, else from any"
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
    });
    let recordedPool: readonly Cell[] = [];
    const { rng } = scriptedRng((pool) => {
      recordedPool = pool;
      return pool[0]!;
    });
    placeMango(s, b, rng);

    // 289 cells - 3 snake cells - 12 free near-head cells = 274 good cells
    expect(recordedPool).toHaveLength(274);
    const head = s.snake[0]!;
    for (const c of recordedPool) {
      expect(nearHead(head, s.dir, c.x, c.y, b.mango.nearHeadDist, b.fairness.frontLaneCells)).toBe(false);
    }
  });

  it('QA-T4-03 placement falls back to any candidate when good set is empty', () => {
    // Spec: design §5 MEC-002: "Pick from good, else from any; if both are empty, placement fails."
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
    });
    const head = s.snake[0]!;
    // Fill all good cells (not near head) with rotten rocks
    for (let y = 0; y < b.board.rows; y++) {
      for (let x = 0; x < b.board.cols; x++) {
        const isSnake = s.snake.some((c) => c.x === x && c.y === y);
        if (!isSnake && !nearHead(head, s.dir, x, y, b.mango.nearHeadDist, b.fairness.frontLaneCells)) {
          s.rottenRocks.push({ x, y });
        }
      }
    }
    let recordedPool: readonly Cell[] = [];
    const { rng } = scriptedRng((pool) => {
      recordedPool = pool;
      return pool[0]!;
    });
    const placed = placeMango(s, b, rng);

    expect(placed).toBe(true);
    // Pool must fall back to the 12 free near-head cells
    expect(recordedPool).toHaveLength(12);
    for (const c of recordedPool) {
      expect(nearHead(head, s.dir, c.x, c.y, b.mango.nearHeadDist, b.fairness.frontLaneCells)).toBe(true);
    }
  });

  it('QA-T4-04 old mango cell is cleared before candidate scan allowing re-pick', () => {
    // Spec: design §5 MEC-002: "Placement first clears the current mango (L382), then scans (L386),
    // so the old mango cell is not reserved for mango placement"
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [10, 8],
    });
    const head = s.snake[0]!;
    for (let y = 0; y < b.board.rows; y++) {
      for (let x = 0; x < b.board.cols; x++) {
        const isSnake = s.snake.some((c) => c.x === x && c.y === y);
        const isOldMango = x === 10 && y === 8;
        if (!isSnake && !isOldMango && !nearHead(head, s.dir, x, y, b.mango.nearHeadDist, b.fairness.frontLaneCells)) {
          s.rottenRocks.push({ x, y });
        }
      }
    }
    let recordedPool: readonly Cell[] = [];
    const { rng } = scriptedRng((pool) => {
      recordedPool = pool;
      return pool[0]!;
    });
    placeMango(s, b, rng);

    expect(recordedPool).toContainEqual({ x: 10, y: 8 });
  });

  it('QA-T4-05 createSim places initial non-golden mango on good cell', () => {
    // Spec: design §5 MEC-002: initial mango placed, golden only from 3 eaten
    for (let seed = 1; seed <= 10; seed++) {
      const sim = createSim(b, seed);
      const snap = sim.snapshot();

      expect(snap.mango).not.toBeNull();
      expect(snap.mango!.golden).toBe(false);
      expect(snap.mango!.totalMs).toBe(b.mango.rotBaseMs);
      expect(snap.mango!.leftMs).toBe(b.mango.rotBaseMs);
      expect(snap.mango!.ageMs).toBe(0);
      expect(nearHead(snap.snake[0]!, snap.dir, snap.mango!.x, snap.mango!.y, b.mango.nearHeadDist, b.fairness.frontLaneCells)).toBe(false);
    }
  });

  it('QA-T4-06 golden roll gated by eaten >= 3 skips chance roll below threshold', () => {
    // Spec: design §5 MEC-002: "Golden: rolled after the cell pick, only when eaten >= 3 (no RNG call below 3)"
    for (let eaten = 0; eaten < 3; eaten++) {
      const s = buildState(b, { eaten });
      const { rng, calls } = scriptedRng((pool) => pool[0]!, true);
      placeMango(s, b, rng);

      expect(calls).toEqual(['pick']);
      expect(s.mango!.golden).toBe(false);
    }
  });

  it('QA-T4-07 golden roll after cell pick rolls chance when eaten >= 3', () => {
    // Spec: design §5 MEC-002: "Golden: rolled after the cell pick, only when eaten >= 3 ... with chance 0.15"
    const sWin = buildState(b, { eaten: 3 });
    const win = scriptedRng((pool) => pool[0]!, true);
    placeMango(sWin, b, win.rng);

    expect(win.calls).toEqual(['pick', 'chance']);
    expect(sWin.mango!.golden).toBe(true);
    expect(sWin.mango!.totalMs).toBe(3775); // max(4000, 8000 - 450) * 0.5

    const sLose = buildState(b, { eaten: 3 });
    const lose = scriptedRng((pool) => pool[0]!, false);
    placeMango(sLose, b, lose.rng);

    expect(lose.calls).toEqual(['pick', 'chance']);
    expect(sLose.mango!.golden).toBe(false);
    expect(sLose.mango!.totalMs).toBe(7550); // max(4000, 8000 - 450) * 1.0
  });

  it('QA-T4-08 eating normal mango updates score progress eaten and snake length', () => {
    // updated for P1 MEC-002-R3 / MEC-002 §7
    const sim = restoreSim(b, buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: false,
      eaten: 0,
      score: 0,
      progress: 0,
      spawnInMs: QUIET,
    }));
    sim.advance(140);
    const snap = sim.snapshot();

    expect(snap.score).toBe(1);
    expect(snap.eatenInRun).toBe(1);
    expect(snap.eatenInLevel).toBe(1);
    expect(snap.progress).toBe(1);
    expect(snap.snake).toHaveLength(4);
    expect(snap.snake[0]).toEqual({ x: 9, y: 8 });
    expect(snap.snake[3]).toEqual({ x: 6, y: 8 }); // tail not popped
    expect(sim.drainEvents()).toContainEqual({
      type: 'ate',
      x: 9,
      y: 8,
      golden: false,
      points: 1,
      progressGain: 1,
      source: 'mango',
    });
  });

  it('QA-T4-09 eating golden mango awards 3 points and 2 progress', () => {
    // updated for P1 MEC-002-R3 / MEC-002 §7
    const sim = restoreSim(b, buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: true,
      eaten: 3,
      score: 5,
      progress: 1,
      spawnInMs: QUIET,
    }));
    sim.advance(140);
    const snap = sim.snapshot();

    expect(snap.score).toBe(8); // 5 + 3
    expect(snap.eatenInRun).toBe(4);
    expect(snap.eatenInLevel).toBe(4);
    expect(snap.progress).toBe(3); // 1 + 2
    expect(snap.snake).toHaveLength(4);
    expect(sim.drainEvents()).toContainEqual({
      type: 'ate',
      x: 9,
      y: 8,
      golden: true,
      points: 3,
      progressGain: 2,
      source: 'mango',
    });
  });

  it('QA-T4-10 rotMsFor calculates rot time clamped by rotMinMs and golden factor', () => {
    // Spec: design §5 MEC-002: "Rot time: max(4000, 8000 − 150 × eaten) × (golden ? 0.5 : 1) ms."
    expect(rotMsFor(b, 0, false)).toBe(8000);
    expect(rotMsFor(b, 10, false)).toBe(6500);
    expect(rotMsFor(b, 26, false)).toBe(4100);
    expect(rotMsFor(b, 27, false)).toBe(4000); // clamped to rotMinMs
    expect(rotMsFor(b, 30, false)).toBe(4000);
    expect(rotMsFor(b, 3, true)).toBe(3775); // (8000 - 450) * 0.5
    expect(rotMsFor(b, 4, true)).toBe(3700); // (8000 - 600) * 0.5
    expect(rotMsFor(b, 40, true)).toBe(2000); // 4000 * 0.5
  });

  it('QA-T4-11 rot timer counts down in sim time and snapshot exposes ageMs', () => {
    // Spec: design §4 SimSnapshot: "mango ({x, y, golden, leftMs, totalMs, ageMs})"
    const sim = restoreSim(b, buildState(b, {
      mango: [2, 2],
      mangoLeftMs: 8000,
      spawnInMs: QUIET,
    }));
    sim.advance(250);
    const snap1 = sim.snapshot();

    expect(snap1.mango!.leftMs).toBe(7750);
    expect(snap1.mango!.totalMs).toBe(8000);
    expect(snap1.mango!.ageMs).toBe(250);

    sim.advance(500);
    const snap2 = sim.snapshot();

    expect(snap2.mango!.leftMs).toBe(7250);
    expect(snap2.mango!.ageMs).toBe(750);
  });
});
