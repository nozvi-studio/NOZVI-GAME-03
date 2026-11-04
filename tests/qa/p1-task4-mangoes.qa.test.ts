// tests/qa/p1-task4-mangoes.qa.test.ts — independent black-box QA tests for P1 Task 4 mango mechanics (MEC-002)
import { describe, expect, it } from 'vitest';
import {
  createSim,
  restoreSim,
  parseBalance,
  familyRow,
  tickMsFor,
  type Cell,
  type Dir,
  type Sim,
} from '../../src/core';
import { loadBalance } from '../support/balance';
import { buildState, QUIET } from '../support/state';

// 2x2 loop where snake can circle indefinitely without colliding
const SQUARE_SNAKE: [number, number][] = [[8, 8], [7, 8], [7, 7], [8, 7]];
const SQUARE_DIRS: [number, number][] = [[0, 1], [-1, 0], [0, -1], [1, 0]];

function circleSim(sim: Sim, totalMs: number, tickMs: number): void {
  let remaining = totalMs;
  let dirIdx = 0;
  while (remaining > 0) {
    const chunk = Math.min(remaining, tickMs);
    const [dx, dy] = SQUARE_DIRS[dirIdx]!;
    sim.turn(dx as any, dy as any);
    dirIdx = (dirIdx + 1) % SQUARE_DIRS.length;
    sim.advance(chunk);
    remaining -= chunk;
  }
}

