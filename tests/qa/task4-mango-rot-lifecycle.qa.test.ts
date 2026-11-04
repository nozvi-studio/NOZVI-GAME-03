// tests/qa/task4-mango-rot-lifecycle.qa.test.ts — black-box QA tests for Task 4 rot lifecycle, rotten rocks & full board
import { describe, expect, it } from 'vitest';
import type { Cell } from '../../src/core';
import { createSim, restoreSim } from '../../src/core';
import { rotMango } from '../../src/core/mango';
import { rngFrom, seedRng, type Rng } from '../../src/core/rng';
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

describe('QA Task 4: Mango Rot Lifecycle & Full Board (Black-Box)', () => {
  const b = loadBalance();

  it('QA-T4-12 fair rot leaves a permanent rotten rock and emits rotted event', () => {
    // updated for P1 MEC-002-R6/R7
    const sim = restoreSim(b, buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [2, 2],
      mangoLeftMs: 5,
      level: 12,
      spawnInMs: QUIET,
    }));
    sim.advance(4);
    expect(sim.drainEvents()).toEqual([]);

    sim.advance(1);
    const snap = sim.snapshot();

    expect(sim.drainEvents()).toEqual([{ type: 'rotted', x: 2, y: 2, leftRock: true }]);
    expect(snap.rottenRocks).toContainEqual(expect.objectContaining({ x: 2, y: 2, state: 'solid' }));
    expect(snap.mango).not.toBeNull();
    expect(snap.mango!.x !== 2 || snap.mango!.y !== 2).toBe(true);
  });

  it('QA-T4-13 unfair rot near head distance < 3 leaves no rotten rock', () => {
    // Spec: design §5 MEC-002: "mango is 'fair' if it is reachable and not near the head (distance 3)."
    const sim = restoreSim(b, buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [8, 7], // Manhattan distance = 1 < 3
      mangoLeftMs: 1,
      spawnInMs: QUIET,
    }));
    sim.advance(1);
    const snap = sim.snapshot();

    expect(sim.drainEvents()).toEqual([{ type: 'rotted', x: 8, y: 7, leftRock: false }]);
    expect(snap.rottenRocks).toHaveLength(0);
  });

  it('QA-T4-14 unfair rot in front lane leaves no rotten rock', () => {
    // Spec: design §5 MEC-004: "nearHead: Manhattan distance < d, or one of the 4 cells straight ahead of the head"
    const sim = restoreSim(b, buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [11, 8], // 3 cells ahead in lane
      mangoLeftMs: 1,
      spawnInMs: QUIET,
    }));
    sim.advance(1);
    const snap = sim.snapshot();

    expect(sim.drainEvents()).toEqual([{ type: 'rotted', x: 11, y: 8, leftRock: false }]);
    expect(snap.rottenRocks).toHaveLength(0);
  });

  it('QA-T4-15 unfair rot unreachable via BFS leaves no rotten rock', () => {
    // Spec: design §5 MEC-002: "mango is 'fair' if it is reachable and not near the head"
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      mango: [0, 0],
      mangoLeftMs: 1,
      spawnInMs: QUIET,
    });
    // Box (0, 0) in with rotten rocks so BFS cannot reach it
    s.rottenRocks.push({ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 });

    const sim = restoreSim(b, s);
    sim.advance(1);
    const snap = sim.snapshot();

    expect(sim.drainEvents()).toEqual([{ type: 'rotted', x: 0, y: 0, leftRock: false }]);
    expect(snap.rottenRocks).not.toContainEqual({ x: 0, y: 0 });
  });

  it('QA-T4-16 rotten rock collision kills snake with cause rotten', () => {
    // Spec: design §4 CauseKey: "rotten", Solid cell: "a rotten rock always"; §5 MEC-001 cause order
    // On death: "status over, emit died; nothing moves" -> head position stays at [8, 8]
    const sim = restoreSim(b, buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      rottenRocks: [[9, 8]],
      spawnInMs: QUIET,
    }));
    sim.advance(140);
    const snap = sim.snapshot();

    expect(snap.status).toBe('over');
    expect(snap.outcome).toEqual({ won: false, cause: 'rotten' });
    expect(snap.snake[0]).toEqual({ x: 8, y: 8 });
    expect(sim.drainEvents()).toEqual([{ type: 'died', cause: 'rotten', x: 8, y: 8 }]);
  });

  it('QA-T4-17 step order rot check executes before snake step on same millisecond', () => {
    // Spec: design §4: prototype frame() order: mango rot check -> snake step; MEC-002 EC 1
    const sim = restoreSim(b, buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      mangoLeftMs: 140,
      spawnInMs: QUIET,
    }));
    sim.advance(140);
    const snap = sim.snapshot();

    // Rot check runs first: mango rots unfairly (front lane), leaves no rock.
    // Snake then steps into (9, 8) safely without death or eating.
    expect(snap.status).toBe('playing');
    expect(snap.snake[0]).toEqual({ x: 9, y: 8 });
    expect(sim.drainEvents()).toEqual([{ type: 'rotted', x: 9, y: 8, leftRock: false }]);
  });

  it('QA-T4-18 new mango after fair rot does not spawn on the new rotten rock', () => {
    // updated for P1 MEC-002-R6/R7
    const s = buildState(b, { level: 12, mango: [2, 2] });
    rotMango(s, b, rngFrom(seedRng(5)));

    expect(s.rottenRocks).toContainEqual(expect.objectContaining({ x: 2, y: 2 }));
    expect(s.mango).not.toMatchObject({ x: 2, y: 2 });
    expect(s.events).toContainEqual({ type: 'rotted', x: 2, y: 2, leftRock: true });
  });

  it('QA-T4-19 unfair rot on full board re-places mango on same cell', () => {
    // Spec: design §5 MEC-002: "unfair rot (no rock left) the same cell can be picked again ...
    // a board-full win only comes from a failed placement."
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      mango: [9, 8],
      mangoLeftMs: 1,
      spawnInMs: QUIET,
    });
    for (let y = 0; y < b.board.rows; y++) {
      for (let x = 0; x < b.board.cols; x++) {
        if (!(y === 8 && x >= 6 && x <= 9)) {
          s.rottenRocks.push({ x, y });
        }
      }
    }
    const sim = restoreSim(b, s);
    sim.advance(1);
    const snap = sim.snapshot();

    expect(sim.drainEvents()).toEqual([{ type: 'rotted', x: 9, y: 8, leftRock: false }]);
    expect(snap.status).toBe('playing');
    expect(snap.mango).toMatchObject({ x: 9, y: 8 });
  });

  it('QA-T4-20 eating mango when board has zero free cells does not end run', () => {
    // updated for P1 MEC-001-R10 / MEC-002-R8/R9
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      mangoLeftMs: 8000,
      spawnInMs: QUIET,
    });
    for (let y = 0; y < b.board.rows; y++) {
      for (let x = 0; x < b.board.cols; x++) {
        if (!(y === 8 && x >= 6 && x <= 9)) {
          s.rottenRocks.push({ x, y });
        }
      }
    }
    const sim = restoreSim(b, s);
    sim.advance(140);
    const snap = sim.snapshot();

    expect(snap.status).toBe('playing');
    expect(snap.outcome).toBeNull();
    expect(snap.mango).toBeNull();
    const events = sim.drainEvents();
    expect(events).toContainEqual({
      type: 'ate',
      x: 9,
      y: 8,
      golden: false,
      points: 1,
      progressGain: 1,
      source: 'mango',
    });
    expect(events).toContainEqual({ type: 'mangoDeferred' });
    expect(events.some(e => (e as any).type === 'boardFull')).toBe(false);
  });

  it.todo(
    'QA-T4-21 fair rot leaving rock on last free cell triggers boardFull win — cannot be reached in play: ' +
    'a mango fair under BFS reachability and distance >= 3 requires at least intermediate free path cells, ' +
    'so free candidates always remain after rot; an unfair rot on the last cell leaves no rock and re-picks the cell (tested in QA-T4-19)',
  );

  it('QA-T4-22 event payloads match exact specification schema', () => {
    // updated for P1 MEC-002 §7
    const sim = restoreSim(b, buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: false,
      spawnInMs: QUIET,
    }));
    sim.advance(140);
    const [ateEvent] = sim.drainEvents();

    expect(ateEvent).toEqual({
      type: 'ate',
      x: 9,
      y: 8,
      golden: false,
      points: 1,
      progressGain: 1,
      source: 'mango',
    });
    expect(Object.keys(ateEvent!).sort()).toEqual(['golden', 'points', 'progressGain', 'source', 'type', 'x', 'y']);
  });

  it('QA-T4-23 determinism identical seed produces identical mango sequence', () => {
    // Spec: design §4: "Same seed + same balance + same sequence of turn calls at the same sim times ⇒ identical state."
    const simA = createSim(b, 42);
    const simB = createSim(b, 42);

    simA.advance(500);
    simA.turn(0, 1);
    simA.advance(1000);

    simB.advance(500);
    simB.turn(0, 1);
    simB.advance(1000);

    expect(simA.snapshot().mango).toEqual(simB.snapshot().mango);
    expect(simA.snapshot().rottenRocks).toEqual(simB.snapshot().rottenRocks);
    expect(simA.drainEvents()).toEqual(simB.drainEvents());
  });

  it('QA-T4-24 clone independence deep copies mango state', () => {
    // Spec: design §4: "clone(): independent copy: structuredClone of the state"
    const sim1 = createSim(b, 42);
    sim1.advance(100);

    const sim2 = sim1.clone();
    sim1.advance(300);

    const snap1 = sim1.snapshot();
    const snap2 = sim2.snapshot();

    expect(snap1.mango!.leftMs).toBe(snap2.mango!.leftMs - 300);
    expect(snap1.mango!.ageMs).toBe(snap2.mango!.ageMs + 300);
  });
});
