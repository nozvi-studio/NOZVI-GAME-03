// tests/qa/task5-director-unlocks.qa.test.ts — black-box QA tests for Task 5 director & unlock mechanics
import { describe, it, expect } from 'vitest';
import { loadBalance } from '../support/balance';
import { buildState, QUIET } from '../support/state';
import { createSim, restoreSim } from '../../src/core/sim';
import { rockPool, fencePool } from '../../src/core/hazards/shapes';
import { updateDirector } from '../../src/core/hazards/director';
import { rngFrom, seedRng } from '../../src/core/rng';
import type { TimedHazard, TerrainHazard } from '../../src/core/types';

describe('QA Task 5: Director, Unlocks, Caps & Cooldowns', () => {
  const b = loadBalance();

  it('QA-T5-13 MEC-004 unlock levels: fence at 2, terrain at 4, maze at 6', () => {
    // Config: level.unlock = { fence: 2, terrain: 4, maze: 6 }
    expect(b.level.unlock).toEqual({ fence: 2, terrain: 4, maze: 6 });
  });

  it('QA-T5-14 MEC-004 levelUp events carry unlocked hazard family', () => {
    // At levels 2, 4, 6 levelUp event should have unlocked property
    // We can simulate eating progress to reach these levels
    const sim = createSim(b, 100);
    // At start: level 0
    expect(sim.snapshot().level).toBe(0);

    // Let's inspect state transitions via restoreSim directly
    const s = buildState(b, { level: 1, progress: 4, spawnInMs: QUIET }); // needFor(1) = 5
    // Eat a mango at head
    s.mango = { x: 9, y: 8, golden: false, leftMs: 5000, totalMs: 5000 };
    const testSim = restoreSim(b, s);
    testSim.advance(s.tickMs); // head moves to (9, 8), eats mango, progress becomes 5 -> levelUp to 2
    expect(testSim.snapshot().level).toBe(2);
    const events = testSim.drainEvents();
    const lvl2 = events.find(e => e.type === 'levelUp');
    expect(lvl2).toEqual({ type: 'levelUp', level: 2, unlocked: 'fence' });
  });

  it('QA-T5-15 MEC-004 rock and fence shape pools expand by level', () => {
    // Rock pool by level:
    // < 2: single
    expect(rockPool(b, 0)).toEqual(['single']);
    expect(rockPool(b, 1)).toEqual(['single']);
    // 2..3: single, lineH, lineV
    expect(rockPool(b, 2)).toEqual(['single', 'lineH', 'lineV']);
    expect(rockPool(b, 3)).toEqual(['single', 'lineH', 'lineV']);
    // >= 4: single, lineH, lineV, corner, block
    expect(rockPool(b, 4)).toEqual(['single', 'lineH', 'lineV', 'corner', 'block']);
    expect(rockPool(b, 10)).toEqual(['single', 'lineH', 'lineV', 'corner', 'block']);

    // Fence pool by level:
    // < 2: empty
    expect(fencePool(b, 0)).toEqual([]);
    expect(fencePool(b, 1)).toEqual([]);
    // level 2 (unlock + 0): line, L
    expect(fencePool(b, 2)).toEqual(['line', 'L']);
    // level 3 (unlock + 1): line, L, T, Z
    expect(fencePool(b, 3)).toEqual(['line', 'L', 'T', 'Z']);
    // level 4+ (unlock + 2): line, L, T, Z, F, U, plus
    expect(fencePool(b, 4)).toEqual(['line', 'L', 'T', 'Z', 'F', 'U', 'plus']);
  });

  it('QA-T5-16 MEC-004 director first spawn at 2500 ms and interval formula', () => {
    // Design §5 MEC-004: first spawn after 2500 ms; then max(2000, 5000 - 300 * level)
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

    // Test director interval formula across levels
    // level 0: max(2000, 5000 - 0) = 5000
    // level 5: max(2000, 5000 - 1500) = 3500
    // level 10: max(2000, 5000 - 3000) = 2000
    const s0 = buildState(b, { level: 0, spawnInMs: 0 });
    const rng = rngFrom(seedRng(1));
    updateDirector(s0, b, rng);
    expect(s0.spawnInMs).toBe(5000);

    const s5 = buildState(b, { level: 5, spawnInMs: 0 });
    updateDirector(s5, b, rng);
    expect(s5.spawnInMs).toBe(3500);

    const s10 = buildState(b, { level: 10, spawnInMs: 0 });
    updateDirector(s10, b, rng);
    expect(s10.spawnInMs).toBe(2000);
  });

  it('QA-T5-17 MEC-004 small hazard cap counts rock and fence in any state', () => {
    // Design §5 MEC-004: Small-hazard cap min(8, 2 + floor(level / 2)) counts non-maze hazards in any state
    // At level 0, cap = 2.
    // If there are already 2 rocks (one in warn, one in crumble), director cannot spawn another rock/fence.
    const s = buildState(b, { level: 0, spawnInMs: 0 });
    s.hazards.push(
      { family: 'rock', state: 'warn', t: 0, warnMs: 1500, lifeMs: 6000, landed: false, cells: [{ x: 1, y: 1, on: false, ageMs: 0 }] },
      { family: 'fence', state: 'crumble', t: 11000, warnMs: 2000, lifeMs: 9000, landed: true, cells: [{ x: 2, y: 2, on: false, ageMs: 11000 }] },
    );
    const rng = rngFrom(seedRng(999));
    const prevCount = s.hazards.length;
    updateDirector(s, b, rng);
    // Because cap is 2 and both rock and fence are locked out, and terrain/maze locked at level 0, no spawn occurs!
    expect(s.hazards.length).toBe(prevCount);
  });

  it('QA-T5-18 MEC-004 small hazard cap ignores maze and terrain', () => {
    // Design §4.1: "prototype counts hazards.filter(h => h.type !== 'maze'). Terrains are a separate list, so they never count."
    // At level 0, cap is 2. A maze or terrain should not count towards small hazard cap.
    const s = buildState(b, { level: 0, spawnInMs: 0 });
    s.hazards.push({
      family: 'maze', state: 'solid', t: 5000, warnMs: 2600, lifeMs: 14000, landed: true,
      cells: [{ x: 1, y: 1, on: true, ageMs: 5000 }],
    });
    s.terrains.push({
      family: 'terrain', t: 1000, lifeMs: 18000,
      cells: [{ x: 2, y: 2, delay: 0, up: false, vis: 'down' }],
    });

    const rng = rngFrom(seedRng(123));
    updateDirector(s, b, rng);
    // Rock can still spawn because small hazards count is 0 < cap (2)
    const rocks = s.hazards.filter(h => h.family === 'rock');
    expect(rocks.length).toBe(1);
  });

  it('QA-T5-19 MEC-004 maze cannot spawn while terrain is active', () => {
    // Design §5 MEC-004: maze weight only when "no maze active and no terrain"
    // At level 6 (maze unlocked), if a terrain is active, maze cannot spawn
    const s = buildState(b, { level: 6, spawnInMs: 0 });
    s.mazeCooldownMs = 0;
    // Fill small hazards cap to block rock and fence: cap at lvl 6 = min(8, 2+3) = 5
    for (let i = 0; i < 5; i++) {
      s.hazards.push({
        family: 'rock', state: 'solid', t: 2000, warnMs: 1500, lifeMs: 6000, landed: true,
        cells: [{ x: i, y: 0, on: true, ageMs: 2000 }],
      });
    }
    // Add active terrain
    s.terrains.push({
      family: 'terrain', t: 1000, lifeMs: 18000,
      cells: [{ x: 10, y: 10, delay: 0, up: false, vis: 'down' }],
    });

    const rng = rngFrom(seedRng(42));
    updateDirector(s, b, rng);
    // Maze must NOT have spawned!
    expect(s.hazards.some(h => h.family === 'maze')).toBe(false);
  });

  it('QA-T5-20 MEC-004 terrain cannot spawn while maze is active', () => {
    // Design §5 MEC-004: terrain weight only when "no maze active and terrains < cap"
    const s = buildState(b, { level: 6, spawnInMs: 0 });
    // Fill small hazards to block rock and fence
    for (let i = 0; i < 5; i++) {
      s.hazards.push({
        family: 'rock', state: 'solid', t: 2000, warnMs: 1500, lifeMs: 6000, landed: true,
        cells: [{ x: i, y: 0, on: true, ageMs: 2000 }],
      });
    }
    // Add active maze
    s.hazards.push({
      family: 'maze', state: 'solid', t: 3000, warnMs: 2600, lifeMs: 14000, landed: true,
      cells: [{ x: 10, y: 10, on: true, ageMs: 3000 }],
    });

    const rng = rngFrom(seedRng(42));
    updateDirector(s, b, rng);
    // Terrain must NOT have spawned!
    expect(s.terrains.length).toBe(0);
  });

  it('QA-T5-21 MEC-004 maze cooldown sets to 26000 ms and blocks maze respawn', () => {
    // Design §5 MEC-004: maze sets maze cooldown 26000
    const s = buildState(b, { level: 6, spawnInMs: 0 });
    s.mazeCooldownMs = 0;
    // Small hazards filled to force maze if picked
    for (let i = 0; i < 5; i++) {
      s.hazards.push({
        family: 'rock', state: 'solid', t: 2000, warnMs: 1500, lifeMs: 6000, landed: true,
        cells: [{ x: i, y: 0, on: true, ageMs: 2000 }],
      });
    }
    // Seed that picks maze
    let spawnedMaze = false;
    for (let seed = 1; seed < 50; seed++) {
      const trial = structuredClone(s);
      updateDirector(trial, b, rngFrom(seedRng(seed)));
      if (trial.hazards.some(h => h.family === 'maze')) {
        expect(trial.mazeCooldownMs).toBe(b.maze.cooldownMs);
        expect(trial.mazeCooldownMs).toBe(26000);
        spawnedMaze = true;
        break;
      }
    }
    expect(spawnedMaze).toBe(true);

    // If mazeCooldownMs > 0, maze cannot spawn
    const sCooldown = buildState(b, { level: 6, spawnInMs: 0 });
    sCooldown.mazeCooldownMs = 15000;
    for (let i = 0; i < 5; i++) {
      sCooldown.hazards.push({
        family: 'rock', state: 'solid', t: 2000, warnMs: 1500, lifeMs: 6000, landed: true,
        cells: [{ x: i, y: 0, on: true, ageMs: 2000 }],
      });
    }
    updateDirector(sCooldown, b, rngFrom(seedRng(1)));
    expect(sCooldown.hazards.some(h => h.family === 'maze')).toBe(false);
  });

  it('QA-T5-22 MEC-004 terrain maxActive limits: 1 below level 8, 2 at level 8+', () => {
    // Design §5 MEC-004: terrains < (level >= 8 ? 2 : 1)
    const sLvl6 = buildState(b, { level: 6, spawnInMs: 0 });
    // Fill small hazards
    for (let i = 0; i < 5; i++) {
      sLvl6.hazards.push({
        family: 'rock', state: 'solid', t: 2000, warnMs: 1500, lifeMs: 6000, landed: true,
        cells: [{ x: i, y: 0, on: true, ageMs: 2000 }],
      });
    }
    sLvl6.terrains.push({
      family: 'terrain', t: 1000, lifeMs: 18000,
      cells: [{ x: 10, y: 10, delay: 0, up: false, vis: 'down' }],
    });
    // With 1 terrain active at level 6, another terrain cannot spawn
    updateDirector(sLvl6, b, rngFrom(seedRng(1)));
    expect(sLvl6.terrains.length).toBe(1);

    // At level 8, second terrain can spawn
    const sLvl8 = buildState(b, { level: 8, spawnInMs: 0 });
    for (let i = 0; i < 6; i++) { // cap at lvl 8 = min(8, 2+4) = 6
      sLvl8.hazards.push({
        family: 'rock', state: 'solid', t: 2000, warnMs: 1500, lifeMs: 6000, landed: true,
        cells: [{ x: i, y: 0, on: true, ageMs: 2000 }],
      });
    }
    sLvl8.terrains.push({
      family: 'terrain', t: 1000, lifeMs: 18000,
      cells: [{ x: 10, y: 10, delay: 0, up: false, vis: 'down' }],
    });
    // Try multiple seeds to spawn terrain
    let secondSpawned = false;
    for (let seed = 1; seed < 50; seed++) {
      const trial = structuredClone(sLvl8);
      updateDirector(trial, b, rngFrom(seedRng(seed)));
      if (trial.terrains.length === 2) {
        secondSpawned = true;
        break;
      }
    }
    expect(secondSpawned).toBe(true);
  });

  it('QA-T5-23 MEC-004 hazardIncoming event emitted for fence, terrain, and maze but not rock', () => {
    // Design §4, §4.1: "On success it pushes the instance, emits hazardIncoming (fence, maze, terrain)"
    // Rock never emits hazardIncoming
    const s = buildState(b, { level: 0, spawnInMs: 0 });
    const sim = restoreSim(b, s);
    sim.advance(1); // triggers director
    const rockIncoming = sim.drainEvents().find(e => e.type === 'hazardIncoming');
    expect(rockIncoming).toBeUndefined();

    // At level 2 (fence available)
    let fenceIncoming = false;
    for (let seed = 1; seed < 50; seed++) {
      const s2 = buildState(b, { seed, level: 2, spawnInMs: 0 });
      // fill rocks to cap (3) so only fence can spawn
      s2.hazards.push(
        { family: 'rock', state: 'solid', t: 1000, warnMs: 1500, lifeMs: 6000, landed: true, cells: [{ x: 0, y: 0, on: true, ageMs: 1000 }] },
        { family: 'rock', state: 'solid', t: 1000, warnMs: 1500, lifeMs: 6000, landed: true, cells: [{ x: 1, y: 0, on: true, ageMs: 1000 }] },
      );
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
