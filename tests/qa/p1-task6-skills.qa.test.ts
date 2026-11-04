// tests/qa/p1-task6-skills.qa.test.ts — Black-box QA tests for P1 Task 6 skills & loadout (MEC-006, MEC-007)
import { describe, expect, it } from 'vitest';
import {
  createSim,
  restoreSim,
  levelTickMs,
  slotCount,
  unlockedSkills,
  unlockTable,
  type Cell,
  type Dir,
  type Loadout,
  type Sim,
  type SimEvent,
  type SkillId,
} from '../../src/core';
import { sanitizeLoadout } from '../../src/meta';
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

describe('QA P1 Task 6: Skill Framework, Slow-mo, Tail Snip & Loadout (MEC-006, MEC-007)', () => {
  const b = loadBalance();

  // --------------------------------------------------------------------------
  // Group 1: Loadout Validation & Meta Progression (MEC-007)
  // --------------------------------------------------------------------------

  it('QA-P1T6-01 MEC-007 unlockedSkills and slotCount progression across all 30 levels', () => {
    // MEC-007 §3: slowmo at 3, tailSnip at 6, shield at 11, mangoRain at 16; slotCount 1 before 6, else 2
    for (let level = 1; level <= 30; level++) {
      const skills = unlockedSkills(b, level);
      const slots = slotCount(b, level);

      if (level < 3) {
        expect(skills).toEqual([]);
        expect(slots).toBe(1);
      } else if (level < 6) {
        expect(skills).toEqual(['slowmo']);
        expect(slots).toBe(1);
      } else if (level < 11) {
        expect(skills).toEqual(['slowmo', 'tailSnip']);
        expect(slots).toBe(2);
      } else if (level < 16) {
        expect(skills).toEqual(['slowmo', 'tailSnip', 'shield']);
        expect(slots).toBe(2);
      } else {
        expect(skills).toEqual(['slowmo', 'tailSnip', 'shield', 'mangoRain']);
        expect(slots).toBe(2);
      }
    }
  });

  it('QA-P1T6-02 MEC-007-R4 sanitizeLoadout sanitizes invalid inputs, unknown skills, and locked skills', () => {
    const table = unlockTable(b);

    // (1) missing or wrongly shaped value defaults to full sanitized loadout
    expect(sanitizeLoadout(undefined, 12, table)).toEqual(['slowmo', 'tailSnip']);
    expect(sanitizeLoadout('not-an-array', 12, table)).toEqual(['slowmo', 'tailSnip']);
    expect(sanitizeLoadout(['slowmo'], 12, table)).toEqual(['slowmo', 'tailSnip']);
    expect(sanitizeLoadout(['slowmo', 'tailSnip', 'shield'], 12, table)).toEqual(['slowmo', 'tailSnip']);

    // (2) unknown skill IDs replaced by null and filled
    expect(sanitizeLoadout(['laser' as any, null], 12, table)).toEqual(['slowmo', 'tailSnip']);

    // (2) locked skills replaced by null and filled
    expect(sanitizeLoadout(['tailSnip', null], 4, table)).toEqual(['slowmo', null]);
    expect(sanitizeLoadout(['mangoRain', 'slowmo'], 12, table)).toEqual(['tailSnip', 'slowmo']);
  });

  it('QA-P1T6-03 MEC-007-R4 sanitizeLoadout deduplicates, clamps to slotCount, and moves slot 1 to slot 0 if needed', () => {
    const table = unlockTable(b);

    // (3) duplicates replaced by null and filled
    expect(sanitizeLoadout(['shield', 'shield'], 12, table)).toEqual(['shield', 'slowmo']);

    // (4) slots >= slotCount set to null
    expect(sanitizeLoadout(['slowmo', 'tailSnip'], 4, table)).toEqual(['slowmo', null]);

    // (6) slot 1 moves to slot 0 if slot 0 is null
    expect(sanitizeLoadout([null, 'shield'], 12, table)).toEqual(['slowmo', 'shield']);
    expect(sanitizeLoadout([null, 'slowmo'], 3, { ...table, secondSlotLevel: 2 })).toEqual(['slowmo', null]);
  });

  it('QA-P1T6-04 MEC-007-R11 createSim accepts valid loadout and options matching bestLevel', () => {
    // Default loadout is [null, null]
    const simDef = createSim(b, 1);
    expect(simDef.snapshot().skills.map(s => s.id)).toEqual([null, null]);

    // Valid 1-slot loadout at bestLevel 3
    const simL3 = createSim(b, 2, { bestLevel: 3, loadout: ['slowmo', null] });
    expect(simL3.snapshot().skills.map(s => s.id)).toEqual(['slowmo', null]);

    // Valid 2-slot loadout at bestLevel 6
    const simL6 = createSim(b, 3, { bestLevel: 6, loadout: ['slowmo', 'tailSnip'] });
    expect(simL6.snapshot().skills.map(s => s.id)).toEqual(['slowmo', 'tailSnip']);
  });

  it('QA-P1T6-05 MEC-007-R11 createSim throws RangeError for invalid bestLevel', () => {
    // bestLevel must be integer in [1, 30]
    for (const invalid of [0, -1, 31, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => createSim(b, 1, { bestLevel: invalid })).toThrow(RangeError);
    }
  });

  it('QA-P1T6-06 MEC-007-R11 createSim throws RangeError for invalid loadout configurations', () => {
    // Duplicate skills
    expect(() => createSim(b, 1, { bestLevel: 6, loadout: ['slowmo', 'slowmo'] })).toThrow(RangeError);

    // Unknown skill id
    expect(() => createSim(b, 1, { bestLevel: 6, loadout: ['teleport' as any, null] })).toThrow(RangeError);

    // Locked skill for bestLevel
    expect(() => createSim(b, 1, { bestLevel: 3, loadout: ['tailSnip', null] })).toThrow(RangeError);

    // Slot 2 non-null when slotCount(bestLevel) is 1
    expect(() => createSim(b, 1, { bestLevel: 4, loadout: ['slowmo', 'slowmo'] })).toThrow(RangeError);
    expect(() => createSim(b, 1, { bestLevel: 3, loadout: [null, 'slowmo'] })).toThrow(RangeError);

    // Wrong array length or non-array
    expect(() => createSim(b, 1, { bestLevel: 6, loadout: ['slowmo'] as any })).toThrow(RangeError);
    expect(() => createSim(b, 1, { bestLevel: 6, loadout: ['slowmo', null, null] as any })).toThrow(RangeError);
  });

  // --------------------------------------------------------------------------
  // Group 2: Skill Framework & Rejections (MEC-006-R11..R15)
  // --------------------------------------------------------------------------

  it('QA-P1T6-07 MEC-006-R11/R13 useSkill on empty slot emits skillRejected empty without spending energy', () => {
    const sim = createSim(b, 1, { bestLevel: 3, startEnergy: 50, loadout: ['slowmo', null] });
    sim.useSkill(1);

    const events = sim.drainEvents();
    expect(events).toEqual([
      { type: 'skillRejected', slot: 1, skill: null, reason: 'empty' },
    ]);
    expect(sim.snapshot().energy).toBe(50);
  });

  it('QA-P1T6-08 MEC-006-R13 useSkill during transition phase emits skillRejected busy and does not buffer', () => {
    const s = buildState(b, {
      level: 1,
      progress: 3,
      mango: [9, 8],
      spawnInMs: QUIET,
    });
    s.loadout = ['slowmo', null];
    s.bestLevel = 3;
    s.energy = 100;
    const sim = restoreSim(b, s);

    sim.advance(140); // level up to L2, phase becomes transition
    expect(sim.snapshot().phase).toBe('transition');

    sim.useSkill(0);
    const rejectEvents = sim.drainEvents().filter(e => e.type === 'skillRejected');
    expect(rejectEvents).toEqual([
      { type: 'skillRejected', slot: 0, skill: 'slowmo', reason: 'busy' },
    ]);
    expect(sim.snapshot().energy).toBe(100);

    // Completing transition: skill was not buffered
    sim.advance(1000);
    expect(sim.snapshot().phase).toBe('playing');
    const usedEvents = sim.drainEvents().filter(e => e.type === 'skillUsed');
    expect(usedEvents).toEqual([]);
    expect(sim.snapshot().slowmo).toBeNull();
  });

  it('QA-P1T6-09 MEC-006-R13 useSkill with insufficient energy emits skillRejected energy', () => {
    const sim = createSim(b, 1, { bestLevel: 6, startEnergy: 39, loadout: ['slowmo', 'tailSnip'] });
    sim.useSkill(0); // slowmo costs 40

    expect(sim.drainEvents()).toEqual([
      { type: 'skillRejected', slot: 0, skill: 'slowmo', reason: 'energy' },
    ]);
    expect(sim.snapshot().energy).toBe(39);
  });

  it('QA-P1T6-10 MEC-006-R12 useSkill when sim status is over is a silent no-op', () => {
    const s = buildState(b, {
      snake: [[19, 0], [18, 0], [17, 0]],
      dir: [1, 0],
      spawnInMs: QUIET,
    });
    s.loadout = ['slowmo', null];
    s.bestLevel = 3;
    s.energy = 100;
    const sim = restoreSim(b, s);

    sim.advance(140); // hits wall x=20
    expect(sim.snapshot().status).toBe('over');
    sim.drainEvents();

    sim.useSkill(0);
    expect(sim.drainEvents()).toEqual([]);
    expect(sim.snapshot().energy).toBe(100);
  });

  it('QA-P1T6-11 MEC-006-R13 rejection priority order: empty > busy > active > energy > noTarget', () => {
    // 1. empty beats busy
    const sBusy = buildState(b, { spawnInMs: QUIET });
    sBusy.phase = 'transition';
    sBusy.transitionLeftMs = 500;
    sBusy.loadout = [null, null];
    sBusy.bestLevel = 3;
    const simBusy = restoreSim(b, sBusy);
    simBusy.useSkill(0);
    expect(simBusy.drainEvents()).toContainEqual(
      expect.objectContaining({ type: 'skillRejected', reason: 'empty' })
    );

    // 2. busy beats energy
    const sBusyEnergy = buildState(b, { spawnInMs: QUIET });
    sBusyEnergy.phase = 'transition';
    sBusyEnergy.transitionLeftMs = 500;
    sBusyEnergy.loadout = ['slowmo', null];
    sBusyEnergy.bestLevel = 3;
    sBusyEnergy.energy = 0;
    const simBusyEnergy = restoreSim(b, sBusyEnergy);
    simBusyEnergy.useSkill(0);
    expect(simBusyEnergy.drainEvents()).toContainEqual(
      expect.objectContaining({ type: 'skillRejected', reason: 'busy' })
    );

    // 3. active beats energy (MEC-006 Edge Case 3)
    const simActive = createSim(b, 1, { bestLevel: 6, startEnergy: 79, loadout: ['slowmo', null] });
    simActive.useSkill(0); // spends 40, 39 left, slowmo active
    simActive.drainEvents();
    simActive.useSkill(0); // both active and energy fail -> active wins
    expect(simActive.drainEvents()).toContainEqual(
      expect.objectContaining({ type: 'skillRejected', reason: 'active' })
    );

    // 4. energy beats noTarget
    const simNoTarget = createSim(b, 2, { bestLevel: 6, startEnergy: 20, loadout: ['tailSnip', null] });
    // snake length is 4 in createSim, but tailSnip needs length > 3 and cost 30 > 20
    simNoTarget.useSkill(0);
    expect(simNoTarget.drainEvents()).toContainEqual(
      expect.objectContaining({ type: 'skillRejected', reason: 'energy' })
    );
  });

  it('QA-P1T6-12 MEC-006-R15 successful skill execution spends energy, emits energyChanged then skillUsed', () => {
    const sim = createSim(b, 1, { bestLevel: 6, startEnergy: 100, loadout: ['slowmo', 'tailSnip'] });
    sim.useSkill(0);

    const events = sim.drainEvents();
    expect(events).toEqual([
      { type: 'energyChanged', energy: 60, delta: -40, source: 'skill' },
      { type: 'skillUsed', slot: 0, skill: 'slowmo', level: 1, energyBefore: 100, energyAfter: 60 },
    ]);
    expect(sim.snapshot().energy).toBe(60);
    expect(sim.snapshot().slowmo).toEqual({ leftMs: 4000 });
  });

  it('QA-P1T6-13 MEC-006-R11 skill activation is synchronous and rejected skill input does not affect turn queue or retry later', () => {
    const sim = createSim(b, 1, { bestLevel: 6, startEnergy: 10, loadout: ['slowmo', null] });
    sim.turn(0, -1); // queue up turn
    expect(sim.snapshot().heading).toEqual({ x: 0, y: -1 });

    sim.useSkill(0); // rejected due to energy
    expect(sim.drainEvents()).toEqual([
      { type: 'skillRejected', slot: 0, skill: 'slowmo', reason: 'energy' },
    ]);
    expect(sim.snapshot().heading).toEqual({ x: 0, y: -1 });

    // Advance 500ms: rejected skill is NOT retried later
    sim.advance(500);
    expect(sim.drainEvents().filter(e => e.type === 'skillUsed')).toEqual([]);
  });

  // --------------------------------------------------------------------------
  // Group 3: Slow-mo Mechanics (MEC-006-R16..R19)
  // --------------------------------------------------------------------------

  it('QA-P1T6-14 MEC-006-R17 Slow-mo multiplies base tick by tickFactor round(base * 1.6) and snapshot reflects effective tick', () => {
    // Level 1: base 140 -> round(140 * 1.6) = 224
    const simL1 = createSim(b, 1, { bestLevel: 3, startLevel: 1, startEnergy: 100, loadout: ['slowmo', null] });
    expect(simL1.snapshot().tickMs).toBe(140);
    simL1.useSkill(0);
    simL1.advance(1);
    expect(simL1.snapshot().tickMs).toBe(224);

    // Level 2 with ramp inactive: base 138 -> round(138 * 1.6) = 221
    const sL2 = buildState(b, { level: 2, spawnInMs: QUIET });
    sL2.loadout = ['slowmo', null];
    sL2.bestLevel = 3;
    sL2.energy = 100;
    sL2.rampActive = false;
    sL2.tickMs = 138;
    const simL2 = restoreSim(b, sL2);
    expect(simL2.snapshot().tickMs).toBe(138);
    simL2.useSkill(0);
    simL2.advance(1);
    expect(simL2.snapshot().tickMs).toBe(221);
  });

  it('QA-P1T6-15 MEC-006-R14 Slow-mo cannot be recast while active (rejects with reason active)', () => {
    const sim = createSim(b, 1, { bestLevel: 3, startEnergy: 100, loadout: ['slowmo', null] });
    sim.useSkill(0);
    sim.drainEvents();

    sim.useSkill(0);
    expect(sim.drainEvents()).toEqual([
      { type: 'skillRejected', slot: 0, skill: 'slowmo', reason: 'active' },
    ]);
    expect(sim.snapshot().energy).toBe(60);
  });

  it('QA-P1T6-16 MEC-006-R16 Slow-mo runs for 4000ms sim time and emits skillEnded timeout at 4000ms', () => {
    const s = buildState(b, {
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      spawnInMs: QUIET,
    });
    s.loadout = ['slowmo', null];
    s.bestLevel = 3;
    s.energy = 100;
    const sim = restoreSim(b, s);

    sim.useSkill(0);
    sim.drainEvents();

    circleSim(sim, 3999, 224);
    expect(sim.snapshot().slowmo).toEqual({ leftMs: 1 });
    expect(sim.drainEvents()).toEqual([]);

    circleSim(sim, 1, 224);
    expect(sim.snapshot().slowmo).toBeNull();
    expect(sim.drainEvents()).toEqual([
      { type: 'skillEnded', skill: 'slowmo', reason: 'timeout' },
    ]);
    expect(sim.snapshot().tickMs).toBe(140);
  });

  it('QA-P1T6-17 MEC-006-R17 Slow-mo effective tick dynamically recomputes when base tick changes', () => {
    const s = buildState(b, {
      level: 1,
      progress: 3,
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      mango: [8, 9], // eaten on step 1
      golden: false,
      spawnInMs: QUIET,
    });
    s.loadout = ['slowmo', null];
    s.bestLevel = 3;
    s.energy = 100;
    const sim = restoreSim(b, s);

    sim.useSkill(0);
    sim.advance(1);
    expect(sim.snapshot().tickMs).toBe(224); // L1 slowmo

    // Eat mango at t = 224 -> level 2, transition 1000ms
    sim.advance(223);
    expect(sim.snapshot().level).toBe(2);
    expect(sim.snapshot().phase).toBe('transition');

    // After transition, effective tick is L2 slowmo = 221
    sim.advance(1001);
    expect(sim.snapshot().phase).toBe('playing');
    expect(sim.snapshot().tickMs).toBe(221);
  });

  it('QA-P1T6-18 MEC-006-R18 Slow-mo expiry clamps accumulator to min(acc, effectiveTick) preventing double snake steps', () => {
    const s = buildState(b, {
      snake: [[2, 0], [1, 0], [0, 0]],
      dir: [1, 0],
      spawnInMs: QUIET,
    });
    s.loadout = ['slowmo', null];
    s.bestLevel = 3;
    s.energy = 100;
    s.slowmo = { leftMs: 1 };
    s.tickMs = 224;
    s.acc = 200; // acc > baseTick (140)
    const sim = restoreSim(b, s);

    // At t = 1, slowmo expires. Effective tick drops to 140. Acc was 200 -> clamped to 140 -> triggers 1 step.
    sim.advance(1);
    expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 0 });

    // Next step must be 140ms later, NOT immediately
    sim.advance(138);
    expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 0 });
    sim.advance(1);
    expect(sim.snapshot().snake[0]).toEqual({ x: 4, y: 0 });
  });

  it('QA-P1T6-19 MEC-006-EC12 Slow-mo expiry during negative accumulator preserves negative value', () => {
    const s = buildState(b, {
      snake: [[2, 0], [1, 0], [0, 0]],
      dir: [1, 0],
      spawnInMs: QUIET,
    });
    s.loadout = ['slowmo', null];
    s.bestLevel = 3;
    s.energy = 100;
    s.slowmo = { leftMs: 1 };
    s.tickMs = 224;
    s.acc = -300;
    const sim = restoreSim(b, s);

    sim.advance(1);
    expect(sim.snapshot().slowmo).toBeNull();
    expect(sim.snapshot().tickAlpha).toBe(0);
    expect(sim.snapshot().snake[0]).toEqual({ x: 2, y: 0 });
  });

  it('QA-P1T6-20 MEC-006-R16/R10 Slow-mo duration freezes during level transition', () => {
    const s = buildState(b, {
      level: 1,
      progress: 3,
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      mango: [8, 9],
      golden: false,
      spawnInMs: QUIET,
    });
    s.loadout = ['slowmo', null];
    s.bestLevel = 3;
    s.energy = 100;
    const sim = restoreSim(b, s);

    sim.useSkill(0);
    sim.advance(224); // eats mango, triggers level up & transition
    expect(sim.snapshot().phase).toBe('transition');
    expect(sim.snapshot().slowmo).toEqual({ leftMs: 3776 });

    // Transition advances 1000ms: slowmo leftMs must NOT decrease
    sim.advance(1000);
    expect(sim.snapshot().phase).toBe('playing');
    expect(sim.snapshot().slowmo).toEqual({ leftMs: 3776 });

    // Circle remaining 3775ms
    circleSim(sim, 3775, 221);
    expect(sim.snapshot().slowmo).toEqual({ leftMs: 1 });
    circleSim(sim, 1, 221);
    expect(sim.snapshot().slowmo).toBeNull();
    expect(sim.snapshot().timeMs).toBe(5000); // 4000ms active + 1000ms transition
  });

  it('QA-P1T6-21 MEC-006-R19 Slow-mo does not alter non-snake sim timers (mango rot, hazard timeline)', () => {
    const s = buildState(b, {
      snake: SQUARE_SNAKE,
      dir: [0, 1],
      mango: [15, 15],
      mangoLeftMs: 8000,
      spawnInMs: QUIET,
    });
    s.loadout = ['slowmo', null];
    s.bestLevel = 3;
    s.energy = 100;
    const sim = restoreSim(b, s);

    sim.useSkill(0);
    circleSim(sim, 1000, 224);

    // After 1000 sim ms, mango rot timer aged exactly 1000ms
    expect(sim.snapshot().mango?.ageMs).toBe(1000);
    expect(sim.snapshot().mango?.leftMs).toBe(7000);
  });

  // --------------------------------------------------------------------------
  // Group 4: Tail Snip & Snip Wall (MEC-006-R20..R23)
  // --------------------------------------------------------------------------

  it('QA-P1T6-22 MEC-006-R20 Tail Snip rejects with reason noTarget if snake length <= 3', () => {
    const s = buildState(b, {
      snake: [[2, 10], [1, 10], [0, 10]],
      dir: [1, 0],
      spawnInMs: QUIET,
    });
    s.loadout = ['tailSnip', null];
    s.bestLevel = 6;
    s.energy = 100;
    const sim = restoreSim(b, s);
    expect(sim.snapshot().length).toBe(3);

    sim.useSkill(0);
    expect(sim.drainEvents()).toEqual([
      { type: 'skillRejected', slot: 0, skill: 'tailSnip', reason: 'noTarget' },
    ]);
    expect(sim.snapshot().energy).toBe(100);
  });

  it('QA-P1T6-23 MEC-006-R21 Tail Snip cuts L - max(3, ceil(L/2)) cells across lengths 4 to 10', () => {
    // Lengths 3..10 expected cuts:
    // L=3 -> noTarget
    // L=4 -> K=max(3, 2)=3 -> cut 1
    // L=5 -> K=max(3, 3)=3 -> cut 2
    // L=6 -> K=max(3, 3)=3 -> cut 3
    // L=7 -> K=max(3, 4)=4 -> cut 3
    // L=8 -> K=max(3, 4)=4 -> cut 4
    // L=9 -> K=max(3, 5)=5 -> cut 4
    // L=10 -> K=max(3, 5)=5 -> cut 5
    const expectedCuts = [1, 2, 3, 3, 4, 4, 5];

    for (let i = 0; i < expectedCuts.length; i++) {
      const len = i + 4;
      const snakeCells: [number, number][] = Array.from({ length: len }, (_, idx) => [len - idx, 10]);
      const s = buildState(b, {
        snake: snakeCells,
        dir: [1, 0],
        spawnInMs: QUIET,
      });
      s.loadout = ['tailSnip', null];
      s.bestLevel = 6;
      s.energy = 100;
      const sim = restoreSim(b, s);

      sim.useSkill(0);
      const snipped = sim.drainEvents().find(e => e.type === 'tailSnipped') as Extract<SimEvent, { type: 'tailSnipped' }> | undefined;
      expect(snipped).toBeDefined();
      expect(snipped?.cut).toBe(expectedCuts[i]);
      expect(sim.snapshot().length).toBe(len - expectedCuts[i]!);
    }
  });

  it('QA-P1T6-24 MEC-006-R21 Tail Snip maintains snake head, direction, and turn queue, and sets tailFrom to new tail', () => {
    const snakeCells: [number, number][] = [[6, 10], [5, 10], [4, 10], [3, 10], [2, 10], [1, 10]];
    const s = buildState(b, {
      snake: snakeCells,
      dir: [1, 0],
      spawnInMs: QUIET,
    });
    s.loadout = ['tailSnip', null];
    s.bestLevel = 6;
    s.energy = 100;
    const sim = restoreSim(b, s);

    sim.turn(0, 1); // queue down turn
    sim.useSkill(0);

    const snap = sim.snapshot();
    expect(snap.snake).toEqual([{ x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }]);
    expect(snap.tailFrom).toEqual({ x: 4, y: 10 });
    expect(snap.dir).toEqual({ x: 1, y: 0 });
    expect(snap.heading).toEqual({ x: 0, y: 1 });
  });

  it('QA-P1T6-25 MEC-006-R22 Cut cells turn into solid snipWall cells and emits tailSnipped cut and cells', () => {
    const snakeCells: [number, number][] = [[6, 10], [5, 10], [4, 10], [3, 10], [2, 10], [1, 10]];
    const s = buildState(b, {
      snake: snakeCells,
      dir: [1, 0],
      spawnInMs: QUIET,
    });
    s.loadout = ['tailSnip', null];
    s.bestLevel = 6;
    s.energy = 100;
    const sim = restoreSim(b, s);

    sim.useSkill(0);
    const events = sim.drainEvents();
    expect(events).toContainEqual({
      type: 'tailSnipped',
      cut: 3,
      cells: [{ x: 1, y: 10 }, { x: 2, y: 10 }, { x: 3, y: 10 }],
    });

    const snipWall = sim.snapshot().snipWall;
    expect(snipWall).toHaveLength(3);
    expect(snipWall.every(c => c.state === 'solid' && c.leftMs === 3000)).toBe(true);
  });

  it('QA-P1T6-26 MEC-006-R22 SnipWall drops cut cell matching the head immediate next cell', () => {
    const sLoop = buildState(b, {
      snake: [[8, 8], [7, 8], [7, 7], [8, 7]],
      dir: [0, -1], // head moving towards [8, 7]
      spawnInMs: QUIET,
    });
    sLoop.loadout = ['tailSnip', null];
    sLoop.bestLevel = 6;
    sLoop.energy = 100;
    const simLoop = restoreSim(b, sLoop);

    simLoop.useSkill(0);
    // The cut cell [8, 7] equals head + dir ([8, 8] + [0, -1] = [8, 7]), so it is dropped!
    expect(simLoop.drainEvents()).toContainEqual({
      type: 'tailSnipped',
      cut: 1,
      cells: [],
    });
    expect(simLoop.snapshot().snipWall).toEqual([]);
  });

  it('QA-P1T6-27 MEC-006-R23 Entering a solid snipWall cell kills the snake with cause snipWall', () => {
    const s = buildState(b, {
      snake: [[2, 10], [1, 10], [0, 10]],
      dir: [1, 0],
      spawnInMs: QUIET,
    });
    s.loadout = ['slowmo', null];
    s.bestLevel = 6;
    (s as any).snipWalls = [{
      family: 'snipWall',
      cells: [{ x: 3, y: 10 }],
      state: 'solid',
      leftMs: 3000,
    }];
    const sim = restoreSim(b, s);

    expect(sim.snapshot().snipWall).toHaveLength(1);
    expect(sim.snapshot().snipWall[0]?.state).toBe('solid');

    sim.advance(140);
    expect(sim.snapshot().status).toBe('over');
    expect(sim.drainEvents()).toContainEqual({
      type: 'died',
      cause: 'snipWall',
      x: 2,
      y: 10,
    });
  });

  it('QA-P1T6-28 MEC-006-R22 SnipWall transitions solid -> crumble at 3000ms, and disappears after crumbleMs', () => {
    const snakeCells: [number, number][] = [[6, 10], [5, 10], [4, 10], [3, 10], [2, 10], [1, 10]];
    const s = buildState(b, {
      snake: snakeCells,
      dir: [1, 0],
      spawnInMs: QUIET,
    });
    s.loadout = ['tailSnip', null];
    s.bestLevel = 6;
    s.energy = 100;
    const sim = restoreSim(b, s);

    sim.useSkill(0);
    sim.drainEvents();

    // Advance 2999ms in circle
    circleSim(sim, 2999, 140);
    expect(sim.snapshot().snipWall.every(c => c.state === 'solid' && c.leftMs === 1)).toBe(true);

    // At 3000ms: transitions to crumble (hazard.crumbleMs = 450ms)
    circleSim(sim, 1, 140);
    expect(sim.snapshot().snipWall.every(c => c.state === 'crumble' && c.leftMs === 450)).toBe(true);
    expect(sim.drainEvents()).toContainEqual({
      type: 'skillEnded',
      skill: 'tailSnip',
      reason: 'timeout',
    });

    // Advance 449ms crumble
    circleSim(sim, 449, 140);
    expect(sim.snapshot().snipWall[0]?.leftMs).toBe(1);

    // At 450ms crumble: completely gone
    circleSim(sim, 1, 140);
    expect(sim.snapshot().snipWall).toEqual([]);
  });

  it('QA-P1T6-29 MEC-006-R14 Tail Snip is active while wall is solid, and can be recast once wall crumbles', () => {
    const snakeCells: [number, number][] = Array.from({ length: 8 }, (_, i) => [8 - i, 10]);
    const s = buildState(b, {
      snake: snakeCells,
      dir: [1, 0],
      spawnInMs: QUIET,
    });
    s.loadout = ['tailSnip', null];
    s.bestLevel = 6;
    s.energy = 100;
    const sim = restoreSim(b, s);

    sim.useSkill(0); // cut 4, snake length 4, 70 energy left
    sim.drainEvents();

    // Cannot recast while solid
    sim.useSkill(0);
    expect(sim.drainEvents()).toEqual([
      { type: 'skillRejected', slot: 0, skill: 'tailSnip', reason: 'active' },
    ]);

    // Advance 3000ms until crumble
    circleSim(sim, 3000, 140);
    sim.drainEvents();

    // Recast is allowed during crumble (snake length 4 > 3, energy 70 >= 30)
    sim.useSkill(0);
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({ type: 'skillUsed', slot: 0, skill: 'tailSnip', energyBefore: 70, energyAfter: 40 })
    );
    expect(sim.snapshot().length).toBe(3);
  });

  it('QA-P1T6-30 MEC-006-EC15 / MEC-003-R7 Level transition causes active snipWall to crumble immediately', () => {
    const snakeCells: [number, number][] = [[6, 10], [5, 10], [4, 10], [3, 10], [2, 10], [1, 10]];
    const s = buildState(b, {
      level: 1,
      progress: 3,
      snake: snakeCells,
      dir: [1, 0],
      mango: [7, 10], // eaten at t=140
      golden: false,
      spawnInMs: QUIET,
    });
    s.loadout = ['tailSnip', null];
    s.bestLevel = 6;
    s.energy = 100;
    const sim = restoreSim(b, s);

    sim.useSkill(0); // cuts to length 3, creates snipWall
    expect(sim.snapshot().snipWall.every(c => c.state === 'solid')).toBe(true);

    sim.advance(140); // eats mango, completes level 1, enters transition
    expect(sim.snapshot().phase).toBe('transition');
    expect(sim.snapshot().snipWall.every(c => c.state === 'crumble' && c.leftMs === 450)).toBe(true);

    // Wall disappears by end of crumble
    sim.advance(450);
    expect(sim.snapshot().snipWall).toEqual([]);
  });

  // --------------------------------------------------------------------------
  // Group 5: Mid-Run Skill Unlocks & Lifecycle (MEC-007-R12)
  // --------------------------------------------------------------------------

  it('QA-P1T6-31 MEC-007-R12 Reaching level 3 for the first time unlocks slowmo into slot 0', () => {
    const s = buildState(b, {
      level: 2,
      progress: 3, // quota(2) = 4; eating 1 normal mango completes L2
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: false,
      spawnInMs: QUIET,
    });
    s.loadout = [null, null];
    s.bestLevel = 2; // reaching 3 is a first-time unlock
    const sim = restoreSim(b, s);

    sim.advance(140);
    const events = sim.drainEvents();

    expect(events).toContainEqual(
      expect.objectContaining({ type: 'levelUp', level: 3 })
    );
    expect(events).toContainEqual({
      type: 'skillUnlocked',
      skill: 'slowmo',
      slot: 0,
    });
    expect(sim.snapshot().skills[0]?.id).toBe('slowmo');
  });

  it('QA-P1T6-32 MEC-007-R12 Reaching level 6 for the first time emits slotUnlocked then unlocks tailSnip into slot 1', () => {
    const s = buildState(b, {
      level: 5,
      progress: 4, // quota(5) = 5; eating 1 normal mango completes L5
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: false,
      spawnInMs: QUIET,
    });
    s.loadout = ['slowmo', null];
    s.bestLevel = 5; // reaching 6 is first time
    const sim = restoreSim(b, s);

    sim.advance(140);
    const events = sim.drainEvents();

    const slotIdx = events.findIndex(e => e.type === 'slotUnlocked');
    const skillIdx = events.findIndex(e => e.type === 'skillUnlocked');

    expect(slotIdx).toBeGreaterThanOrEqual(0);
    expect(skillIdx).toBeGreaterThan(slotIdx);
    expect(events[slotIdx]).toEqual({ type: 'slotUnlocked', slot: 1 });
    expect(events[skillIdx]).toEqual({ type: 'skillUnlocked', skill: 'tailSnip', slot: 1 });
    expect(sim.snapshot().skills.map(s => s.id)).toEqual(['slowmo', 'tailSnip']);
  });

  it('QA-P1T6-33 MEC-007-R12 Reaching an unlock level with both slots occupied emits skillUnlocked with slot null', () => {
    const s = buildState(b, {
      level: 10,
      progress: 6, // quota(10) = 7; eating 1 normal mango completes L10
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: false,
      spawnInMs: QUIET,
    });
    s.loadout = ['slowmo', 'tailSnip']; // both slots full
    s.bestLevel = 10;
    const sim = restoreSim(b, s);

    sim.advance(140);
    const events = sim.drainEvents();

    expect(events).toContainEqual({
      type: 'skillUnlocked',
      skill: 'shield',
      slot: null,
    });
    expect(sim.snapshot().skills.map(s => s.id)).toEqual(['slowmo', 'tailSnip']);
  });

  it('QA-P1T6-34 MEC-007-R12 No unlock events are emitted when reaching a level <= bestLevel', () => {
    const s = buildState(b, {
      level: 2,
      progress: 3,
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: false,
      spawnInMs: QUIET,
    });
    s.loadout = [null, null];
    s.bestLevel = 10; // already reached level 10 previously
    const sim = restoreSim(b, s);

    sim.advance(140);
    expect(sim.snapshot().level).toBe(3);
    const unlockEvents = sim.drainEvents().filter(e => e.type === 'skillUnlocked' || e.type === 'slotUnlocked');
    expect(unlockEvents).toEqual([]);
  });

  it('QA-P1T6-35 MEC-007-R12 Event sequence on mid-run unlock level-up: ate -> energyChanged -> shrunk -> levelUp -> rampEnded -> slotUnlocked -> skillUnlocked', () => {
    const s = buildState(b, {
      level: 5,
      progress: 4,
      snake: [[8, 8], [7, 8], [6, 8]],
      dir: [1, 0],
      mango: [9, 8],
      golden: true, // triggers energyChanged
      spawnInMs: QUIET,
    });
    s.loadout = ['slowmo', null];
    s.bestLevel = 5;
    s.startLevel = 5;
    s.rampActive = true;
    s.rampEaten = 1;
    const sim = restoreSim(b, s);

    sim.advance(140); // checkpoint ramp tick at startLevel 5 k=1 is 138-140ms
    const eventTypes = sim.drainEvents().map(e => e.type);

    expect(eventTypes).toEqual([
      'ate',
      'energyChanged',
      'shrunk',
      'levelUp',
      'rampEnded',
      'slotUnlocked',
      'skillUnlocked',
    ]);
  });
});
