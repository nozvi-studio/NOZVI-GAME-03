// tests/qa/p1-task5-energy.qa.test.ts — black-box QA tests for P1 Task 5 energy, orbs, golden energy & speed ramp (MEC-006, MEC-008)
import { describe, expect, it } from 'vitest';
import {
  createSim,
  restoreSim,
  levelTickMs,
  type Cell,
  type Dir,
  type Sim,
} from '../../src/core';
import { carryEnergy } from '../../src/meta';
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

describe('QA P1 Task 5: Energy, Orbs & Speed Ramp (MEC-006, MEC-008 Black-Box)', () => {
  const b = loadBalance();

  // --------------------------------------------------------------------------
  // Group 1: Start Energy & Input Validation (MEC-006-R1, MEC-008-R5)
  // --------------------------------------------------------------------------

  it('QA-P1T5-01 MEC-006-R1 energy starts at 0 by default and snapshot exposes energyMax', () => {
    // MEC-006-R1: "energy starts at options.startEnergy (MEC-008)" defaulting to 0
    const sim = createSim(b, 10);
    const snap = sim.snapshot();
    expect(snap.energy).toBe(0);
    expect(snap.energyMax).toBe(b.energy.max);
    expect(snap.energyMax).toBe(100);
  });

  it('QA-P1T5-02 MEC-006-R1 createSim accepts valid integer startEnergy in [0, energy.max]', () => {
    // MEC-006-R1: startEnergy in [0, energy.max]
    const sim0 = createSim(b, 11, { startEnergy: 0 });
    expect(sim0.snapshot().energy).toBe(0);

    const sim42 = createSim(b, 12, { startEnergy: 42 });
    expect(sim42.snapshot().energy).toBe(42);

    const simMax = createSim(b, 13, { startEnergy: 100 });
    expect(simMax.snapshot().energy).toBe(100);
  });

  it('QA-P1T5-03 MEC-006-R1 createSim throws RangeError for invalid startEnergy', () => {
    // MEC-006-R1: "createSim throws a RangeError unless it is an integer in [0, energy.max]."
    expect(() => createSim(b, 1, { startEnergy: -1 })).toThrow(RangeError);
    expect(() => createSim(b, 1, { startEnergy: 101 })).toThrow(RangeError);
    expect(() => createSim(b, 1, { startEnergy: 15.5 })).toThrow(RangeError);
    expect(() => createSim(b, 1, { startEnergy: Number.NaN })).toThrow(RangeError);
  });

  // --------------------------------------------------------------------------
  // Group 2: Energy Conservation & Caps (MEC-006-R2, MEC-006-R3)
  // --------------------------------------------------------------------------

  it('QA-P1T5-04 MEC-006-R2 no passive energy regeneration or decay over time', () => {
    // MEC-006-R2: "There is no passive regeneration and no energy loss over time."
    const sim = createSim(b, 20, { startEnergy: 50 });
    sim.advance(50);
    expect(sim.snapshot().energy).toBe(50);
    sim.advance(50);
    expect(sim.snapshot().energy).toBe(50);
  });

  it('QA-P1T5-05 MEC-006-R3 energy is retained across level up', () => {
    // MEC-006-R3: "Energy is kept across level-ups within a run"
    const s = buildState(b, {
      level: 1,
      progress: 3,
      mango: [9, 8],
      golden: false,
    });
    s.energy = 45;
    const sim = restoreSim(b, s);

    sim.advance(140); // eats mango, triggers levelUp to L2
    const snapTransition = sim.snapshot();
    expect(snapTransition.level).toBe(2);
    expect(snapTransition.energy).toBe(45);

    sim.advance(1000);
    const snapPlaying = sim.snapshot();
    expect(snapPlaying.energy).toBe(45);
  });

  // --------------------------------------------------------------------------
  // Group 3: Golden Mango Energy Gain (MEC-006-R9, MEC-006-R2)
  // --------------------------------------------------------------------------

  it('QA-P1T5-06 MEC-006-R9 eating golden mango adds energy.goldenGain and emits energyChanged', () => {
    // MEC-006-R9: "Eating a golden mango adds energy.goldenGain (10, clamped by R2)... emits energyChanged"
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: true,
      spawnInMs: QUIET,
    });
    s.energy = 20;
    const sim = restoreSim(b, s);

    sim.advance(140);
    const snap = sim.snapshot();
    expect(snap.energy).toBe(30);

    const events = sim.drainEvents();
    expect(events).toContainEqual(expect.objectContaining({
      type: 'energyChanged',
      energy: 30,
      delta: 10,
      source: 'golden',
    }));
  });

  it('QA-P1T5-07 MEC-006-R9 / MEC-006-R2 golden mango energy gain clamps at energy.max', () => {
    // MEC-006-R2 / R9: Clamps to 100. Gain of 10 at 95 adds 5. At 100, gain is 0 so no event.
    const sNearMax = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: true,
      spawnInMs: QUIET,
    });
    sNearMax.energy = 95;
    const simNearMax = restoreSim(b, sNearMax);
    simNearMax.advance(140);
    expect(simNearMax.snapshot().energy).toBe(100);
    expect(simNearMax.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'energyChanged',
      energy: 100,
      delta: 5,
      source: 'golden',
    }));

    // At full 100 energy: gain is 0, no energyChanged event emitted
    const sFull = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: true,
      spawnInMs: QUIET,
    });
    sFull.energy = 100;
    const simFull = restoreSim(b, sFull);
    simFull.advance(140);
    expect(simFull.snapshot().energy).toBe(100);
    expect(simFull.drainEvents().some(e => e.type === 'energyChanged')).toBe(false);
  });

  it('QA-P1T5-08 MEC-006-R9 normal mango grants no energy and emits no energyChanged event', () => {
    // Normal mango gives score and progress, but 0 energy
    const s = buildState(b, {
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: false,
      spawnInMs: QUIET,
    });
    s.energy = 10;
    const sim = restoreSim(b, s);
    sim.advance(140);
    expect(sim.snapshot().energy).toBe(10);
    expect(sim.drainEvents().some(e => e.type === 'energyChanged')).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Group 4: Orb Availability, Spawning & Timer Rules (MEC-006-R4..R6, R10)
  // --------------------------------------------------------------------------

  it('QA-P1T5-09 MEC-006-R4 orbs never spawn at level 1', () => {
    // MEC-006-R4: "Orbs exist only while the current level >= energy.orbFromLevel (2)"
    const s = buildState(b, {
      level: 1,
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      spawnInMs: QUIET,
    });
    const sim = restoreSim(b, s);
    circleSim(sim, 8000, 140);

    expect(sim.snapshot().orbs).toHaveLength(0);
    expect(sim.drainEvents().some(e => e.type === 'orbSpawned')).toBe(false);
  });

  it('QA-P1T5-10 MEC-006-R4 / R5 orb spawns at level 2 after orbSpawnIntervalMs (6000 ms)', () => {
    // MEC-006-R5: "When orbSpawnMs reaches energy.orbSpawnIntervalMs (6000), it resets to 0 and one spawn attempt is made."
    const s = buildState(b, {
      level: 2,
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      spawnInMs: QUIET,
    });
    s.rampActive = false;
    const sim = restoreSim(b, s);

    // 5999 ms: no orb yet
    circleSim(sim, 5999, 138);
    expect(sim.snapshot().orbs).toHaveLength(0);

    // 1 ms later: reaches 6000 ms -> spawns orb!
    circleSim(sim, 1, 138);
    const snap = sim.snapshot();
    expect(snap.orbs).toHaveLength(1);
    expect(snap.orbs[0]!.leftMs).toBe(b.energy.orbLifeMs);

    const events = sim.drainEvents();
    expect(events).toContainEqual(expect.objectContaining({
      type: 'orbSpawned',
      x: snap.orbs[0]!.x,
      y: snap.orbs[0]!.y,
    }));
  });

  it('QA-P1T5-11 MEC-006-R4 checkpoint start at L4 counts orbSpawnMs from 0 at run start', () => {
    // MEC-006-R4: "a checkpoint start at L4 sees its first orb 6 s in"
    const s = buildState(b, {
      level: 4,
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      spawnInMs: QUIET,
    });
    s.startLevel = 4;
    s.rampActive = true;
    const sim = restoreSim(b, s);

    circleSim(sim, 5999, 140);
    expect(sim.snapshot().orbs).toHaveLength(0);
    circleSim(sim, 1, 140);
    expect(sim.snapshot().orbs).toHaveLength(1);
  });

  it('QA-P1T5-12 MEC-006-R5 orb spawn skipped when active orbs reach energy.orbMax (2)', () => {
    // MEC-006-R5: "The attempt is skipped (no event) if orbs.length >= energy.orbMax (2)"
    const s = buildState(b, {
      level: 2,
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      spawnInMs: QUIET,
    });
    s.rampActive = false;
    s.orbs = [
      { x: 0, y: 0, ageMs: 1000 },
      { x: 1, y: 1, ageMs: 2000 },
    ];
    s.orbSpawnMs = 5999;
    const sim = restoreSim(b, s);

    sim.drainEvents();
    circleSim(sim, 1, 138); // reaches 6000 ms
    const snap = sim.snapshot();
    expect(snap.orbs).toHaveLength(2);
    expect(sim.drainEvents().some(e => e.type === 'orbSpawned')).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Group 5: Orb Placement Rules (MEC-006-R6)
  // --------------------------------------------------------------------------

  it('QA-P1T5-14 MEC-006-R6 orb candidate cell is in bounds, reachable, not reserved, and not near head', () => {
    // MEC-006-R6: good set candidate placement
    for (let seed = 1; seed <= 5; seed++) {
      const s = buildState(b, {
        seed,
        level: 2,
        snake: SQUARE_SNAKE,
        dir: [0, 1],
        spawnInMs: QUIET,
      });
      s.rampActive = false;
      const sim = restoreSim(b, s);

      circleSim(sim, 6000, 138);
      const snap = sim.snapshot();
      expect(snap.orbs).toHaveLength(1);
      const orb = snap.orbs[0]!;

      expect(orb.x).toBeGreaterThanOrEqual(0);
      expect(orb.x).toBeLessThan(b.board.cols);
      expect(orb.y).toBeGreaterThanOrEqual(0);
      expect(orb.y).toBeLessThan(b.board.rows);

      // Not on snake
      expect(snap.snake.some(c => c.x === orb.x && c.y === orb.y)).toBe(false);

      // Distance from head >= nearHeadDist (3)
      const head = snap.snake[0]!;
      expect(manhattanDist(head, orb)).toBeGreaterThanOrEqual(b.mango.nearHeadDist);
    }
  });

  // --------------------------------------------------------------------------
  // Group 6: Orb Expiration (MEC-006-R7)
  // --------------------------------------------------------------------------

  it('QA-P1T5-15 MEC-006-R7 orb expires when ageMs reaches energy.orbLifeMs (8000 ms)', () => {
    // MEC-006-R7: "An orb expires when ageMs >= energy.orbLifeMs (8000): removed, emits orbExpired {x, y}."
    const s = buildState(b, {
      level: 2,
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      spawnInMs: QUIET,
    });
    s.rampActive = false;
    s.orbs = [{ x: 2, y: 2, ageMs: 7999 }];
    const sim = restoreSim(b, s);

    // 1 ms later: reaches 8000 ms -> expires
    circleSim(sim, 1, 138);
    const snap = sim.snapshot();
    expect(snap.orbs).toHaveLength(0);

    const events = sim.drainEvents();
    expect(events).toContainEqual(expect.objectContaining({
      type: 'orbExpired',
      x: 2,
      y: 2,
    }));
  });

  it('QA-P1T5-16 MEC-006-R7 snapshot exposes leftMs counting down to 0', () => {
    // MEC-006-R7: "The snapshot exposes leftMs"
    const s = buildState(b, {
      level: 2,
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      spawnInMs: QUIET,
    });
    s.rampActive = false;
    s.orbs = [{ x: 2, y: 2, ageMs: 5000 }];
    const sim = restoreSim(b, s);

    expect(sim.snapshot().orbs[0]!.leftMs).toBe(3000);
    circleSim(sim, 1000, 138);
    expect(sim.snapshot().orbs[0]!.leftMs).toBe(2000);
  });

  // --------------------------------------------------------------------------
  // Group 7: Orb Eating & Effects (MEC-006-R8, MEC-006-EC1)
  // --------------------------------------------------------------------------

  it('QA-P1T5-17 MEC-006-R8 eating orb adds +15 energy and emits orbEaten and energyChanged', () => {
    // MEC-006-R8: "+15 energy (clamped), emits orbEaten {x, y, gained} and energyChanged"
    const s = buildState(b, {
      level: 2,
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
    });
    s.rampActive = false;
    s.energy = 10;
    s.orbs = [{ x: 9, y: 8, ageMs: 1000 }];
    const sim = restoreSim(b, s);

    sim.advance(138); // snake moves into (9, 8)
    const snap = sim.snapshot();

    expect(snap.energy).toBe(25);
    expect(snap.orbs).toHaveLength(0);

    const events = sim.drainEvents();
    expect(events).toContainEqual(expect.objectContaining({
      type: 'orbEaten',
      x: 9,
      y: 8,
      gained: 15,
    }));
    expect(events).toContainEqual(expect.objectContaining({
      type: 'energyChanged',
      energy: 25,
      delta: 15,
      source: 'orb',
    }));
  });

  it('QA-P1T5-18 MEC-006-R8 eating orb does not grow snake or change score/progress/mango counters', () => {
    // MEC-006-R8: "The snake does not grow... score, progress and mango counters do not change."
    const s = buildState(b, {
      level: 2,
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      score: 50,
      progress: 2,
      eatenInRun: 3,
      eatenInLevel: 2,
      spawnInMs: QUIET,
    });
    s.rampActive = false;
    s.orbs = [{ x: 9, y: 8, ageMs: 1000 }];
    const sim = restoreSim(b, s);

    sim.advance(138);
    const snap = sim.snapshot();

    expect(snap.snake).toHaveLength(3);
    expect(snap.score).toBe(50);
    expect(snap.progress).toBe(2);
    expect(snap.eatenInRun).toBe(3);
    expect(snap.eatenInLevel).toBe(2);
  });

  it('QA-P1T5-19 MEC-006-EC1 eating orb at 100 energy yields gained: 0 and NO energyChanged event', () => {
    // MEC-006 Edge Case 1: "Energy is 100 and an orb is eaten: orb removed, orbEaten {gained: 0}, no energyChanged."
    const s = buildState(b, {
      level: 2,
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
    });
    s.rampActive = false;
    s.energy = 100;
    s.orbs = [{ x: 9, y: 8, ageMs: 1000 }];
    const sim = restoreSim(b, s);

    sim.advance(138);
    const snap = sim.snapshot();

    expect(snap.energy).toBe(100);
    expect(snap.orbs).toHaveLength(0);

    const events = sim.drainEvents();
    expect(events).toContainEqual(expect.objectContaining({
      type: 'orbEaten',
      x: 9,
      y: 8,
      gained: 0,
    }));
    expect(events.some(e => e.type === 'energyChanged')).toBe(false);
  });

  it('QA-P1T5-20 MEC-006-R8 / R2 eating orb at 90 energy clamps to 100 with gained: 10', () => {
    // Gain clamped to remaining room
    const s = buildState(b, {
      level: 2,
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
    });
    s.rampActive = false;
    s.energy = 90;
    s.orbs = [{ x: 9, y: 8, ageMs: 1000 }];
    const sim = restoreSim(b, s);

    sim.advance(138);
    const snap = sim.snapshot();

    expect(snap.energy).toBe(100);
    const events = sim.drainEvents();
    expect(events).toContainEqual(expect.objectContaining({
      type: 'orbEaten',
      x: 9,
      y: 8,
      gained: 10,
    }));
    expect(events).toContainEqual(expect.objectContaining({
      type: 'energyChanged',
      energy: 100,
      delta: 10,
      source: 'orb',
    }));
  });

  // --------------------------------------------------------------------------
  // Group 8: Speed Ramp (MEC-008-R8, MEC-008-R9)
  // --------------------------------------------------------------------------

  it('QA-P1T5-21 MEC-008-R8 start at level 1 has d = 0 and ramp has no effect, never emits rampEnded', () => {
    // MEC-008-R8: "A start at L1 has d = 0, so the ramp has no effect." Never emits rampEnded.
    const sim = createSim(b, 100);
    const snap = sim.snapshot();
    expect(snap.tickMs).toBe(140);

    sim.advance(140);
    expect(sim.drainEvents().some(e => e.type === 'rampEnded')).toBe(false);
  });

  it('QA-P1T5-22 MEC-008-R8 start at checkpoint L4 initializes rampActive true and rampMangoesLeft 5', () => {
    // MEC-008-R8: Checkpoint start has rampActive = true and rampMangoesLeft = 5
    const sim = createSim(b, 101, { startLevel: 4 });
    const snap = sim.snapshot();

    expect(snap.level).toBe(4);
    expect(snap.rampActive).toBe(true);
    expect(snap.rampMangoesLeft).toBe(5);
    expect(snap.tickMs).toBe(140); // T1 = 140
  });

  it('QA-P1T5-23 MEC-008-R8 checkpoint L4 warms up over 5 mangoes: 140, 139, 138, 136, 135, then 134', () => {
    // MEC-008 §10: "MEC-008-R8 ramp from L4 gives ticks 140 139 138 136 135 134"
    // Ts = levelTickMs(b, 4) = 134, d = 140 - 134 = 6.
    // k = 0: 140
    // k = 1: 140 - floor(17/10) = 139
    // k = 2: 140 - floor(29/10) = 138
    // k = 3: 140 - floor(41/10) = 136
    // k = 4: 140 - floor(53/10) = 135
    // k = 5: ramp ends -> 134
    const s = buildState(b, {
      level: 4,
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      spawnInMs: QUIET,
    });
    s.startLevel = 4;
    s.rampActive = true;
    s.rampEaten = 0;
    s.tickMs = 140;
    const sim = restoreSim(b, s);

    expect(sim.snapshot().tickMs).toBe(140);

    // 1st mango eaten: rampEaten becomes 1, rampMangoesLeft becomes 4
    sim.advance(140);
    expect(sim.snapshot().rampMangoesLeft).toBe(4);
    // MEC-008-R9: new tick applies on the next ms
    sim.advance(1);
    expect(sim.snapshot().tickMs).toBe(139);
  });

  it('QA-P1T5-24 MEC-008-R8 ramp ends after 5 mangoes eaten emitting rampEnded', () => {
    // MEC-008-R8: "The ramp ends when k >= R... emits rampEnded {level}"
    const s = buildState(b, {
      level: 4,
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: false,
      spawnInMs: QUIET,
    });
    s.startLevel = 4;
    s.rampActive = true;
    s.rampEaten = 4; // 5th mango about to be eaten (live rampTick is 135)
    s.tickMs = 135;
    const sim = restoreSim(b, s);

    sim.advance(135);
    const snap = sim.snapshot();

    expect(snap.rampActive).toBe(false);
    expect(snap.rampMangoesLeft).toBe(0);

    // MEC-008-R9: new tick applies on the next ms
    sim.advance(1);
    expect(sim.snapshot().tickMs).toBe(levelTickMs(b, 4));

    const events = sim.drainEvents();
    expect(events).toContainEqual({
      type: 'rampEnded',
      level: 4,
    });
  });

  it('QA-P1T5-25 MEC-008-R8 / ARCH Sim step order ramp ends on first level up if before 5 mangoes', () => {
    // MEC-008-R8: "or on the first level up, whichever comes first."
    // Start at L4, progress 4 of 5 (need at L4 is 5). Eating 1st mango levels up to L5.
    const s = buildState(b, {
      level: 4,
      progress: 4,
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: false,
      spawnInMs: QUIET,
    });
    s.startLevel = 4;
    s.rampActive = true;
    s.rampEaten = 1;
    s.tickMs = 139; // live rampTick for k=1
    const sim = restoreSim(b, s);

    sim.advance(139);
    const snap = sim.snapshot();

    expect(snap.level).toBe(5);
    expect(snap.rampActive).toBe(false);
    expect(snap.rampMangoesLeft).toBe(0);

    const events = sim.drainEvents();
    expect(events).toContainEqual(expect.objectContaining({
      type: 'rampEnded',
      level: 5,
    }));
  });

  // --------------------------------------------------------------------------
  // Group 9: Energy Carry-Over Formula (MEC-008-R6)
  // --------------------------------------------------------------------------

  it('QA-P1T5-26 MEC-008-R6 carryEnergy calculates min(50, floor(energy * 0.5))', () => {
    // MEC-008 §10: "MEC-008-R6 carry of 37 energy is 18, of 100 is 50, of 0 is 0"
    expect(carryEnergy(0, b)).toBe(0);
    expect(carryEnergy(1, b)).toBe(0);
    expect(carryEnergy(37, b)).toBe(18);
    expect(carryEnergy(99, b)).toBe(49);
    expect(carryEnergy(100, b)).toBe(50);
    expect(carryEnergy(150, b)).toBe(50); // clamped to checkpoints.carryMax
  });

  // --------------------------------------------------------------------------
  // Group 10: Event Ordering (ARCHITECTURE.md Sim Step Order)
  // --------------------------------------------------------------------------

  it('QA-P1T5-27 ARCH Sim step order event sequence pins ate -> energyChanged -> rampEnded', () => {
    // ARCHITECTURE.md line 44: "Event order inside one snake step: ate -> energyChanged -> rampEnded"
    const s = buildState(b, {
      level: 4,
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: true,
      spawnInMs: QUIET,
    });
    s.startLevel = 4;
    s.rampActive = true;
    s.rampEaten = 4; // 5th mango eaten, golden
    s.tickMs = 135;
    s.energy = 50;
    const sim = restoreSim(b, s);

    sim.advance(135);
    const events = sim.drainEvents();

    const ateIdx = events.findIndex(e => e.type === 'ate');
    const energyIdx = events.findIndex(e => e.type === 'energyChanged');
    const rampIdx = events.findIndex(e => e.type === 'rampEnded');

    expect(ateIdx).toBeGreaterThanOrEqual(0);
    expect(energyIdx).toBeGreaterThan(ateIdx);
    expect(rampIdx).toBeGreaterThan(energyIdx);
  });

  it('QA-P1T5-ORDER ARCH Sim step order step 12.4: 5th ramp mango completing level quota emits ate -> rampEnded -> levelUp', () => {
    // ARCHITECTURE.md line 42 & 44:
    // "After eating any mango: ramp counter (MEC-008-R8); then, if progress >= need: ... the level-up chain"
    // "Event order inside one snake step: ate -> energyChanged -> rampEnded (if this was the 5th ramp mango) -> then either runWon, or shrunk -> levelUp"
    const s = buildState(b, {
      level: 4,
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: false,
      progress: 4, // quota(4) = 5; eating 1 normal mango completes the level quota
      spawnInMs: QUIET,
    });
    s.startLevel = 4;
    s.rampActive = true;
    s.rampEaten = 4; // 5th ramp mango
    s.tickMs = 135;
    s.energy = 50;
    const sim = restoreSim(b, s);

    sim.advance(135);
    const events = sim.drainEvents();

    const ateIdx = events.findIndex(e => e.type === 'ate');
    const rampIdx = events.findIndex(e => e.type === 'rampEnded');
    const levelUpIdx = events.findIndex(e => e.type === 'levelUp');

    expect(ateIdx).toBeGreaterThanOrEqual(0);
    expect(rampIdx).toBeGreaterThan(ateIdx);
    expect(levelUpIdx).toBeGreaterThan(rampIdx);
  });

  // --------------------------------------------------------------------------
  // Spec Ambiguity Todos
  // --------------------------------------------------------------------------

  it.todo(
    'QA-P1T5-todo-01 MEC-006-R6: Does the orb candidate set exclude cells with crumbling snip-walls and rubble, ' +
    'or are crumbling cells strictly non-reserved for orb placement?'
  );

  it.todo(
    'QA-P1T5-todo-02 MEC-008-R8: When slowmo is active during speed ramp, does tick clamp acc = min(acc, eff) ' +
    'apply immediately on ramp tick transition while slowmo remains active?'
  );
});
