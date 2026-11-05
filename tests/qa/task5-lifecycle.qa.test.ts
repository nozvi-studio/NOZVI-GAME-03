// tests/qa/task5-lifecycle.qa.test.ts — black-box QA tests for Task 5 hazard lifecycle & passability
import { instanceFamily } from '../support/instanceFamily';
import { addTimedHazards } from '../../src/core/hazards/timed';
import { describe, it, expect } from 'vitest';
import { loadBalance } from '../support/balance';
import { buildState, QUIET } from '../support/state';
import { restoreSim, stateOf } from '../../src/core/sim';
import { makeTimed, updateTimed, timedSolidAt } from '../../src/core/hazards/timed';
import { TERRAIN, terrainWant } from '../../src/core/hazards/terrain';
import type { SimEvent, StepCtx, TerrainHazard, TimedHazard } from '../../src/core/types';

describe('QA Task 5: Hazard Lifecycle, Passability & Death Causes', () => {
  const b = loadBalance();

  it('QA-T5-01 MEC-004 rock lifecycle warn -> solid -> crumble -> remove with exact ms', () => {
    // Design §5 MEC-004: warn 1500, life 6000, crumble 450
    const events: SimEvent[] = [];
    const ctx: StepCtx = { balance: b, snakeOn: () => false, emit: e => events.push(e) };
    const rock = makeTimed('rock', [{ x: 5, y: 5 }], 1500, 6000);

    for (let i = 0; i < 1499; i++) {
      expect(updateTimed(rock, ctx)).toBe('keep');
      expect(rock.state).toBe('warn');
      expect(rock.cells[0]?.on).toBe(false);
    }

    // 1500th ms: enters solid, lands
    expect(updateTimed(rock, ctx)).toBe('keep');
    expect(rock.state).toBe('solid');
    expect(rock.cells[0]?.on).toBe(true);
    expect(rock.landed).toBe(true);

    // Remains solid for 6000 ms (until t = 7500)
    for (let i = 0; i < 5999; i++) {
      expect(updateTimed(rock, ctx)).toBe('keep');
      expect(rock.state).toBe('solid');
      expect(rock.cells[0]?.on).toBe(true);
    }

    // 7500th ms: enters crumble, cell turns off
    expect(updateTimed(rock, ctx)).toBe('keep');
    expect(rock.state).toBe('crumble');
    expect(rock.cells[0]?.on).toBe(false);

    // Remains in crumble for 450 ms (until t = 7950)
    for (let i = 0; i < 449; i++) {
      expect(updateTimed(rock, ctx)).toBe('keep');
      expect(rock.state).toBe('crumble');
      expect(rock.cells[0]?.on).toBe(false);
    }

    // Exactly at t = 7950: removed
    expect(updateTimed(rock, ctx)).toBe('remove');
  });

  it('QA-T5-02 MEC-004 fence lifecycle warn -> solid -> crumble -> remove with exact ms', () => {
    // Design §5 MEC-004: fence warn 2000, life 9000, crumble 450
    const ctx: StepCtx = { balance: b, snakeOn: () => false, emit: () => {} };
    const fence = makeTimed('fence', [{ x: 4, y: 4 }], 2000, 9000, 'L');

    for (let i = 0; i < 2000; i++) updateTimed(fence, ctx);
    expect(fence.state).toBe('solid');
    expect(fence.cells[0]?.on).toBe(true);

    for (let i = 0; i < 9000; i++) updateTimed(fence, ctx);
    expect(fence.state).toBe('crumble');
    expect(fence.cells[0]?.on).toBe(false);

    for (let i = 0; i < 449; i++) updateTimed(fence, ctx);
    expect(fence.state).toBe('crumble');

    expect(updateTimed(fence, ctx)).toBe('remove');
  });

  it('QA-T5-03 MEC-004 maze lifecycle warn -> solid -> crumble -> remove with exact ms', () => {
    // Design §5 MEC-004: maze warn 2600, life 14000, crumble 450
    const ctx: StepCtx = { balance: b, snakeOn: () => false, emit: () => {} };
    const maze = makeTimed('maze', [{ x: 3, y: 3 }], 2600, 14000);

    for (let i = 0; i < 2600; i++) updateTimed(maze, ctx);
    expect(maze.state).toBe('solid');
    expect(maze.cells[0]?.on).toBe(true);

    for (let i = 0; i < 14000; i++) updateTimed(maze, ctx);
    expect(maze.state).toBe('crumble');

    for (let i = 0; i < 450; i++) {
      const res = updateTimed(maze, ctx);
      if (i === 449) expect(res).toBe('remove');
      else expect(res).toBe('keep');
    }
  });

  it('QA-T5-04 MEC-004 landing emits landed and dust events', () => {
    // Design §5 MEC-004: "The first cell that lands emits landed; every landing cell emits dust."
    const events: SimEvent[] = [];
    const ctx: StepCtx = { balance: b, snakeOn: () => false, emit: e => events.push(e) };
    const rock = makeTimed('rock', [{ x: 5, y: 5 }, { x: 6, y: 5 }], 1500, 6000);

    for (let i = 0; i < 1500; i++) updateTimed(rock, ctx);

    const landedEvents = events.filter(e => e.type === 'landed');
    const dustEvents = events.filter(e => e.type === 'dust');
    expect(landedEvents).toEqual([{ type: 'landed', hazardType: 'rock' }]);
    expect(dustEvents).toEqual([
      { type: 'dust', x: 5, y: 5 },
      { type: 'dust', x: 6, y: 5 },
    ]);
  });

  it('QA-T5-05 MEC-004 timed cell stays warning when snake is on it at landing time', () => {
    // Design §5 MEC-004: "In solid, a cell turns on only when the snake is not on it; until then it keeps warning."
    const events: SimEvent[] = [];
    let snakePresent = true;
    const ctx: StepCtx = {
      balance: b,
      snakeOn: (x, y) => snakePresent && x === 5 && y === 5,
      emit: e => events.push(e),
    };
    const rock = makeTimed('rock', [{ x: 5, y: 5 }], 1500, 6000);

    for (let i = 0; i < 1500; i++) updateTimed(rock, ctx);

    // Hazard transitioned to 'solid' state, but cell must NOT be on!
    expect(rock.state).toBe('solid');
    expect(rock.cells[0]?.on).toBe(false);
    expect(timedSolidAt(rock, 5, 5)).toBe(false);
    expect(events.filter(e => e.type === 'landed')).toHaveLength(0);
    expect(events.filter(e => e.type === 'dust')).toHaveLength(0);
  });

  it('QA-T5-06 MEC-004 timed cell turns solid when snake leaves', () => {
    let snakePresent = true;
    const events: SimEvent[] = [];
    const ctx: StepCtx = {
      balance: b,
      snakeOn: (x, y) => snakePresent && x === 5 && y === 5,
      emit: e => events.push(e),
    };
    const rock = makeTimed('rock', [{ x: 5, y: 5 }], 1500, 6000);

    for (let i = 0; i < 1500; i++) updateTimed(rock, ctx);
    expect(rock.cells[0]?.on).toBe(false);

    // Snake moves away
    snakePresent = false;
    updateTimed(rock, ctx);

    expect(rock.cells[0]?.on).toBe(true);
    expect(timedSolidAt(rock, 5, 5)).toBe(true);
    expect(events.filter(e => e.type === 'landed')).toHaveLength(1);
    expect(events.filter(e => e.type === 'dust')).toHaveLength(1);
  });

  it('QA-T5-07 MEC-004 warning and crumbling hazard cells are passable by snake', () => {
    // Design §5 MEC-001: "a hazard cell only when on (warning, crumbling and not-yet-landed cells are passable)"
    const s = buildState(b, { snake: [[8, 8], [7, 8], [6, 8]], dir: [1, 0], spawnInMs: QUIET });
    // Add a rock at (9, 8) in 'warn' state
    const warnRock: TimedHazard = {
      family: 'rock', state: 'warn', t: 500, warnMs: 1500, lifeMs: 6000, landed: false,
      cells: [{ x: 9, y: 8, on: false, ageMs: 500 }],
    };
    addTimedHazards(s, warnRock);

    const sim = restoreSim(b, s);
    // Snake advances one step into (9, 8)
    sim.advance(s.tickMs);
    const snap = sim.snapshot();
    expect(snap.status).toBe('playing');
    expect(snap.snake[0]).toEqual({ x: 9, y: 8 });

    // Now test crumble passability
    const s2 = buildState(b, { snake: [[8, 8], [7, 8], [6, 8]], dir: [1, 0], spawnInMs: QUIET });
    const crumbleRock: TimedHazard = {
      family: 'rock', state: 'crumble', t: 7600, warnMs: 1500, lifeMs: 6000, landed: true,
      cells: [{ x: 9, y: 8, on: false, ageMs: 7600 }],
    };
    addTimedHazards(s2, crumbleRock);
    const sim2 = restoreSim(b, s2);
    sim2.advance(s2.tickMs);
    expect(sim2.snapshot().status).toBe('playing');
    expect(sim2.snapshot().snake[0]).toEqual({ x: 9, y: 8 });
  });

  it('QA-T5-08 MEC-004 terrain cycle down -> warn -> up -> down timing', () => {
    // Design §5 MEC-004: start delay 600, period 3400 = down 1100 -> warn 900 -> up 1400
    const terrain: TerrainHazard = {
      family: 'terrain', t: 0, lifeMs: 18000,
      cells: [{ x: 5, y: 5, delay: 0, up: false, vis: 'down' }],
    };
    const c = terrain.cells[0]!;

    // t < startDelayMs (600): 'down'
    terrain.t = 0;
    expect(terrainWant(terrain, c, b)).toBe('down');
    terrain.t = 599;
    expect(terrainWant(terrain, c, b)).toBe('down');

    // down stage: 600 to 600 + 1100 = 1700
    terrain.t = 600;
    expect(terrainWant(terrain, c, b)).toBe('down');
    terrain.t = 1699;
    expect(terrainWant(terrain, c, b)).toBe('down');

    // warn stage: 1700 to 1700 + 900 = 2600
    terrain.t = 1700;
    expect(terrainWant(terrain, c, b)).toBe('warn');
    terrain.t = 2599;
    expect(terrainWant(terrain, c, b)).toBe('warn');

    // up stage: 2600 to 2600 + 1400 = 4000
    terrain.t = 2600;
    expect(terrainWant(terrain, c, b)).toBe('up');
    terrain.t = 3999;
    expect(terrainWant(terrain, c, b)).toBe('up');

    // Next cycle starts: 4000 is down again (4000 - 600 = 3400 = 0 mod 3400)
    terrain.t = 4000;
    expect(terrainWant(terrain, c, b)).toBe('down');
  });

  it('QA-T5-09 MEC-004 terrain cell stays warn if snake on cell when wanting to rise', () => {
    // Design §5 MEC-004: "A cell that wants to rise while the snake is on it stays warn."
    const terrain: TerrainHazard = {
      family: 'terrain', t: 2600, lifeMs: 18000,
      cells: [{ x: 5, y: 5, delay: 0, up: false, vis: 'warn' }],
    };
    const ctx: StepCtx = {
      balance: b,
      snakeOn: (x, y) => x === 5 && y === 5,
      emit: () => {},
    };

    instanceFamily(TERRAIN).update(terrain, ctx);
    // Even though terrainWant is 'up' at t=2600, cell must remain 'warn' and not 'up'
    expect(terrain.cells[0]?.vis).toBe('warn');
    expect(terrain.cells[0]?.up).toBe(false);
  });

  it('QA-T5-10 MEC-004 terrain down and warn states are passable', () => {
    // Design §5 MEC-001: "a terrain cell only when up (down and warn are passable)"
    const s = buildState(b, { snake: [[8, 8], [7, 8], [6, 8]], dir: [1, 0], spawnInMs: QUIET });
    s.families.terrain.push({
      family: 'terrain', t: 1800, lifeMs: 18000,
      cells: [{ x: 9, y: 8, delay: 0, up: false, vis: 'warn' }],
    });

    const sim = restoreSim(b, s);
    sim.advance(s.tickMs);
    expect(sim.snapshot().status).toBe('playing');
    expect(sim.snapshot().snake[0]).toEqual({ x: 9, y: 8 });
  });

  it('QA-T5-11 MEC-004 terrain lifetime expired all cells go down and removed after fadeOutMs', () => {
    // Design §5 MEC-004: "After life, all cells go down and the terrain is removed 500 ms later."
    const terrain: TerrainHazard = {
      family: 'terrain', t: 18000, lifeMs: 18000,
      cells: [{ x: 5, y: 5, delay: 0, up: true, vis: 'up' }],
    };
    const ctx: StepCtx = { balance: b, snakeOn: () => false, emit: () => {} };

    // At lifeMs, all cells must go down
    const keep1 = instanceFamily(TERRAIN).update(terrain, ctx);
    expect(keep1).toBe('keep');
    expect(terrain.cells[0]?.vis).toBe('down');
    expect(terrain.cells[0]?.up).toBe(false);

    // After 500 ms (b.terrain.fadeOutMs), it is removed
    for (let i = 0; i < 498; i++) {
      expect(instanceFamily(TERRAIN).update(terrain, ctx)).toBe('keep');
    }
    expect(instanceFamily(TERRAIN).update(terrain, ctx)).toBe('remove');
  });

  it('QA-T5-12 MEC-004 death cause per family: rock, fence, maze, ground', () => {
    // Design §4.1: rock->'rock', fence->'fence', maze->'maze', terrain->'ground'
    const families: Array<{ family: 'rock' | 'fence' | 'maze'; cause: string }> = [
      { family: 'rock', cause: 'rock' },
      { family: 'fence', cause: 'fence' },
      { family: 'maze', cause: 'maze' },
    ];

    for (const { family, cause } of families) {
      const s = buildState(b, { snake: [[8, 8], [7, 8], [6, 8]], dir: [1, 0], spawnInMs: QUIET });
      addTimedHazards(s, {
        family, state: 'solid', t: 2000, warnMs: 1000, lifeMs: 5000, landed: true,
        cells: [{ x: 9, y: 8, on: true, ageMs: 1000 }],
      });
      const sim = restoreSim(b, s);
      sim.advance(s.tickMs);
      const snap = sim.snapshot();
      expect(snap.status).toBe('over');
      expect(snap.outcome).toEqual({ won: false, cause });
      const death = sim.drainEvents().find(e => e.type === 'died');
      expect(death).toEqual({ type: 'died', cause, x: 8, y: 8 });
    }

    // Terrain ground death
    const sTerr = buildState(b, { snake: [[8, 8], [7, 8], [6, 8]], dir: [1, 0], spawnInMs: QUIET });
    sTerr.families.terrain.push({
      family: 'terrain', t: 3000, lifeMs: 18000,
      cells: [{ x: 9, y: 8, delay: 0, up: true, vis: 'up' }],
    });
    const simTerr = restoreSim(b, sTerr);
    simTerr.advance(sTerr.tickMs);
    const snapTerr = simTerr.snapshot();
    expect(snapTerr.status).toBe('over');
    expect(snapTerr.outcome).toEqual({ won: false, cause: 'ground' });
  });
});
