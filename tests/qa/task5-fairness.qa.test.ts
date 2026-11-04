// tests/qa/task5-fairness.qa.test.ts — black-box QA tests for Task 5 placement constraints & BFS fairness
import { instanceFamily } from '../support/instanceFamily';
import { addTimedHazards } from '../../src/core/hazards/timed';
import { describe, it, expect } from 'vitest';
import { loadBalance } from '../support/balance';
import { buildState } from '../support/state';
import { cellBfsWall, cellReserved, cellSolidCause } from '../../src/core/cells';
import { ROCK } from '../../src/core/hazards/rock';
import { FENCE } from '../../src/core/hazards/fence';
import { TERRAIN } from '../../src/core/hazards/terrain';
import { MAZE } from '../../src/core/hazards/maze';
import { spawnCtx } from '../../src/core/hazards/director';
import { reachable, key, nearHead } from '../../src/core/grid';
import { rngFrom, seedRng } from '../../src/core/rng';

describe('QA Task 5: Spawn Constraints & BFS Fairness', () => {
  const b = loadBalance();

  it('QA-T5-24 MEC-004 spawn never on snake cells', () => {
    // Design §5 MEC-004: spawn rejects reserved cells (including snake)
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8], [5, 8]],
      dir: [1, 0],
    });
    const ctx = spawnCtx(s, b);

    for (const [x, y] of [[8, 8], [7, 8], [6, 8], [5, 8]]) {
      expect(cellReserved(s, x, y)).toBe(true);
      expect(ctx.cellFree(x, y)).toBe(false);
    }
  });

  it('QA-T5-25 MEC-004 spawn never on mango cell', () => {
    // Design §5 MEC-002, MEC-004: mango cell is reserved for hazard placement
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      mango: [14, 14],
    });
    expect(cellReserved(s, 14, 14)).toBe(true);
    expect(spawnCtx(s, b).cellFree(14, 14)).toBe(false);
  });

  it('QA-T5-26 MEC-004 spawn never on rotten rocks or existing hazards', () => {
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      rottenRocks: [[3, 3]],
    });
    addTimedHazards(s, {
      family: 'rock', state: 'warn', t: 100, warnMs: 1500, lifeMs: 6000, landed: false,
      cells: [{ x: 12, y: 12, on: false, ageMs: 100 }],
    });
    s.families.terrain.push({
      family: 'terrain', t: 100, lifeMs: 18000,
      cells: [{ x: 1, y: 1, delay: 0, up: false, vis: 'down' }],
    });

    const ctx = spawnCtx(s, b);
    expect(ctx.cellFree(3, 3)).toBe(false);
    expect(ctx.cellFree(12, 12)).toBe(false);
    expect(ctx.cellFree(1, 1)).toBe(false);
  });

  it('QA-T5-27 MEC-004 spawn never in front lane 4 cells or near head', () => {
    // Design §5 MEC-004: nearHead distance 4 or front lane 4 cells ahead
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0], // heading right
    });
    const ctx = spawnCtx(s, b);

    // Front lane 4 cells: (9,8), (10,8), (11,8), (12,8)
    for (let x = 9; x <= 12; x++) {
      expect(nearHead({ x: 8, y: 8 }, { x: 1, y: 0 }, x, 8, 4, 4)).toBe(true);
      expect(ctx.cellFree(x, 8)).toBe(false);
    }
    // 5 cells ahead is not front lane, Manhattan distance = 5 >= 4
    expect(ctx.cellFree(13, 8)).toBe(true);

    // Lateral within distance 4: (8, 9), (8, 10), (8, 11) -> dist 1, 2, 3 < 4
    expect(ctx.cellFree(8, 9)).toBe(false);
    expect(ctx.cellFree(8, 10)).toBe(false);
    expect(ctx.cellFree(8, 11)).toBe(false);
    // (8, 12) -> dist 4 == 4 -> free
    expect(ctx.cellFree(8, 12)).toBe(true);
  });

  it('QA-T5-28 MEC-004 BFS fairness candidate cutting off mango is rejected (MEC-004-R12)', () => {
    // Design §5 MEC-004 & MEC-004-R12:
    // "Before committing a candidate, if the regular mango exists and is in reachable(s),
    // the candidate's cells that will be BFS walls are added and reachable is recomputed;
    // if the mango is no longer reachable, the candidate is invalid"
    // Let mango be in a corner (0, 0).
    // Surrounding cells (1, 0) and (0, 1) if walled would completely cut off (0, 0).
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      mango: [0, 0],
    });
    // Pre-condition: mango (0, 0) is reachable from head (8, 8)
    const initReach = reachable(17, 17, s.snake[0]!, (x, y) => cellBfsWall(s, x, y));
    expect(initReach.has(key(17, 0, 0))).toBe(true);

    // Let's test rock/fence spawn: candidates can never commit if they would isolate the mango
    for (let seed = 1; seed <= 30; seed++) {
      const trialState = structuredClone(s);
      const ctx = spawnCtx(trialState, b);
      const res = instanceFamily(ROCK).spawn(ctx, rngFrom(seedRng(seed)));
      if (res) {
        addTimedHazards(trialState, res);
        // After committing, the mango MUST STILL be reachable!
        const reachAfter = reachable(17, 17, trialState.snake[0]!, (x, y) => cellBfsWall(trialState, x, y));
        expect(reachAfter.has(key(17, 0, 0))).toBe(true);
      }
    }
  });

  it('QA-T5-29 MEC-004 BFS fairness candidate allowed if mango was already unreachable', () => {
    // MEC-004-R12: "If the mango was already unreachable before the candidate, R12 does not reject it."
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      mango: [0, 0],
      rottenRocks: [[1, 0], [0, 1]], // fully cut off (0, 0)
    });

    const initReach = reachable(17, 17, s.snake[0]!, (x, y) => cellBfsWall(s, x, y));
    expect(initReach.has(key(17, 0, 0))).toBe(false);

    // Spawning hazards elsewhere should still be allowed, not rejected by R12
    const ctx = spawnCtx(s, b);
    let spawned = false;
    for (let seed = 1; seed <= 20; seed++) {
      const res = instanceFamily(ROCK).spawn(ctx, rngFrom(seedRng(seed)));
      if (res) {
        spawned = true;
        break;
      }
    }
    expect(spawned).toBe(true);
  });

  it('QA-T5-30 MEC-004 terrain cells are not BFS walls (even when solid/up)', () => {
    // Design §4.1 & MEC-004-R4:
    // "Terrain: solidAt = cell up; bfsWallAt = false; reservedAt = cell present in any state."
    // "Terrain cells are not walls for BFS (prototype behavior, kept)."
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      mango: [8, 12],
    });
    // Add terrain row in 'up' state blocking the direct path
    s.families.terrain.push({
      family: 'terrain', t: 3000, lifeMs: 18000,
      cells: [
        { x: 7, y: 10, delay: 0, up: true, vis: 'up' },
        { x: 8, y: 10, delay: 0, up: true, vis: 'up' },
        { x: 9, y: 10, delay: 0, up: true, vis: 'up' },
      ],
    });

    // Check TERRAIN family definition
    expect(instanceFamily(TERRAIN).bfsWallAt(s.families.terrain[0]!, 8, 10)).toBe(false);
    expect(cellBfsWall(s, 8, 10)).toBe(false);

    // While solidAt IS true:
    expect(instanceFamily(TERRAIN).solidAt(s.families.terrain[0]!, 8, 10)).toBe(true);
    expect(cellSolidCause(s, 8, 10)).toBe('ground');

    // BFS wall function returns false, so reachability path can pass right through terrain
    const reach = reachable(17, 17, s.snake[0]!, (x, y) => cellBfsWall(s, x, y));
    expect(reach.has(key(17, 8, 12))).toBe(true);
  });

  it('QA-T5-31 MEC-004 snake tail is excluded from BFS walls in full Sim', () => {
    // Design §5 MEC-004 & MEC-004-R4:
    // "walls = snake body without the last cell, rotten rocks, and every hazard cell in any state"
    // Covers open QA-T2-34/35 gap:
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8], [5, 8]], // tail is (5, 8)
    });

    // Body segments are BFS walls
    expect(cellBfsWall(s, 8, 8)).toBe(true); // head
    expect(cellBfsWall(s, 7, 8)).toBe(true); // body segment 1
    expect(cellBfsWall(s, 6, 8)).toBe(true); // body segment 2

    // But tail cell (5, 8) MUST NOT be a BFS wall!
    expect(cellBfsWall(s, 5, 8)).toBe(false);
  });

  it('QA-T5-32 MEC-004 reachability via tail allows mango behind snake tail', () => {
    // Setup a loop where mango (4, 8) is surrounded by walls on all sides EXCEPT through the snake tail at (5, 8).
    // (4, 7) rock, (4, 9) rock, (3, 8) rock. Only opening is (5, 8) where snake's tail sits.
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8], [5, 8]], // tail at (5, 8)
      mango: [4, 8],
    });
    addTimedHazards(s, {
      family: 'rock', state: 'solid', t: 2000, warnMs: 1500, lifeMs: 6000, landed: true,
      cells: [
        { x: 4, y: 7, on: true, ageMs: 2000 },
        { x: 4, y: 9, on: true, ageMs: 2000 },
        { x: 3, y: 8, on: true, ageMs: 2000 },
      ],
    });

    // Since tail (5, 8) is excluded from BFS walls, BFS finds a path from head (8,8) through (5,8) to mango (4,8)!
    const reach = reachable(17, 17, s.snake[0]!, (x, y) => cellBfsWall(s, x, y));
    expect(reach.has(key(17, 4, 8))).toBe(true);
  });
});