function manhattanDist(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isInFrontLane(head: Cell, dir: Dir, target: Cell, count = 4): boolean {
  for (let i = 1; i <= count; i++) {
    if (head.x + dir.x * i === target.x && head.y + dir.y * i === target.y) {
      return true;
    }
  }
  return false;
}

describe('QA P1 Task 4: Mangoes (MEC-002 Black-Box)', () => {
  const b = loadBalance();

  it('QA-P1T4-01 MEC-002-R1 initial mango placement is reachable, in bounds, and not near head', () => {
    // MEC-002-R1: "Placement candidates, the 'good' set (reachable and not nearHead(x, y, mango.nearHeadDist))..."
    for (let seed = 1; seed <= 15; seed++) {
      const sim = createSim(b, seed);
      const snap = sim.snapshot();

      expect(snap.mango).not.toBeNull();
      const m = snap.mango!;
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x).toBeLessThan(b.board.cols);
      expect(m.y).toBeGreaterThanOrEqual(0);
      expect(m.y).toBeLessThan(b.board.rows);

      // Never placed on snake segments
      expect(snap.snake.some(s => s.x === m.x && s.y === m.y)).toBe(false);

      // Distance from head >= nearHeadDist (3)
      const head = snap.snake[0]!;
      expect(manhattanDist(head, m)).toBeGreaterThanOrEqual(b.mango.nearHeadDist);

      // Not in front lane (4 cells ahead)
      expect(isInFrontLane(head, snap.dir, m, b.fairness.frontLaneCells)).toBe(false);

      // Initial placement is never golden and has full rotBaseMs
      expect(m.golden).toBe(false);
      expect(m.totalMs).toBe(b.mango.rotBaseMs);
      expect(m.leftMs).toBe(b.mango.rotBaseMs);
      expect(m.ageMs).toBe(0);
    }
  });

  it('QA-P1T4-02 MEC-002-R2 reserved cells are never chosen for mango placement', () => {
    // MEC-002-R2: "A cell is reserved for every placement... if it holds: a snake cell; the regular mango;
    // a rotten rock in any state; any MEC-004 hazard cell in any state; any terrain cell..."
    const targetCell: Cell = { x: 0, y: 0 };
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      spawnInMs: QUIET,
    });

    s.rottenRocks = [];
    for (let y = 0; y < b.board.rows; y++) {
      for (let x = 0; x < b.board.cols; x++) {
        const isSnake = s.snake.some(c => c.x === x && c.y === y);
        const isOldMango = x === 9 && y === 8;
        const isTarget = x === targetCell.x && y === targetCell.y;
        if (!isSnake && !isOldMango && !isTarget) {
          const state = (x + y) % 2 === 0 ? 'solid' : 'crumble';
          s.rottenRocks.push({ family: 'rottenRock', x, y, state, leftMs: 4000 });
        }
      }
    }

    const sim = restoreSim(b, s);
    sim.advance(140); // snake eats mango at (9, 8), triggering next placement
    const snap = sim.snapshot();

    expect(snap.mango).not.toBeNull();
    // The only non-reserved candidate was (0, 0)
    expect(snap.mango!).toMatchObject({ x: targetCell.x, y: targetCell.y });
  });

  it('QA-P1T4-03 MEC-002-R3 counters start at 0 for every run', () => {
    // MEC-002-R3: "Both counters start at 0 for every run, whatever the start level (MEC-008-R5)."
    const simL1 = createSim(b, 100);
    expect(simL1.snapshot().eatenInRun).toBe(0);
    expect(simL1.snapshot().eatenInLevel).toBe(0);

    const sL12 = buildState(b, { level: 12 });
    const simL12 = restoreSim(b, sL12);
    expect(simL12.snapshot().eatenInRun).toBe(0);
    expect(simL12.snapshot().eatenInLevel).toBe(0);
  });

  it('QA-P1T4-04 MEC-002-R3 eating regular mango increments eatenInRun and eatenInLevel', () => {
    // MEC-002-R3: "Eating the regular mango (normal or golden) does eatenInRun += 1 and eatenInLevel += 1."
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      spawnInMs: QUIET,
    });
    const sim = restoreSim(b, s);
    sim.advance(140); // head eats at (9, 8)
    const snap = sim.snapshot();

    expect(snap.eatenInRun).toBe(1);
    expect(snap.eatenInLevel).toBe(1);
  });

  it('QA-P1T4-05 MEC-002-R3 / MEC-003-R7 level up resets eatenInLevel to 0 while eatenInRun persists', () => {
    // MEC-002-R3 & MEC-003-R7: "eatenInLevel = 0" on level up; eatenInRun keeps accumulating
    const s = buildState(b, {
      level: 1,
      progress: 3, // need at L1 is 4
      eatenInLevel: 3,
      eatenInRun: 3,
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      spawnInMs: QUIET,
    });
    const sim = restoreSim(b, s);
    sim.advance(140); // eats 4th mango -> quota 4 reached -> level up triggered

    const snapTransition = sim.snapshot();
    expect(snapTransition.level).toBe(2);
    expect(snapTransition.eatenInLevel).toBe(0);
    expect(snapTransition.eatenInRun).toBe(4);

    // After transition ends (1000 ms)
    sim.advance(1000);
    const snapPlaying = sim.snapshot();
    expect(snapPlaying.eatenInLevel).toBe(0);
    expect(snapPlaying.eatenInRun).toBe(4);
  });

  it('QA-P1T4-06 MEC-002-R4 rot formula uses eatenInLevel and goldenRotFactor', () => {
    // MEC-002-R4: "totalMs = floor(max(mango.rotMinMs, mango.rotBaseMs - mango.rotPerEatenMs * eatenInLevel) * (golden ? mango.goldenRotFactor : 1))"
    const sNormal = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      eatenInLevel: 2, // will become 3 upon eating
      eatenInRun: 2,
      golden: false,
      spawnInMs: QUIET,
    });
    const simNormal = restoreSim(b, sNormal);
    simNormal.advance(140); // eats, placing next mango with eatenInLevel = 3
    const snapNormal = simNormal.snapshot();
    expect(snapNormal.eatenInLevel).toBe(3);
    if (!snapNormal.mango!.golden) {
      expect(snapNormal.mango!.totalMs).toBe(7550);
    } else {
      expect(snapNormal.mango!.totalMs).toBe(3775);
    }
  });

  it('QA-P1T4-07 MEC-002-R4 rot time returns to 8000 ms after level up', () => {
    // MEC-002 §10: "MEC-002-R4 rot time returns to 8000 after a level up"
    const s = buildState(b, {
      level: 1,
      progress: 3,
      eatenInLevel: 3,
      eatenInRun: 3,
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      spawnInMs: QUIET,
    });
    const sim = restoreSim(b, s);
    sim.advance(140); // eats 4th mango -> level up to L2
    const snap = sim.snapshot();
    expect(snap.eatenInLevel).toBe(0);
    if (snap.mango!.golden) {
      expect(snap.mango!.totalMs).toBe(4000);
    } else {
      expect(snap.mango!.totalMs).toBe(8000);
    }
  });

  it('QA-P1T4-08 MEC-002-R5 golden mango never appears when eatenInRun < 3', () => {
    // MEC-002-R5: "golden with chance mango.goldenChance (0.15) only if eatenInRun >= mango.goldenMinEaten (3)"
    for (let eaten = 0; eaten < 3; eaten++) {
      for (let seed = 1; seed <= 20; seed++) {
        const s = buildState(b, {
          seed,
          eatenInRun: eaten,
          snake: [[8, 8], [7, 8], [6, 8]],
          dir: [1, 0],
          mango: [9, 8],
          spawnInMs: QUIET,
        });
        const sim = restoreSim(b, s);
        sim.advance(140);
        const snap = sim.snapshot();
        if (eaten + 1 < 3) {
          expect(snap.mango!.golden).toBe(false);
        }
      }
    }
  });

  it('QA-P1T4-09 MEC-002-R5 golden mango grants 3 score, 2 progress, and 1 growth', () => {
    // MEC-002-R5: "Eating it gives score mango.points.golden (3), progress mango.progress.golden (2), growth +1"
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: true,
      score: 10,
      progress: 0,
      spawnInMs: QUIET,
    });
    const sim = restoreSim(b, s);
    sim.advance(140);
    const snap = sim.snapshot();

    expect(snap.score).toBe(13);
    expect(snap.progress).toBe(2);
    expect(snap.snake).toHaveLength(4);

    const events = sim.drainEvents();
    expect(events).toContainEqual({
      type: 'ate',
      x: 9,
      y: 8,
      golden: true,
      points: 3,
      progressGain: 2,
      source: 'mango',
    });
  });

  it('QA-P1T4-10 MEC-002-R6 rot below level 12 leaves NO rock', () => {
    // MEC-002-R6: "rot below L12 leaves no rock; leftRock: false"
    const s = buildState(b, {
      level: 11,
      mango: [2, 2],
      mangoLeftMs: 10,
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      spawnInMs: QUIET,
    });
    const sim = restoreSim(b, s);
    sim.advance(10);
    const snap = sim.snapshot();

    expect(snap.rottenRocks).toHaveLength(0);
    expect(sim.drainEvents()).toContainEqual({
      type: 'rotted',
      x: 2,
      y: 2,
      leftRock: false,
    });
  });

  it('QA-P1T4-11 MEC-002-R6 fair rot at level 12+ leaves a solid rotten rock', () => {
    // MEC-002-R6: "If familyRow(level).rottenRocks (true from L12) and the cell is fair... rotten rock is created"
    expect(familyRow(b, 12).rottenRocks).toBe(true);

    const s = buildState(b, {
      level: 12,
      mango: [2, 2],
      mangoLeftMs: 10,
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      spawnInMs: QUIET,
    });
    const sim = restoreSim(b, s);
    sim.advance(10);
    const snap = sim.snapshot();

    expect(sim.drainEvents()).toContainEqual({
      type: 'rotted',
      x: 2,
      y: 2,
      leftRock: true,
    });
    expect(snap.rottenRocks).toContainEqual(expect.objectContaining({
      x: 2,
      y: 2,
      state: 'solid',
      leftMs: b.mango.rottenRockLifeMs,
    }));
  });

  it('QA-P1T4-12 MEC-002-R6 unfair rot at level 12+ leaves NO rock', () => {
    // MEC-002-R6: "unfair rot leaves none"
    const sNearHead = buildState(b, {
      level: 12,
      mango: [8, 7], // adjacent to head [8, 8]
      mangoLeftMs: 10,
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      spawnInMs: QUIET,
    });
    const simNearHead = restoreSim(b, sNearHead);
    simNearHead.advance(10);
    expect(simNearHead.snapshot().rottenRocks).toHaveLength(0);
    expect(simNearHead.drainEvents()).toContainEqual({
      type: 'rotted',
      x: 8,
      y: 7,
      leftRock: false,
    });

    const sFrontLane = buildState(b, {
      level: 12,
      mango: [8, 10], // in front lane of head [8, 8] facing down [0, 1]
      mangoLeftMs: 10,
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      spawnInMs: QUIET,
    });
    const simFrontLane = restoreSim(b, sFrontLane);
    simFrontLane.advance(10);
    expect(simFrontLane.snapshot().rottenRocks).toHaveLength(0);
    expect(simFrontLane.drainEvents()).toContainEqual({
      type: 'rotted',
      x: 8,
      y: 10,
      leftRock: false,
    });
  });

  it('QA-P1T4-13 MEC-002-R7 rotten rock lifecycle: solid 5000 ms, crumble 450 ms, then removed', () => {
    // MEC-002-R7: "Solid for mango.rottenRockLifeMs (5000), then crumble for hazard.crumbleMs (450, not solid), then removed."
    const tick = tickMsFor(b, 12);
    const s = buildState(b, {
      level: 12,
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      spawnInMs: QUIET,
    });
    s.rottenRocks = [{ family: 'rottenRock', x: 2, y: 2, state: 'solid', leftMs: 5000 }];
    const sim = restoreSim(b, s);

    // Keep snake circling for 4999 ms
    circleSim(sim, 4999, tick);
    const snapSolid = sim.snapshot();
    const rockSolid = snapSolid.rottenRocks.find(r => r.x === 2 && r.y === 2);
    expect(rockSolid).toBeDefined();
    expect(rockSolid!.state).toBe('solid');
    expect(rockSolid!.leftMs).toBe(1);

    // 1 ms later: reaches 5000 ms, enters crumble with 450 ms
    circleSim(sim, 1, tick);
    const snapCrumble = sim.snapshot();
    const rockCrumble = snapCrumble.rottenRocks.find(r => r.x === 2 && r.y === 2);
    expect(rockCrumble).toBeDefined();
    expect(rockCrumble!.state).toBe('crumble');
    expect(rockCrumble!.leftMs).toBe(b.hazard.crumbleMs);

    // 449 ms of crumble
    circleSim(sim, 449, tick);
    expect(sim.snapshot().rottenRocks.some(r => r.x === 2 && r.y === 2)).toBe(true);

    // Final 1 ms: removed
    circleSim(sim, 1, tick);
    expect(sim.snapshot().rottenRocks.some(r => r.x === 2 && r.y === 2)).toBe(false);
  });

  it('QA-P1T4-14 MEC-002-R7 rotten rock kills snake only while solid, never while crumbling', () => {
    // MEC-002-R7: "Entering a solid one kills with cause rotten... then crumble for hazard.crumbleMs (450, not solid)"
    // 1. Solid rock collision
    const sSolid = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
    });
    sSolid.rottenRocks = [{ family: 'rottenRock', x: 9, y: 8, state: 'solid', leftMs: 3000 }];
    const simSolid = restoreSim(b, sSolid);
    simSolid.advance(140);
    const snapSolid = simSolid.snapshot();
    expect(snapSolid.status).toBe('over');
    expect(snapSolid.outcome).toEqual({ won: false, cause: 'rotten' });
    expect(simSolid.drainEvents()).toContainEqual({
      type: 'died',
      cause: 'rotten',
      x: 8,
      y: 8,
    });

    // 2. Crumble rock collision: non-solid, safe to enter
    const sCrumble = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
    });
    sCrumble.rottenRocks = [{ family: 'rottenRock', x: 9, y: 8, state: 'crumble', leftMs: 300 }];
    const simCrumble = restoreSim(b, sCrumble);
    simCrumble.advance(140);
    const snapCrumble = simCrumble.snapshot();
    expect(snapCrumble.status).toBe('playing');
    expect(snapCrumble.snake[0]).toEqual({ x: 9, y: 8 });
  });

  it('QA-P1T4-15 MEC-002-R7 / MEC-003-R7 rotten rocks crumble immediately at level transition', () => {
    // MEC-002-R7 & MEC-003-R7: "every rotten rock switches to crumble (cells off, not solid)... Nothing temporary survives a level up"
    const s = buildState(b, {
      level: 12,
      progress: 6, // need at L12 is 7
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      spawnInMs: QUIET,
    });
    s.rottenRocks = [{ family: 'rottenRock', x: 2, y: 2, state: 'solid', leftMs: 4000 }];

    const sim = restoreSim(b, s);
    sim.advance(140); // eats mango -> progress 7 reaches quota -> level up to L13
    const snap = sim.snapshot();

    expect(snap.phase).toBe('transition');
    const rock = snap.rottenRocks.find(r => r.x === 2 && r.y === 2);
    expect(rock).toBeDefined();
    expect(rock!.state).toBe('crumble');

    // Complete transition (1000 ms; crumble lasts 450 ms)
    sim.advance(1000);
    expect(sim.snapshot().phase).toBe('playing');
    expect(sim.snapshot().rottenRocks).toHaveLength(0);
  });

  it('QA-P1T4-16 MEC-002-R8 next mango placed after eat does not occupy snake cells', () => {
    // MEC-002-R8: "in the eating step after eating the regular mango... place next mango"
    for (let seed = 1; seed <= 10; seed++) {
      const s = buildState(b, {
        seed,
        snake: [[8, 8], [7, 8], [6, 8]],
        dir: [1, 0],
        mango: [9, 8],
        spawnInMs: QUIET,
      });
      const sim = restoreSim(b, s);
      sim.advance(140); // snake eats mango
      const snap = sim.snapshot();

      expect(snap.mango).not.toBeNull();
      expect(snap.snake.some(c => c.x === snap.mango!.x && c.y === snap.mango!.y)).toBe(false);
    }
  });

  it('QA-P1T4-17 MEC-002-R9 deferred placement sets mango to null and emits mangoDeferred once', () => {
    // MEC-002-R9: "If a placement finds no candidate (good or any), mango = null, retryMs = 0,
    // emit mangoDeferred {} (once per empty period)... The run does not end"
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      spawnInMs: QUIET,
    });
    s.rottenRocks = [];
    for (let y = 0; y < b.board.rows; y++) {
      for (let x = 0; x < b.board.cols; x++) {
        if (!(y === 8 && x >= 6 && x <= 9)) {
          s.rottenRocks.push({ family: 'rottenRock', x, y, state: 'solid', leftMs: 10000 });
        }
      }
    }

    const sim = restoreSim(b, s);
    sim.advance(140); // eats at (9, 8); board now completely full
    const snap = sim.snapshot();

    expect(snap.status).toBe('playing');
    expect(snap.outcome).toBeNull();
    expect(snap.mango).toBeNull();

    const events = sim.drainEvents();
    const deferredCount = events.filter(e => e.type === 'mangoDeferred').length;
    expect(deferredCount).toBe(1);

    sim.advance(100);
    expect(sim.snapshot().mango).toBeNull();
    expect(sim.drainEvents().some(e => e.type === 'mangoDeferred')).toBe(false);
  });

  it('QA-P1T4-18 MEC-002-R9 placement retries every 250 ms and ends deferred period upon success', () => {
    // MEC-002-R9: "Every mango.placeRetryMs (250) of playing time a new attempt is made;
    // the first success ends the period (no event; the snapshot shows the mango)."
    const s = buildState(b, {
      snake: [[4, 8], [3, 8], [2, 8], [1, 8]],
      dir: [1, 0],
      mango: null,
      spawnInMs: QUIET,
    });
    s.retryMs = 0;
    // Fill board except snake, the step path [5, 8], and candidate cell [16, 16]
    s.rottenRocks = [];
    for (let y = 0; y < b.board.rows; y++) {
      for (let x = 0; x < b.board.cols; x++) {
        const isSnake = (y === 8 && x >= 1 && x <= 4);
        const isStepPath = (y === 8 && x === 5);
        const isCandidate = (x === 16 && y === 16);
        if (!isSnake && !isStepPath) {
          if (isCandidate) {
            // Rock that crumbles and is removed after 100 ms
            s.rottenRocks.push({ family: 'rottenRock', x, y, state: 'crumble', leftMs: 100 });
          } else {
            s.rottenRocks.push({ family: 'rottenRock', x, y, state: 'solid', leftMs: 20000 });
          }
        }
      }
    }

    const sim = restoreSim(b, s);

    // At 100 ms: rock at (16, 16) finishes crumbling and is removed. But retry timer is at 100 ms (< 250 ms)
    sim.advance(100);
    expect(sim.snapshot().mango).toBeNull();

    // Advance to 249 ms total (snake stepped once at 140 ms to [5, 8], status is playing)
    sim.advance(149);
    expect(sim.snapshot().status).toBe('playing');
    expect(sim.snapshot().mango).toBeNull();

    // At 250 ms: retry triggers, finds free candidate at (16, 16), places mango!
    sim.advance(1);
    const snap = sim.snapshot();
    expect(snap.mango).not.toBeNull();
    expect(snap.mango!.x).toBe(16);
    expect(snap.mango!.y).toBe(16);
    expect(sim.drainEvents().some(e => e.type === 'mangoDeferred')).toBe(false);
  });

  it('QA-P1T4-19 MEC-002-R9 / MEC-003-R13 director does not spawn while mango slot is empty', () => {
    // MEC-003-R13: "While no mango is on the board (MEC-001-R10), the director does not spawn."
    const tick = tickMsFor(b, 2);
    const s = buildState(b, {
      level: 2,
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      mango: null,
      spawnInMs: 0,
    });
    // Reserve all other cells with rocks so retry cannot place a mango
    s.rottenRocks = [];
    for (let y = 0; y < b.board.rows; y++) {
      for (let x = 0; x < b.board.cols; x++) {
        const isSnake = SQUARE_SNAKE.some(([sx, sy]) => sx === x && sy === y);
        if (!isSnake) {
          s.rottenRocks.push({ family: 'rottenRock', x, y, state: 'solid', leftMs: 50000 });
        }
      }
    }

    const sim = restoreSim(b, s);
    circleSim(sim, 1000, tick);
    const snap = sim.snapshot();

    expect(snap.mango).toBeNull();
    expect(snap.hazards).toHaveLength(0);
    expect(snap.terrains).toHaveLength(0);
  });

  it('QA-P1T4-20 MEC-002-R10 rot and retry timers freeze during level transition', () => {
    // MEC-002-R10: "During a MEC-003 level transition, ageMs and retryMs do not advance (MEC-003-R9)."
    const s = buildState(b, {
      level: 1,
      progress: 3,
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      spawnInMs: QUIET,
    });
    const sim = restoreSim(b, s);
    sim.advance(140); // level up to L2, starts transition

    const snapStart = sim.snapshot();
    expect(snapStart.phase).toBe('transition');
    expect(snapStart.mango).not.toBeNull();
    expect(snapStart.mango!.ageMs).toBe(0);

    // Advance 500 ms inside transition
    sim.advance(500);
    const snapMid = sim.snapshot();
    expect(snapMid.phase).toBe('transition');
    expect(snapMid.mango!.ageMs).toBe(0);

    // Finish remaining 500 ms of transition
    sim.advance(500);
    expect(sim.snapshot().phase).toBe('playing');
    sim.advance(10);
    expect(sim.snapshot().mango!.ageMs).toBe(10);
  });

  it('QA-P1T4-21 MEC-002-EC1 rot in the same ms head enters resolves before step without death', () => {
    // MEC-002 Edge Case 1: "Mango rots in the same ms the head would enter it: R6 runs before the snake step.
    // The cell is in the head's front lane, so it is not fair: no rock; the head enters an empty cell"
    const tick = tickMsFor(b, 12);
    expect(tick).toBe(118);

    const s = buildState(b, {
      level: 12,
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      mangoLeftMs: 118,
      spawnInMs: QUIET,
    });
    const sim = restoreSim(b, s);
    sim.advance(118);
    const snap = sim.snapshot();

    // Snake stepped safely into (9, 8) without dying
    expect(snap.status).toBe('playing');
    expect(snap.snake[0]).toEqual({ x: 9, y: 8 });
    // Rot event occurred with leftRock: false
    expect(sim.drainEvents()).toContainEqual({
      type: 'rotted',
      x: 9,
      y: 8,
      leftRock: false,
    });
  });

  it('QA-P1T4-22 MEC-002-EC10 multiple rots from L12 leave multiple independent rotten rocks without cap', () => {
    // MEC-002 Edge Case 10: "Two rots close together from L12: each leaves its own 5000 ms rock; there is no cap on rotten rocks"
    const s = buildState(b, {
      level: 12,
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      mango: [2, 2],
      mangoLeftMs: 10,
      spawnInMs: QUIET,
    });
    const sim = restoreSim(b, s);
    sim.advance(10); // 1st fair rot at (2, 2)
    expect(sim.snapshot().rottenRocks).toContainEqual(expect.objectContaining({ x: 2, y: 2 }));

    const m2 = sim.snapshot().mango!;
    sim.advance(m2.totalMs);
    const rocks = sim.snapshot().rottenRocks;
    expect(rocks.length).toBeGreaterThanOrEqual(1);
  });

  it('QA-P1T4-23 MEC-002 §9 parseBalance validation enforces all mango tuning constraints', () => {
    // MEC-002 §9: parseBalance checks:
    // rotMinMs <= rotBaseMs; 0 < goldenRotFactor <= 1; 0 <= goldenChance <= 1; rottenRockLifeMs, placeRetryMs positive integers.

    // 1. rotMinMs > rotBaseMs must fail
    expect(() => {
      const copy = structuredClone(b);
      copy.mango.rotMinMs = copy.mango.rotBaseMs + 1;
      parseBalance(copy);
    }).toThrow();

    // 2. goldenRotFactor <= 0 or > 1 must fail
    expect(() => {
      const copy = structuredClone(b);
      copy.mango.goldenRotFactor = 0;
      parseBalance(copy);
    }).toThrow();
    expect(() => {
      const copy = structuredClone(b);
      copy.mango.goldenRotFactor = 1.2;
      parseBalance(copy);
    }).toThrow();

    // 3. goldenChance < 0 or > 1 must fail
    expect(() => {
      const copy = structuredClone(b);
      copy.mango.goldenChance = -0.1;
      parseBalance(copy);
    }).toThrow();
    expect(() => {
      const copy = structuredClone(b);
      copy.mango.goldenChance = 1.1;
      parseBalance(copy);
    }).toThrow();

    // 4. rottenRockLifeMs <= 0 or non-integer must fail
    expect(() => {
      const copy = structuredClone(b);
      copy.mango.rottenRockLifeMs = 0;
      parseBalance(copy);
    }).toThrow();
    expect(() => {
      const copy = structuredClone(b);
      copy.mango.rottenRockLifeMs = 123.45;
      parseBalance(copy);
    }).toThrow();

    // 5. placeRetryMs <= 0 or non-integer must fail
    expect(() => {
      const copy = structuredClone(b);
      copy.mango.placeRetryMs = 0;
      parseBalance(copy);
    }).toThrow();
    expect(() => {
      const copy = structuredClone(b);
      copy.mango.placeRetryMs = -50;
      parseBalance(copy);
    }).toThrow();
  });

  it.todo(
    'QA-P1T4-todo-01 MEC-002-R4: does rot formula clamp when eatenInLevel is negative, ' +
    'or is eatenInLevel guaranteed non-negative by invariants?'
  );

  it.todo(
    'QA-P1T4-todo-02 MEC-002-R9: when placement retry succeeds, is retryMs reset to 0 ' +
    'or preserved across subsequent deferred placement periods?'
  );
});
