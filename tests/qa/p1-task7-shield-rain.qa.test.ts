// tests/qa/p1-task7-shield-rain.qa.test.ts — Black-box QA tests for P1 Task 7 Shield, Rubble & Mango Rain (MEC-006)
import { addTimedHazards } from '../../src/core/hazards/timed';
import { describe, expect, it } from 'vitest';
import {
  createSim,
  restoreSim,
  levelTickMs,
  quota,
  type Dir,
  type Loadout,
  type Sim,
  type SimEvent,
  type SkillId,
} from '../../src/core';
import { loadBalance } from '../support/balance';
import { buildState, QUIET } from '../support/state';
import { p1FuzzSeed } from '../support/p1fuzz';

// 2x2 loop where snake can circle indefinitely without colliding
const SQUARE_SNAKE: [number, number][] = [[8, 8], [7, 8], [7, 7], [8, 7]];
const SQUARE_DIRS: [number, number][] = [[0, 1], [-1, 0], [0, -1], [1, 0]];

function circleSim(sim: Sim, totalMs: number, tickMs: number): void {
  let remaining = totalMs;
  let dirIdx = 0;
  while (remaining > 0) {
    const chunk = Math.min(remaining, tickMs);
    const [dx, dy] = SQUARE_DIRS[dirIdx]!;
    sim.turn(dx as -1 | 0 | 1, dy as -1 | 0 | 1);
    dirIdx = (dirIdx + 1) % SQUARE_DIRS.length;
    sim.advance(chunk);
    remaining -= chunk;
  }
}

