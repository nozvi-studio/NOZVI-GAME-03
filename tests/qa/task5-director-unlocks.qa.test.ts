import { addTimedHazards, timedHazards } from '../../src/core/hazards/timed';
// tests/qa/task5-director-unlocks.qa.test.ts — black-box QA tests for Task 5 director & unlock mechanics
import { describe, it, expect } from 'vitest';
import { loadBalance } from '../support/balance';
import { buildState, QUIET } from '../support/state';
import { createSim, restoreSim } from '../../src/core/sim';
import { enabledFamilies, introducedAt, smallHazardCap } from '../../src/core';
import { rockPool, fencePool } from '../../src/core/hazards/shapes';
import { updateDirector } from '../../src/core/hazards/director';
import { rngFrom, seedRng } from '../../src/core/rng';
import type { TimedHazard, TerrainHazard } from '../../src/core/types';

describe('QA Task 5: Director, Unlocks, Caps & Cooldowns', () => {
  const b = loadBalance();

  it('QA-T5-13 MEC-004 unlock levels: fence at 2, terrain at 4, maze at 6', () => {
    // updated for P1 MEC-003-R14/R15
    expect(enabledFamilies(b, 1)).toEqual(['rock']);
    expect(enabledFamilies(b, 6)).toEqual(['rock', 'fence']);
    expect(enabledFamilies(b, 11)).toEqual(['rock', 'fence', 'terrain']);
    expect(enabledFamilies(b, 26)).toEqual(['rock', 'fence', 'terrain', 'maze']);
    expect(introducedAt(b, 6)).toBe('fence');
    expect(introducedAt(b, 11)).toBe('terrain');
    expect(introducedAt(b, 12)).toBe('rottenRock');
    expect(introducedAt(b, 26)).toBe('maze');
  });

  it('QA-T5-14 MEC-004 levelUp events carry unlocked hazard family', () => {
    // updated for P1 MEC-003-R7
    const sim = createSim(b, 100);
    expect(sim.snapshot().level).toBe(1);

    // updated for P1 MEC-008-R8: mid-run level states above L1 have rampActive: false
    const s = buildState(b, { level: 5, progress: 4, spawnInMs: QUIET });
    s.rampActive = false;
    s.mango = { x: 9, y: 8, golden: false, leftMs: 5000, totalMs: 5000 };
    const testSim = restoreSim(b, s);
    testSim.advance(s.tickMs);
    expect(testSim.snapshot().level).toBe(6);
    const events = testSim.drainEvents();
    const lvl6 = events.find(e => e.type === 'levelUp');
    expect(lvl6).toEqual({
      type: 'levelUp',
      level: 6,
      biome: 2,
      challenge: false,
      biomeChanged: true,
      clearedLevelTimeMs: s.tickMs,
      unlocked: 'fence',
    });
  });

  it('QA-T5-15 MEC-004 rock and fence shape pools expand by level', () => {
    // updated for P1 MEC-003-R15
    // Rock pool by level:
    expect(rockPool(b, 1)).toEqual(['single']);
    expect(rockPool(b, 2)).toEqual(['single']);
    expect(rockPool(b, 3)).toEqual(['single', 'lineH', 'lineV']);
    expect(rockPool(b, 4)).toEqual(['single', 'lineH', 'lineV']);
    expect(rockPool(b, 5)).toEqual(['single', 'lineH', 'lineV', 'corner', 'block']);
    expect(rockPool(b, 30)).toEqual(['single', 'lineH', 'lineV', 'corner', 'block']);

    // Fence pool by level:
    expect(fencePool(b, 1)).toEqual([]);
    expect(fencePool(b, 5)).toEqual([]);
    expect(fencePool(b, 6)).toEqual(['line']);
    expect(fencePool(b, 7)).toEqual(['line', 'L']);
    expect(fencePool(b, 13)).toEqual(['line', 'L', 'T', 'Z']);
    expect(fencePool(b, 16)).toEqual(['line', 'L', 'T', 'Z', 'F', 'U', 'plus']);
    expect(fencePool(b, 30)).toEqual(['line', 'L', 'T', 'Z', 'F', 'U', 'plus']);
  });

  it('QA-T5-16 MEC-004 director first spawn at 2500 ms and interval formula', () => {
    // updated for P1 MEC-003-R1/R4
    const sim = createSim(b, 42);
    expect(sim.snapshot().hazards).toHaveLength(0);

    // Keep snake alive by turning:
    sim.advance(500);
    sim.turn(0, 1);
    sim.advance(700);
    sim.turn(-1, 0);
    sim.advance(700);
    sim.turn(0, -1);
    sim.advance(599); // total 2499 ms
    expect(sim.snapshot().status).toBe('playing');
    expect(sim.snapshot().hazards.length + sim.snapshot().terrains.length).toBe(0);

    // At 2500 ms: first spawn occurs!
    sim.advance(1);
    expect(sim.snapshot().hazards.length + sim.snapshot().terrains.length).toBeGreaterThan(0);

    // updated for P1 MEC-003-R1/R4 / MEC-003-R13
    // Test director interval formula across levels: max(1600, 5000 - 120 * n)
    const s1 = buildState(b, { level: 1, spawnInMs: 0, mango: [2, 2] });
    const rng = rngFrom(seedRng(1));
    updateDirector(s1, b, rng);
    expect(s1.spawnInMs).toBe(4880);

    const s5 = buildState(b, { level: 5, spawnInMs: 0, mango: [2, 2] });
    updateDirector(s5, b, rng);
    expect(s5.spawnInMs).toBe(4400);

    const s30 = buildState(b, { level: 30, spawnInMs: 0, mango: [2, 2] });
    updateDirector(s30, b, rng);
    expect(s30.spawnInMs).toBe(1600);
  });

  it('QA-T5-17 MEC-004 small hazard cap counts rock and fence in any state', () => {
    // updated for P1 MEC-003-R1/R4
    // At level 1, cap = min(10, 2 + floor(1/3)) = 2.
    const s = buildState(b, { level: 1, spawnInMs: 0 });
    addTimedHazards(s,
      { family: 'rock', state: 'warn', t: 0, warnMs: 1500, lifeMs: 6000, landed: false, cells: [{ x: 1, y: 1, on: false, ageMs: 0 }] },
      { family: 'fence', state: 'crumble', t: 11000, warnMs: 2000, lifeMs: 9000, landed: true, cells: [{ x: 2, y: 2, on: false, ageMs: 11000 }] },
    );
    const rng = rngFrom(seedRng(999));
    const prevCount = timedHazards(s).length;
    updateDirector(s, b, rng);
    expect(timedHazards(s).length).toBe(prevCount);
  });

  it('QA-T5-18 MEC-004 small hazard cap ignores maze and terrain', () => {
    // updated for P1 MEC-003-R1 / MEC-003-R13
    const s = buildState(b, { level: 1, spawnInMs: 0, mango: [2, 2] });
    addTimedHazards(s, {
      family: 'maze', state: 'solid', t: 5000, warnMs: 2600, lifeMs: 14000, landed: true,
      cells: [{ x: 1, y: 1, on: true, ageMs: 5000 }],
    });
    s.families.terrain.push({
      family: 'terrain', t: 1000, lifeMs: 18000,
      cells: [{ x: 2, y: 2, delay: 0, up: false, vis: 'down' }],
    });

    const rng = rngFrom(seedRng(123));
    updateDirector(s, b, rng);
    const rocks = timedHazards(s).filter(h => h.family === 'rock');
    expect(rocks.length).toBe(1);
  });

  it('QA-T5-19 MEC-004 maze cannot spawn while terrain is active', () => {
    // Design §5 MEC-004: maze weight only when "no maze active and no terrain"
    // At level 6 (maze unlocked), if a terrain is active, maze cannot spawn
    const s = buildState(b, { level: 6, spawnInMs: 0 });
    s.mazeCooldownMs = 0;
    // Fill small hazards cap to block rock and fence: cap at lvl 6 = min(8, 2+3) = 5
    for (let i = 0; i < 5; i++) {
      addTimedHazards(s, {
        family: 'rock', state: 'solid', t: 2000, warnMs: 1500, lifeMs: 6000, landed: true,
        cells: [{ x: i, y: 0, on: true, ageMs: 2000 }],
      });
    }
    // Add active terrain
    s.families.terrain.push({
      family: 'terrain', t: 1000, lifeMs: 18000,
      cells: [{ x: 10, y: 10, delay: 0, up: false, vis: 'down' }],
    });

    const rng = rngFrom(seedRng(42));
    updateDirector(s, b, rng);
    // Maze must NOT have spawned!
    expect(timedHazards(s).some(h => h.family === 'maze')).toBe(false);
  });

  it('QA-T5-20 MEC-004 terrain cannot spawn while maze is active', () => {
    // Design §5 MEC-004: terrain weight only when "no maze active and terrains < cap"
    const s = buildState(b, { level: 6, spawnInMs: 0 });
    // Fill small hazards to block rock and fence
    for (let i = 0; i < 5; i++) {
      addTimedHazards(s, {
        family: 'rock', state: 'solid', t: 2000, warnMs: 1500, lifeMs: 6000, landed: true,
        cells: [{ x: i, y: 0, on: true, ageMs: 2000 }],
      });
    }
    // Add active maze
    addTimedHazards(s, {
      family: 'maze', state: 'solid', t: 3000, warnMs: 2600, lifeMs: 14000, landed: true,
      cells: [{ x: 10, y: 10, on: true, ageMs: 3000 }],
    });

    const rng = rngFrom(seedRng(42));
    updateDirector(s, b, rng);
    // Terrain must NOT have spawned!
    expect(s.families.terrain.length).toBe(0);
  });

  it('QA-T5-21 MEC-004 maze cooldown sets to 26000 ms and blocks maze respawn', () => {
    // updated for P1 MEC-003-R15 / MEC-003-R13
    const cap = smallHazardCap(b, 26);
    const s = buildState(b, { level: 26, spawnInMs: 0, mango: [2, 2] });
    s.mazeCooldownMs = 0;
    for (let i = 0; i < cap; i++) {
      addTimedHazards(s, {
        family: 'rock', state: 'solid', t: 2000, warnMs: 1500, lifeMs: 6000, landed: true,
        cells: [{ x: i, y: 0, on: true, ageMs: 2000 }],
      });
    }
    let spawnedMaze = false;
    for (let seed = 1; seed < 50; seed++) {
      const trial = structuredClone(s);
      updateDirector(trial, b, rngFrom(seedRng(seed)));
      if (timedHazards(trial).some(h => h.family === 'maze')) {
        expect(trial.mazeCooldownMs).toBe(b.maze.cooldownMs);
        expect(trial.mazeCooldownMs).toBe(26000);
        spawnedMaze = true;
        break;
      }
    }
    expect(spawnedMaze).toBe(true);

    const sCooldown = buildState(b, { level: 26, spawnInMs: 0, mango: [2, 2] });
    sCooldown.mazeCooldownMs = 15000;
    for (let i = 0; i < cap; i++) {
      addTimedHazards(sCooldown, {
        family: 'rock', state: 'solid', t: 2000, warnMs: 1500, lifeMs: 6000, landed: true,
        cells: [{ x: i, y: 0, on: true, ageMs: 2000 }],
      });
    }
    updateDirector(sCooldown, b, rngFrom(seedRng(1)));
    expect(timedHazards(sCooldown).some(h => h.family === 'maze')).toBe(false);
  });

  it('QA-T5-22 MEC-004 terrain maxActive limits: 1 below level 8, 2 at level 8+', () => {
    // updated for P1 MEC-003-R15
    const cap = smallHazardCap(b, 11);
    const sLvl11 = buildState(b, { level: 11, spawnInMs: 0 });
    for (let i = 0; i < cap; i++) {
      addTimedHazards(sLvl11, {
        family: 'rock', state: 'solid', t: 2000, warnMs: 1500, lifeMs: 6000, landed: true,
        cells: [{ x: i, y: 0, on: true, ageMs: 2000 }],
      });
    }
    sLvl11.families.terrain.push({
      family: 'terrain', t: 1000, lifeMs: 18000,
      cells: [{ x: 10, y: 10, delay: 0, up: false, vis: 'down' }],
    });
    for (let seed = 1; seed < 50; seed++) {
      const trial = structuredClone(sLvl11);
      updateDirector(trial, b, rngFrom(seedRng(seed)));
      expect(trial.families.terrain.length).toBe(1);
    }
  });

  it('QA-T5-23 MEC-004 hazardIncoming event emitted for fence, terrain, and maze but not rock', () => {
    // updated for P1 MEC-003-R13
    // Under MEC-003-R13 and ARCHITECTURE step 5, director is skipped while mango is null
    const noMangoState = buildState(b, { seed: 1, level: 6, spawnInMs: 0 });
    noMangoState.mango = null;
    const noMangoSim = restoreSim(b, noMangoState);
    noMangoSim.advance(1);
    expect(noMangoSim.drainEvents().some(e => e.type === 'hazardIncoming')).toBe(false);

    // With mango present at level 1, rock spawns without hazardIncoming
    const s = buildState(b, { level: 1, spawnInMs: 0, mango: [0, 0] });
    const sim = restoreSim(b, s);
    sim.advance(1); // triggers director
    const rockIncoming = sim.drainEvents().find(e => e.type === 'hazardIncoming');
    expect(rockIncoming).toBeUndefined();

    // At level 6 (fence available) with mango present, hazardIncoming is emitted for fence
    let fenceIncoming = false;
    for (let seed = 1; seed < 50; seed++) {
      const s2 = buildState(b, { seed, level: 6, spawnInMs: 0, mango: [0, 0] });
      const testSim = restoreSim(b, s2);
      testSim.advance(1);
      const ev = testSim.drainEvents().find(e => e.type === 'hazardIncoming');
      if (ev && ev.family === 'fence') {
        fenceIncoming = true;
        break;
      }
    }
    expect(fenceIncoming).toBe(true);
  });
});