describe('QA P1 Task 7: Shield, Rubble & Mango Rain (MEC-006 Black-Box)', () => {
  const b = loadBalance();

  // --------------------------------------------------------------------------
  // Group 1: Shield Activation, Duration & Timeout (MEC-006-R24, R13, R16, EC11)
  // --------------------------------------------------------------------------

  it('QA-P1T7-01 MEC-006-R24 shield activation consumes 50 energy, sets shield state and emits events', () => {
    // MEC-006-R24 duration 5000ms, cost 50. Emits energyChanged then skillUsed.
    const sim = createSim(b, 1, {
      startLevel: 16,
      bestLevel: 16,
      startEnergy: 100,
      loadout: ['shield', 'mangoRain'],
    });

    sim.useSkill(0);
    const events = sim.drainEvents();
    expect(events).toEqual([
      { type: 'energyChanged', energy: 50, delta: -50, source: 'skill' },
      { type: 'skillUsed', slot: 0, skill: 'shield', level: 16, energyBefore: 100, energyAfter: 50 },
    ]);

    const snap = sim.snapshot();
    expect(snap.energy).toBe(50);
    expect(snap.shield).toEqual({ leftMs: 5000 });
  });

  it('QA-P1T7-02 MEC-006-R13 shield rejection order and conditions (active, energy)', () => {
    // MEC-006-R13 rejection check order: empty -> active -> energy -> noTarget

    // 2. Active precedence over energy (EC3: active wins over energy)
    const sActive = buildState(b, { snake: SQUARE_SNAKE, dir: [0, 1], spawnInMs: QUIET });
    sActive.loadout = ['shield', 'mangoRain'];
    sActive.bestLevel = 16;
    sActive.energy = 30; // less than shield cost 50
    sActive.shield = { leftMs: 2500 };
    const simActive = restoreSim(b, sActive);
    simActive.useSkill(0);
    expect(simActive.drainEvents()).toEqual([
      { type: 'skillRejected', slot: 0, skill: 'shield', reason: 'active' },
    ]);

    // 3. Energy insufficient (when not active)
    const sEnergy = buildState(b, { snake: SQUARE_SNAKE, dir: [0, 1], spawnInMs: QUIET });
    sEnergy.loadout = ['shield', 'mangoRain'];
    sEnergy.bestLevel = 16;
    sEnergy.energy = 49;
    const simEnergy = restoreSim(b, sEnergy);
    simEnergy.useSkill(0);
    expect(simEnergy.drainEvents()).toEqual([
      { type: 'skillRejected', slot: 0, skill: 'shield', reason: 'energy' },
    ]);
  });

  it('QA-P1T7-03 MEC-006-R16/EC11 shield expires after 5000 ms sim time without collision', () => {
    // MEC-006-R16 / EC11: shield expires after 5000 ms with skillEnded timeout
    const s = buildState(b, { snake: SQUARE_SNAKE, dir: [0, 1], spawnInMs: QUIET });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    const sim = restoreSim(b, s);

    sim.useSkill(0);
    sim.drainEvents();

    circleSim(sim, 4999, s.tickMs);
    expect(sim.snapshot().shield).toEqual({ leftMs: 1 });
    expect(sim.drainEvents().some(e => e.type === 'skillEnded')).toBe(false);

    circleSim(sim, 1, s.tickMs);
    expect(sim.snapshot().shield).toBeNull();
    expect(sim.drainEvents()).toEqual([
      { type: 'skillEnded', skill: 'shield', reason: 'timeout' },
    ]);
  });

  // --------------------------------------------------------------------------
  // Group 2: Collision Priority & Non-Breakable Obstacles (MEC-006-R24, R25, EC7, EC8)
  // --------------------------------------------------------------------------

  it('QA-P1T7-05 MEC-006-R25 board edge wall collision check precedes obstacle check; shield does not save', () => {
    // MEC-006-R25: "The MEC-001 collision order is unchanged: wall -> self -> solid cell. Shield is checked only at the solid-cell stage."
    // EC7: "Shield active, head hits the board edge or itself: death with the normal cause; shield is not consumed"
    const s = buildState(b, {
      snake: [[16, 8], [15, 8], [14, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [10, 10],
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    const sim = restoreSim(b, s);

    sim.useSkill(0);
    sim.drainEvents();

    sim.advance(s.tickMs);
    const snap = sim.snapshot();
    expect(snap.status).toBe('over');
    expect(sim.drainEvents()).toEqual([
      { type: 'died', cause: 'wall', x: 16, y: 8 },
    ]);
  });

  it('QA-P1T7-06 MEC-006-R25 self collision check precedes obstacle check; shield does not save', () => {
    // Snake loops into itself: head at (8, 8) facing left [-1, 0] into neck at (7, 8)
    const s = buildState(b, {
      snake: [[8, 8], [8, 9], [7, 9], [7, 8], [7, 7]],
      dir: [-1, 0],
      spawnInMs: QUIET,
      mango: [10, 10],
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    const sim = restoreSim(b, s);

    sim.useSkill(0);
    sim.drainEvents();

    sim.advance(s.tickMs);
    expect(sim.snapshot().status).toBe('over');
    expect(sim.drainEvents()).toEqual([
      { type: 'died', cause: 'self', x: 8, y: 8 },
    ]);
  });

  it('QA-P1T7-07 MEC-006-R25 warning hazard cells are not solid and do not consume shield', () => {
    // MEC-006-R25: "A cell in warning state is not solid and does not consume the shield."
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    addTimedHazards(s, {
      family: 'rock',
      state: 'warn',
      t: 500,
      warnMs: 1500,
      lifeMs: 6000,
      landed: false,
      cells: [{ x: 3, y: 8, on: false, ageMs: 500 }],
    } as any);

    const sim = restoreSim(b, s);
    sim.useSkill(0);
    sim.drainEvents();

    sim.advance(s.tickMs);
    const snap = sim.snapshot();
    expect(snap.status).toBe('playing');
    expect(snap.snake[0]).toEqual({ x: 3, y: 8 });
    // Shield should still be active, having only ticked down by s.tickMs
    expect(snap.shield).toEqual({ leftMs: 5000 - s.tickMs });
    expect(sim.drainEvents()).toEqual([]);
  });

  it('QA-P1T7-08 MEC-006-R24/EC8 rubble is not breakable; shield collision with rubble results in death', () => {
    // MEC-006-R24: "Never breakable: board edge (wall), own body (self), rubble."
    // EC8: "Shield active, head hits rubble from an earlier shield: death, cause rubble."
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    s.families.rubble.push({
      family: 'rubble',
      x: 3,
      y: 8,
      state: 'solid',
      leftMs: 1500,
    });

    const sim = restoreSim(b, s);
    sim.useSkill(0);
    sim.drainEvents();

    sim.advance(s.tickMs);
    expect(sim.snapshot().status).toBe('over');
    expect(sim.drainEvents()).toEqual([
      { type: 'died', cause: 'rubble', x: 2, y: 8 },
    ]);
  });

  // --------------------------------------------------------------------------
  // Group 3: Shield Breaking Breakable Families & Single-Use Consumption (MEC-006-R24, R26)
  // --------------------------------------------------------------------------

  it('QA-P1T7-09 MEC-006-R26 shield breaks rock obstacle, removes rock cell, consumes shield, and moves head', () => {
    // MEC-006-R26: breakable solid cell removed, head moves normally, shield consumed, emits shieldBroke & skillEnded
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    addTimedHazards(s, {
      family: 'rock',
      state: 'solid',
      t: 2000,
      warnMs: 1500,
      lifeMs: 60000,
      landed: true,
      cells: [{ x: 3, y: 8, on: true, ageMs: 2000 }],
    } as any);

    const sim = restoreSim(b, s);
    sim.useSkill(0);
    sim.drainEvents();

    sim.advance(s.tickMs);
    const events = sim.drainEvents();
    expect(events).toEqual([
      { type: 'skillEnded', skill: 'shield', reason: 'consumed' },
      { type: 'shieldBroke', x: 3, y: 8, family: 'rock' },
    ]);
    const snap = sim.snapshot();
    expect(snap.status).toBe('playing');
    expect(snap.shield).toBeNull();
    expect(snap.snake[0]).toEqual({ x: 3, y: 8 });
    expect(snap.hazards).toEqual([]);
    expect(snap.rubble).toEqual([]);
  });

  it('QA-P1T7-10 MEC-006-R24/R26 shield breaks fence cell and removes it', () => {
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    addTimedHazards(s, {
      family: 'fence',
      state: 'solid',
      t: 2500,
      warnMs: 2000,
      lifeMs: 60000,
      landed: true,
      cells: [{ x: 3, y: 8, on: true, ageMs: 2500 }],
    } as any);

    const sim = restoreSim(b, s);
    sim.useSkill(0);
    sim.drainEvents();

    sim.advance(s.tickMs);
    const broke = sim.drainEvents().find(e => e.type === 'shieldBroke') as Extract<SimEvent, { type: 'shieldBroke' }>;
    expect(broke).toBeDefined();
    expect(broke.family).toBe('fence');
    expect(sim.snapshot().status).toBe('playing');
  });

  it('QA-P1T7-11 MEC-006-R24/R26 shield breaks maze hedge cell and removes it', () => {
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    addTimedHazards(s, {
      family: 'maze',
      state: 'solid',
      t: 3000,
      warnMs: 2600,
      lifeMs: 60000,
      landed: true,
      cells: [{ x: 3, y: 8, on: true, ageMs: 3000 }],
    } as any);

    const sim = restoreSim(b, s);
    sim.useSkill(0);
    sim.drainEvents();

    sim.advance(s.tickMs);
    const broke = sim.drainEvents().find(e => e.type === 'shieldBroke') as Extract<SimEvent, { type: 'shieldBroke' }>;
    expect(broke).toBeDefined();
    expect(broke.family).toBe('maze');
    expect(sim.snapshot().status).toBe('playing');
  });

  it('QA-P1T7-12 MEC-006-R24/R26 shield breaks terrain raised cell (up)', () => {
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    const tr = b.terrain;
    const upAt = tr.startDelayMs + tr.periodMs - tr.upMs;
    s.families.terrain.push({
      family: 'terrain',
      t: upAt,
      lifeMs: 60000,
      cells: [{ x: 3, y: 8, delay: 0, up: true, vis: 'up' }],
    } as any);

    const sim = restoreSim(b, s);
    sim.useSkill(0);
    sim.drainEvents();

    sim.advance(s.tickMs);
    const broke = sim.drainEvents().find(e => e.type === 'shieldBroke') as Extract<SimEvent, { type: 'shieldBroke' }>;
    expect(broke).toBeDefined();
    expect(broke.family).toBe('terrain');
    expect(sim.snapshot().status).toBe('playing');
  });

  it('QA-P1T7-13 MEC-006-R24/R26 shield breaks rotten rock cell', () => {
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    s.families.rottenRock.push({
      family: 'rottenRock',
      x: 3,
      y: 8,
      state: 'solid',
      leftMs: 5000,
    });

    const sim = restoreSim(b, s);
    sim.useSkill(0);
    sim.drainEvents();

    sim.advance(s.tickMs);
    const broke = sim.drainEvents().find(e => e.type === 'shieldBroke') as Extract<SimEvent, { type: 'shieldBroke' }>;
    expect(broke).toBeDefined();
    expect(broke.family).toBe('rottenRock');
    expect(sim.snapshot().rottenRocks).toEqual([]);
    expect(sim.snapshot().status).toBe('playing');
  });

  it('QA-P1T7-14 MEC-006-R24/R26 shield breaks snip wall cell', () => {
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    s.families.snipWall.push({
      family: 'snipWall',
      cells: [{ x: 3, y: 8 }],
      state: 'solid',
      leftMs: 3000,
    } as any);

    const sim = restoreSim(b, s);
    sim.useSkill(0);
    sim.drainEvents();

    sim.advance(s.tickMs);
    const broke = sim.drainEvents().find(e => e.type === 'shieldBroke') as Extract<SimEvent, { type: 'shieldBroke' }>;
    expect(broke).toBeDefined();
    expect(broke.family).toBe('snipWall');
    expect(sim.snapshot().snipWall).toEqual([]);
    expect(sim.snapshot().status).toBe('playing');
  });

  it('QA-P1T7-15 MEC-006-R26 shield is single-use; second breakable obstacle in path causes death', () => {
    // Two solid rocks: at (3, 8) and at (3, 9); snake breaks first, turns down into second rock
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    addTimedHazards(s,
      {
        family: 'rock',
        state: 'solid',
        t: 2000,
        warnMs: 1500,
        lifeMs: 60000,
        landed: true,
        cells: [{ x: 3, y: 8, on: true, ageMs: 2000 }],
      } as any,
      {
        family: 'rock',
        state: 'solid',
        t: 2000,
        warnMs: 1500,
        lifeMs: 60000,
        landed: true,
        cells: [{ x: 3, y: 9, on: true, ageMs: 2000 }],
      } as any,
    );

    const sim = restoreSim(b, s);
    sim.useSkill(0);
    sim.drainEvents();

    // Break first rock at (3, 8)
    sim.advance(s.tickMs);
    expect(sim.snapshot().shield).toBeNull();
    expect(sim.drainEvents().some(e => e.type === 'shieldBroke')).toBe(true);

    // Queue turn into the second rock at (3, 9) during bonk pause
    sim.turn(0, 1);
    sim.advance(4 * s.tickMs);
    expect(sim.snapshot().status).toBe('over');
    expect(sim.drainEvents()).toEqual([
      { type: 'died', cause: 'rock', x: 3, y: 8 },
    ]);
  });

  // --------------------------------------------------------------------------
  // Group 4: Bonk Pause & Turn Queuing (MEC-006-R27)
  // --------------------------------------------------------------------------

  it('QA-P1T7-16 MEC-006-R27 bonk pause delays the next snake step by exactly 4 ticks', () => {
    // MEC-006-R27: "acc set to -bonkPauseTicks * effectiveTick (3 ticks), so next step happens 4 ticks after the break."
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    addTimedHazards(s, {
      family: 'rock',
      state: 'solid',
      t: 2000,
      warnMs: 1500,
      lifeMs: 60000,
      landed: true,
      cells: [{ x: 3, y: 8, on: true, ageMs: 2000 }],
    } as any);

    const sim = restoreSim(b, s);
    sim.useSkill(0);
    sim.advance(s.tickMs);
    expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 8 });

    // Turn down during bonk pause so it doesn't walk into rubble at (4, 8)
    sim.turn(0, 1);

    // After 4 ticks - 1 ms, head must STILL be at (3, 8)
    sim.advance(4 * s.tickMs - 1);
    expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 8 });

    // On the 4th tick, the step occurs and head moves to (3, 9)
    sim.advance(1);
    expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 9 });
  });

  it('QA-P1T7-17 MEC-006-R27 turns can be queued during bonk pause to avoid rubble', () => {
    // Turns queued during bonk pause are executed when the bonk pause ends
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    addTimedHazards(s, {
      family: 'rock',
      state: 'solid',
      t: 2000,
      warnMs: 1500,
      lifeMs: 60000,
      landed: true,
      cells: [{ x: 3, y: 8, on: true, ageMs: 2000 }],
    } as any);

    const sim = restoreSim(b, s);
    sim.useSkill(0);
    sim.advance(s.tickMs); // Break rock, rubble placed at (4, 8)
    expect(sim.snapshot().rubble).toEqual([]);

    // Queue turn UP to (3, 7)
    sim.turn(0, -1);
    sim.advance(4 * s.tickMs);
    expect(sim.snapshot().status).toBe('playing');
    expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 7 });
  });

  // --------------------------------------------------------------------------
  // Group 5: Rubble Mechanics, Lifecycle & Edge Cases (MEC-006-R28, EC9, EC10, EC15)
  // --------------------------------------------------------------------------

  it('QA-P1T7-18 MEC-006-R28 rubble lifecycle: solid for 1500 ms, crumble for 450 ms, then removed', () => {
    // Rubble lifecycle directly tested with the rubble hazard update
    const s = buildState(b, { snake: SQUARE_SNAKE, dir: [0, 1], spawnInMs: QUIET, mango: [15, 15], mangoLeftMs: 1_000_000 });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.families.rubble.push({
      family: 'rubble',
      x: 12,
      y: 12,
      state: 'solid',
      leftMs: 1500,
    });

    const sim = restoreSim(b, s);
    expect(sim.snapshot().rubble).toEqual([{ x: 12, y: 12, state: 'solid', leftMs: 1500 }]);

    circleSim(sim, 1499, s.tickMs);
    expect(sim.snapshot().rubble).toEqual([{ x: 12, y: 12, state: 'solid', leftMs: 1 }]);

    circleSim(sim, 1, s.tickMs);
    expect(sim.snapshot().rubble).toEqual([{ x: 12, y: 12, state: 'crumble', leftMs: 450 }]);

    circleSim(sim, 449, s.tickMs);
    expect(sim.snapshot().rubble).toEqual([{ x: 12, y: 12, state: 'crumble', leftMs: 1 }]);

    circleSim(sim, 1, s.tickMs);
    expect(sim.snapshot().rubble).toEqual([]);
  });

  it('QA-P1T7-19 MEC-006-R28/EC10 rubble skipped when target cell is out of bounds', () => {
    // EC10: rock at x = 16 (last cell before edge), heading right -> behind is out of bounds -> rubble null
    const s = buildState(b, {
      snake: [[15, 8], [14, 8], [13, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [10, 10],
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    addTimedHazards(s, {
      family: 'rock',
      state: 'solid',
      t: 2000,
      warnMs: 1500,
      lifeMs: 60000,
      landed: true,
      cells: [{ x: 16, y: 8, on: true, ageMs: 2000 }],
    } as any);

    const sim = restoreSim(b, s);
    sim.useSkill(0);
    sim.drainEvents();

    sim.advance(s.tickMs);
    const broke = sim.drainEvents().find(e => e.type === 'shieldBroke') as Extract<SimEvent, { type: 'shieldBroke' }>;
    expect(broke).toBeDefined();
    expect(broke.x).toBe(16);
    expect('rubble' in broke).toBe(false);
    expect(sim.snapshot().rubble).toEqual([]);
  });

  it('QA-P1T7-20 MEC-006-R28/EC9 rubble skipped when target cell is reserved', () => {
    // EC9: rock at (3, 8), behind is (4, 8) occupied by regular mango -> rubble null, mango stays
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [4, 8],
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    addTimedHazards(s, {
      family: 'rock',
      state: 'solid',
      t: 2000,
      warnMs: 1500,
      lifeMs: 60000,
      landed: true,
      cells: [{ x: 3, y: 8, on: true, ageMs: 2000 }],
    } as any);

    const sim = restoreSim(b, s);
    sim.useSkill(0);
    sim.drainEvents();

    sim.advance(s.tickMs);
    const broke = sim.drainEvents().find(e => e.type === 'shieldBroke') as Extract<SimEvent, { type: 'shieldBroke' }>;
    expect(broke).toBeDefined();
    expect('rubble' in broke).toBe(false);
    expect(sim.snapshot().rubble).toEqual([]);
    expect(sim.snapshot().mango).toMatchObject({ x: 4, y: 8 });
  });

  // --------------------------------------------------------------------------
  // Group 6: Mango Rain Activation & Drop Schedule (MEC-006-R29, R30)
  // --------------------------------------------------------------------------

  it('QA-P1T7-22 MEC-006-R29 mango rain cast spends 80 energy, sets budget and scheduled drops', () => {
    // MEC-006-R29: cost 80, drops 6-10, duration 6000ms. Budget = floor(need * 0.5)
    const sim = createSim(b, 10, {
      startLevel: 16,
      bestLevel: 16,
      startEnergy: 100,
      loadout: ['shield', 'mangoRain'],
    });

    sim.useSkill(1);
    const events = sim.drainEvents();
    expect(events.filter(e => e.type === 'energyChanged')).toEqual([
      { type: 'energyChanged', energy: 20, delta: -80, source: 'skill' },
    ]);
    expect(events.filter(e => e.type === 'skillUsed')).toEqual([
      { type: 'skillUsed', slot: 1, skill: 'mangoRain', level: 16, energyBefore: 100, energyAfter: 20 },
    ]);

    const snap = sim.snapshot();
    expect(snap.energy).toBe(20);
    expect(snap.rain).not.toBeNull();
    expect(snap.rain!.leftMs).toBe(6000);
    expect(snap.rain!.dropsLeft).toBeGreaterThanOrEqual(5); // at least 6 total, 1 dropped on cast
    expect(snap.rain!.dropsLeft).toBeLessThanOrEqual(9);

    // Initial drop happened on cast call
    expect(events.some(e => e.type === 'rainDrop' || e.type === 'rainDropSkipped')).toBe(true);
  });

  it('QA-P1T7-23 MEC-006-R29 first drop happens at t=0 on cast, subsequent drops scheduled evenly', () => {
    // Drop i happens when rain.elapsedMs >= i * floor(durationMs / drops)
    const sim = createSim(b, 42, {
      startLevel: 16,
      bestLevel: 16,
      startEnergy: 100,
      loadout: ['shield', 'mangoRain'],
    });

    sim.useSkill(1);
    const firstEvents = sim.drainEvents();
    const hasFirstDrop = firstEvents.some(e => e.type === 'rainDrop' || e.type === 'rainDropSkipped');
    expect(hasFirstDrop).toBe(true);

    const totalDrops = sim.snapshot().rain!.dropsLeft + 1;
    const interval = Math.floor(6000 / totalDrops);

    // Advance to just before second drop
    circleSim(sim, interval - 1, sim.snapshot().tickMs);
    expect(sim.drainEvents().filter(e => e.type === 'rainDrop' || e.type === 'rainDropSkipped')).toHaveLength(0);

    // Exactly at interval: second drop occurs
    circleSim(sim, 1, sim.snapshot().tickMs);
    expect(sim.drainEvents().filter(e => e.type === 'rainDrop' || e.type === 'rainDropSkipped')).toHaveLength(1);
  });

  it('QA-P1T7-24 MEC-006-R30 rain drop skipped when candidate set is empty, energy not refunded', () => {
    // MEC-006-R30: No candidate -> rainDropSkipped and drop lost; EC13: energy not refunded
    const s = buildState(b, { snake: SQUARE_SNAKE, dir: [0, 1], spawnInMs: QUIET });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    // Pack all remaining cells on the board with warning hazards
    for (let x = 0; x < b.board.cols; x++) {
      for (let y = 0; y < b.board.rows; y++) {
        if (!SQUARE_SNAKE.some(c => c[0] === x && c[1] === y)) {
          addTimedHazards(s, {
            family: 'rock',
            state: 'warn',
            t: 0,
            warnMs: 60000,
            lifeMs: 60000,
            landed: false,
            cells: [{ x, y, on: false, ageMs: 0 }],
          } as any);
        }
      }
    }

    const sim = restoreSim(b, s);
    sim.useSkill(1);
    const events = sim.drainEvents();
    expect(events.some(e => e.type === 'rainDropSkipped')).toBe(true);
    expect(events.some(e => e.type === 'rainDrop')).toBe(false);
    expect(sim.snapshot().energy).toBe(20);
  });

  it('QA-P1T7-25 MEC-006-R29 mango rain timeout after 6000 ms emits skillEnded', () => {
    const s = buildState(b, { snake: SQUARE_SNAKE, dir: [0, 1], spawnInMs: QUIET, mango: [15, 15], mangoLeftMs: 1_000_000 });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.energy = 100;
    const sim = restoreSim(b, s);

    sim.useSkill(1);
    sim.drainEvents();

    circleSim(sim, 5999, s.tickMs);
    expect(sim.snapshot().rain).not.toBeNull();
    expect(sim.drainEvents().some(e => e.type === 'skillEnded' && e.skill === 'mangoRain')).toBe(false);

    circleSim(sim, 1, s.tickMs);
    expect(sim.snapshot().rain).toBeNull();
    expect(sim.drainEvents()).toContainEqual({
      type: 'skillEnded',
      skill: 'mangoRain',
      reason: 'timeout',
    });
  });

  it('QA-P1T7-26 MEC-006-R14 mango rain cannot be recast while rain effect is active', () => {
    const sim = createSim(b, 1, {
      startLevel: 16,
      bestLevel: 16,
      startEnergy: 100,
      loadout: ['shield', 'mangoRain'],
    });

    sim.useSkill(1);
    sim.drainEvents();

    // Attempt second cast while rain is active
    sim.useSkill(1);
    expect(sim.drainEvents()).toEqual([
      { type: 'skillRejected', slot: 1, skill: 'mangoRain', reason: 'active' },
    ]);
  });

  // --------------------------------------------------------------------------
  // Group 7: Rain Mango Lifecycle & Non-Interference (MEC-006-R31, R33, MEC-002-R3, R11)
  // --------------------------------------------------------------------------

  it('QA-P1T7-27 MEC-006-R31 rain mango lives 8000 ms, vanishes with rainMangoExpired, never rots', () => {
    // MEC-006-R31: lives 8000 ms, blinks last 2000 ms, vanishes with rainMangoExpired, no rotted event, no rock
    const s = buildState(b, { snake: SQUARE_SNAKE, dir: [0, 1], spawnInMs: QUIET, mango: [15, 15], mangoLeftMs: 1_000_000 });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.rainMangoes = [{ x: 10, y: 10, ageMs: 0, castId: 1 } as any];

    const sim = restoreSim(b, s);
    circleSim(sim, 7999, s.tickMs);
    expect(sim.snapshot().rainMangoes).toEqual([{ x: 10, y: 10, leftMs: 1 }]);
    expect(sim.drainEvents().some(e => e.type === 'rainMangoExpired')).toBe(false);

    circleSim(sim, 1, s.tickMs);
    expect(sim.snapshot().rainMangoes).toEqual([]);
    expect(sim.snapshot().rottenRocks).toEqual([]);
    const events = sim.drainEvents();
    expect(events).toContainEqual({ type: 'rainMangoExpired', x: 10, y: 10 });
    expect(events.some(e => e.type === 'rotted')).toBe(false);
  });

  it('QA-P1T7-28 MEC-002-R3/MEC-006-R33 eating rain mangoes does not change eatenInLevel or eatenInRun', () => {
    // MEC-006-R33: Rain mangoes do not change MEC-002-R3 counters, regular mango kept and unaffected
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [12, 12],
      mangoLeftMs: 8000,
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.rainMangoes = [{ x: 3, y: 8, ageMs: 0, castId: 1 } as any];
    s.rainBudgets = [{ castId: 1, left: 3 }];

    const sim = restoreSim(b, s);
    sim.advance(s.tickMs); // head moves to (3, 8), eats rain mango

    const snap = sim.snapshot();
    expect(snap.snake[0]).toEqual({ x: 3, y: 8 });
    expect(snap.eatenInLevel).toBe(0);
    expect(snap.eatenInRun).toBe(0);
    expect(snap.mango).toMatchObject({ x: 12, y: 12, leftMs: 8000 - s.tickMs });
    expect(sim.drainEvents()).toContainEqual({
      type: 'ate',
      x: 3,
      y: 8,
      golden: false,
      points: b.mango.points.normal,
      progressGain: 1,
      source: 'rain',
    });
  });

  // --------------------------------------------------------------------------
  // Group 8: Eating Rain Mangoes, Budget Capping, Level-Up & Event Order (MEC-006-R32, R34, ARCHITECTURE)
  // --------------------------------------------------------------------------

  it('QA-P1T7-29 MEC-006-R32 progress capped by cast budget; extra rain mangoes give score and growth only', () => {
    // MEC-006-R32: budget = 2; eating 3 rain mangoes: first 2 progressGain 1, 3rd progressGain 0
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
      mangoLeftMs: 1_000_000,
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.progress = 0;
    s.score = 0;
    s.rainBudgets = [{ castId: 1, left: 2 }];
    s.rainMangoes = [
      { x: 3, y: 8, ageMs: 0, castId: 1 },
      { x: 4, y: 8, ageMs: 0, castId: 1 },
      { x: 5, y: 8, ageMs: 0, castId: 1 },
    ] as any[];

    const sim = restoreSim(b, s);
    sim.advance(3 * s.tickMs);

    const ateEvents = sim.drainEvents().filter(e => e.type === 'ate') as Extract<SimEvent, { type: 'ate' }>[];
    expect(ateEvents).toHaveLength(3);
    expect(ateEvents.map(e => e.progressGain)).toEqual([1, 1, 0]);
    expect(ateEvents.map(e => e.points)).toEqual([1, 1, 1]);

    const snap = sim.snapshot();
    expect(snap.progress).toBe(2);
    expect(snap.score).toBe(3);
    expect(snap.length).toBe(6); // 3 original + 3 grown
  });

  it('QA-P1T7-30 MEC-006-R34 rain mango can complete level quota; rain and budget continue across a level up', () => {
    // MEC-006-R34: progress completes quota -> level up; rain, remaining drops & budget continue
    const need = quota(b, 16);
    const s = buildState(b, {
      level: 16,
      progress: need - 1,
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
      mangoLeftMs: 1_000_000,
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.rampActive = false; // Disable speed ramp so tickMs is exact levelTickMs(16)
    s.tickMs = levelTickMs(b, 16);
    s.rain = { castId: 1, leftMs: 3000, elapsedMs: 3000, drops: 6, dropped: 4 };
    s.rainBudgets = [{ castId: 1, left: 3 }];
    s.rainMangoes = [{ x: 3, y: 8, ageMs: 0, castId: 1 } as any];

    const sim = restoreSim(b, s);
    sim.advance(s.tickMs);

    const snap = sim.snapshot();
    expect(snap.level).toBe(17);
    expect(snap.progress).toBe(0);
    expect(snap.length).toBe(4); // length reset on level up
    expect(snap.rain).toEqual({ leftMs: 3000 - s.tickMs, dropsLeft: 2 });
    sim.advance(10); // the rain timer keeps advancing after the level up
    expect(sim.snapshot().rain!.leftMs).toBe(3000 - s.tickMs - 10);

  });

  it('QA-P1T7-31 ARCHITECTURE sim step order 12.4 event order when rain mango clears level', () => {
    // Event order inside step: ate -> shrunk -> levelUp -> rampEnded (if ramp active)
    const need = quota(b, 16);
    const s = buildState(b, {
      level: 16,
      progress: need - 1,
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
      mangoLeftMs: 1_000_000,
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.startLevel = 12; // Checkpoint start gives active speed ramp
    s.rampActive = true;
    s.rampEaten = 0;
    s.rainBudgets = [{ castId: 1, left: 3 }];
    s.rainMangoes = [{ x: 3, y: 8, ageMs: 0, castId: 1 } as any];

    const sim = restoreSim(b, s);
    // At ramp k=0, effective tick is 140 ms
    sim.advance(140);

    const types = sim.drainEvents().map(e => e.type);
    expect(types).toEqual(['ate', 'shrunk', 'levelUp', 'rampEnded']);
  });

  it('QA-P1T7-32 MEC-008-R8 eating rain mango advances speed ramp', () => {
    // Checkpoint start with speed ramp active: eating rain mango decrements rampMangoesLeft
    const s = buildState(b, {
      level: 12,
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
      mangoLeftMs: 1_000_000,
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    s.startLevel = 12; // Checkpoint start sets startLevel
    s.rampActive = true;
    s.rampEaten = 0;
    s.rainBudgets = [{ castId: 1, left: 3 }];
    s.rainMangoes = [{ x: 3, y: 8, ageMs: 0, castId: 1 } as any];

    const sim = restoreSim(b, s);
    expect(sim.snapshot().rampMangoesLeft).toBe(5);

    sim.advance(141);
    expect(sim.snapshot().rampMangoesLeft).toBe(4);
    expect(sim.snapshot().tickMs).toBe(136); // ramp tick for k = 1 at L12
  });

  // --------------------------------------------------------------------------
  // Group 9: Step Order Edge Cases & Fuzz
  // --------------------------------------------------------------------------

  it('QA-P1T7-33 ARCHITECTURE step 11 rain mango expiry precedes step 12.3 eating', () => {
    // Step 11: Rain mango expires and is removed. Step 12: snake steps into cell.
    // If mango expires at the exact ms head enters, mango is already gone and not eaten.
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
      mangoLeftMs: 1_000_000,
    });
    s.loadout = ['shield', 'mangoRain'];
    s.bestLevel = 16;
    // Rain mango with 1 ms left
    s.rainMangoes = [{ x: 3, y: 8, ageMs: 7999, castId: 1 } as any];
    // Snake accumulator primed so snake steps on next ms
    s.acc = s.tickMs - 1;

    const sim = restoreSim(b, s);
    sim.advance(1);

    const events = sim.drainEvents();
    expect(events.some(e => e.type === 'rainMangoExpired')).toBe(true);
    expect(events.some(e => e.type === 'ate')).toBe(false);
    expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 8 });
  });

  it('QA-P1T7-34 MEC-006 P1 skill fuzz seed verification', () => {
    // Seeds 1 and 2 run for 2000 ms to verify invariants (energy, length, placements, budgets)
    for (const seed of [1, 2]) {
      const rep = p1FuzzSeed(b, seed, 2000);
      expect(rep.violations).toEqual([]);
    }
  });

  it('QA-P1T7-35 MEC-006-R27 skills may be used during the Shield bonk pause under normal useSkill rules', () => {
    // MEC-006-R27: "Skills may also be used during the bonk, under the normal useSkill rules (owner, 2026-11-04)."
    const s = buildState(b, {
      snake: [[2, 8], [1, 8], [0, 8]],
      dir: [1, 0],
      spawnInMs: QUIET,
      mango: [15, 15],
    });
    s.loadout = ['shield', 'slowmo'];
    s.bestLevel = 16;
    s.energy = 90; // 50 for shield, 40 for slowmo
    addTimedHazards(s, {
      family: 'rock',
      state: 'solid',
      t: 2000,
      warnMs: 1500,
      lifeMs: 60000,
      landed: true,
      cells: [{ x: 3, y: 8, on: true, ageMs: 2000 }],
    } as any);

    const sim = restoreSim(b, s);
    sim.useSkill(0); // Activate shield (energy 90 -> 40)
    sim.advance(s.tickMs); // Break rock at (3, 8), bonk pause begins: acc = -3 * tickMs
    expect(sim.drainEvents().some(e => e.type === 'shieldBroke')).toBe(true);

    // During bonk pause (advance 1 tick; accumulator is still negative)
    sim.advance(s.tickMs);

    // 1. Using available skill under normal useSkill rules succeeds
    sim.useSkill(1); // Cast slowmo (cost 40, energy 40 -> 0)
    const events = sim.drainEvents();
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'skillUsed', slot: 1, skill: 'slowmo' }),
    );
    expect(sim.snapshot().slowmo).not.toBeNull();
    expect(sim.snapshot().energy).toBe(0);

    // 2. Using skill with insufficient energy rejects with 'energy'
    sim.useSkill(0);
    const rejectEnergy = sim.drainEvents();
    expect(rejectEnergy).toContainEqual(
      expect.objectContaining({ type: 'skillRejected', slot: 0, reason: 'energy' }),
    );
  });
});
