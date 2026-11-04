// tests/qa/p1-task8-session.qa.test.ts — black-box QA tests for P1 Task 8 Session layer (MEC-003, MEC-007, MEC-008, P1-D1)
import { describe, expect, it } from 'vitest';
import {
  createSession,
  type Session,
  type SessionDeps,
  type HomeModel,
  type LoadoutModel,
  type RunSummary,
} from '../../src/session';
import { processEvents } from '../../src/session/session';
import {
  memoryStore,
  load,
  loadLog,
  LOG_KEY,
  SAVE_KEY,
  defaultSave,
  type KeyValueStore,
  type LogRecord,
  type SaveDataV2,
  type RunLog,
} from '../../src/meta';
import { createSim, type SimEvent, type Loadout, type SkillId, type CauseKey } from '../../src/core';
import { loadBalance } from '../support/balance';

const b = loadBalance();
const rules = { skillIds: b.loadout.order, maxLevel: b.level.maxLevel, carryMax: b.checkpoints.carryMax };

/**
 * Standard unsteered snake wall death ms:
 * Head starts at (8, 8) moving right; board width 17; hits x = 17 on the 9th step:
 * 9 steps * 140 ms = 1260 ms.
 */
const WALL_DEATH_MS = 1260;

function setupSession(options?: {
  initialSave?: Partial<SaveDataV2>;
  customStore?: KeyValueStore;
  customSeed?: number;
}) {
  const store = options?.customStore ?? memoryStore();
  let clockMs = 1000;
  let seedVal = options?.customSeed ?? 42;

  if (options?.initialSave) {
    store.set(
      SAVE_KEY,
      JSON.stringify({
        version: 2,
        data: {
          ...defaultSave(),
          ...options.initialSave,
        },
      }),
    );
  }

  const deps: SessionDeps = {
    balance: b,
    store,
    newSeed: () => seedVal++,
    now: () => (clockMs += 100),
  };

  const s = createSession(deps);
  return { s, store, getNow: () => clockMs };
}

describe('QA P1 Task 8: Session Layer (MEC-003, MEC-007, MEC-008, P1-D1)', () => {
  // =========================================================================
  // Group 1: Run Start and Entry Source (MEC-003-R19, MEC-007-R2, MEC-008-R5)
  // =========================================================================

  it('QA-P1T8-01 MEC-003-R19 startRun(1) default entry is "home" in run_start log record', () => {
    const { s, store } = setupSession();
    s.startRun(1);
    s.pause(); // flush log buffer
    const log = loadLog(store);
    const startRecord = log.entries.find((e) => e.type === 'run_start');
    expect(startRecord).toBeDefined();
    expect(startRecord).toMatchObject({
      type: 'run_start',
      runId: 1,
      startLevel: 1,
      entry: 'home',
    });
  });

  it('QA-P1T8-02 MEC-003-R19 startRun(1, "home") explicitly records entry "home"', () => {
    const { s, store } = setupSession();
    s.startRun(1, 'home');
    s.hidden();
    const log = loadLog(store);
    const startRecord = log.entries.find((e) => e.type === 'run_start');
    expect(startRecord).toBeDefined();
    expect(startRecord).toMatchObject({
      type: 'run_start',
      entry: 'home',
    });
  });

  it('QA-P1T8-03 MEC-003-R19 startRun(startLevel, "results") records entry "results"', () => {
    const { s, store } = setupSession({
      initialSave: { bestLevel: 10, unlockedCheckpoints: [4] },
    });
    s.startRun(4, 'results');
    s.pause();
    const log = loadLog(store);
    const startRecord = log.entries.find((e) => e.type === 'run_start');
    expect(startRecord).toBeDefined();
    expect(startRecord).toMatchObject({
      type: 'run_start',
      startLevel: 4,
      entry: 'results',
    });
  });

  it('QA-P1T8-04 P1-D1 lastStartLevel returns null before any run and startLevel after startRun', () => {
    const { s } = setupSession({
      initialSave: { bestLevel: 10, unlockedCheckpoints: [4] },
    });
    expect(s.lastStartLevel()).toBeNull();
    s.startRun(4);
    expect(s.lastStartLevel()).toBe(4);
    // After run ends (e.g. wall death), lastStartLevel must still be preserved for Results screen "Play again"
    s.frame(WALL_DEATH_MS);
    expect(s.lastStartLevel()).toBe(4);
  });

  it('QA-P1T8-05 MEC-008-R4 startRun throws RangeError when attempting to start at a locked checkpoint', () => {
    const { s } = setupSession({
      initialSave: { bestLevel: 10, unlockedCheckpoints: [4] },
    });
    // Checkpoint 6 is locked because unlockedCheckpoints only has 4
    expect(() => s.startRun(6)).toThrow(RangeError);
    // Level 1 is always unlocked
    expect(() => s.startRun(1)).not.toThrow();
  });

  // =========================================================================
  // Group 2: Run Log Buffering and Flush Lifecycle (P1-D5, MEC-003-R18, MEC-008-R7)
  // =========================================================================

  it('QA-P1T8-06 P1-D5 log records are held in memory during run and not flushed before pause/hidden/end', () => {
    const { s, store } = setupSession();
    s.startRun(1);
    s.frame(100);
    // Before any pause/hidden/end, no log records should be persisted to store
    expect(store.get(LOG_KEY)).toBeNull();
  });

  it('QA-P1T8-07 P1-D5 pause() flushes in-memory run log records to storage', () => {
    const { s, store } = setupSession();
    s.startRun(1);
    s.frame(100);
    expect(store.get(LOG_KEY)).toBeNull();
    s.pause();
    expect(store.get(LOG_KEY)).not.toBeNull();
    const log = loadLog(store);
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]?.type).toBe('run_start');
  });

  it('QA-P1T8-08 P1-D5 hidden() flushes in-memory run log records to storage', () => {
    const { s, store } = setupSession();
    s.startRun(1);
    s.frame(100);
    expect(store.get(LOG_KEY)).toBeNull();
    s.hidden();
    expect(store.get(LOG_KEY)).not.toBeNull();
    const log = loadLog(store);
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]?.type).toBe('run_start');
  });

  it('QA-P1T8-09 MEC-003-R19 / P1-D5 run termination flushes all records including run_end to storage', () => {
    const { s, store } = setupSession();
    s.startRun(1);
    s.frame(WALL_DEATH_MS); // Wall collision
    expect(store.get(LOG_KEY)).not.toBeNull();
    const log = loadLog(store);
    expect(log.entries.map((e) => e.type)).toEqual(['run_start', 'run_end']);
  });

  it('QA-P1T8-10 MEC-003-R21 exportLog returns valid JSON string matching in-memory state before flush', () => {
    const { s, store } = setupSession();
    s.startRun(1);
    s.frame(100);
    // Storage has not been flushed yet
    expect(store.get(LOG_KEY)).toBeNull();
    // But exportLog should return the full in-memory log
    const exported = s.exportLog();
    const parsed = JSON.parse(exported);
    expect(parsed).toMatchObject({
      version: 1,
      nextRunId: 2,
    });
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].type).toBe('run_start');
  });

  // =========================================================================
  // Group 3: Quitting & Run End Causes (MEC-003-R20)
  // =========================================================================

  it('QA-P1T8-11 MEC-003-R20 quit() during active run ends run with summary cause "quit" and won false', () => {
    const { s } = setupSession();
    s.startRun(1);
    s.frame(300);
    expect(s.summary()).toBeNull();
    s.quit();
    expect(s.summary()).toMatchObject({
      won: false,
      cause: 'quit',
      level: 1,
      startLevel: 1,
      levelsCleared: 0,
    });
  });

  it('QA-P1T8-12 MEC-003-R20 quit() records run_end with cause "quit" and does NOT increment deathCounts', () => {
    const { s, store } = setupSession();
    s.startRun(1);
    s.frame(300);
    s.quit();
    const log = loadLog(store);
    const endRecord = log.entries.find((e) => e.type === 'run_end');
    expect(endRecord).toMatchObject({
      type: 'run_end',
      cause: 'quit',
      won: false,
    });
    expect(log.deathCounts).toEqual({});
  });

  it('QA-P1T8-13 MEC-003-R20 death by wall collision records cause "wall" and increments deathCounts.wall', () => {
    const { s, store } = setupSession();
    s.startRun(1);
    s.frame(WALL_DEATH_MS);
    expect(s.summary()).toMatchObject({
      won: false,
      cause: 'wall',
    });
    const log = loadLog(store);
    const endRecord = log.entries.find((e) => e.type === 'run_end');
    expect(endRecord).toMatchObject({
      type: 'run_end',
      cause: 'wall',
      won: false,
    });
    expect(log.deathCounts.wall).toBe(1);
  });

  it('QA-P1T8-14 MEC-003-R18 / MEC-003-R20 cumulative deathCounts increment on deaths and ignore quit/clear', () => {
    const { s, store } = setupSession();

    // Run 1: dies against wall
    s.startRun(1);
    s.frame(WALL_DEATH_MS);
    expect(loadLog(store).deathCounts).toEqual({ wall: 1 });

    // Run 2: player quits
    s.startRun(1);
    s.frame(200);
    s.quit();
    expect(loadLog(store).deathCounts).toEqual({ wall: 1 });

    // Run 3: dies against wall again
    s.startRun(1);
    s.frame(WALL_DEATH_MS);
    expect(loadLog(store).deathCounts).toEqual({ wall: 2 });
  });

  // =========================================================================
  // Group 4: Run Win ("clear") & Checkpoints (MEC-003-R6, MEC-008-R2, MEC-008-R3)
  // =========================================================================

  it('QA-P1T8-15 MEC-003-R20 runWon ends run with cause "clear", won true, and does not increment deathCounts', () => {
    const { s, store } = setupSession({
      initialSave: { bestLevel: 30, unlockedCheckpoints: [12] },
    });
    s.startRun(12);
    processEvents(s, [{ type: 'runWon', score: 100, timeMs: 4500 }]);
    expect(s.summary()).toMatchObject({
      won: true,
      cause: 'clear',
    });
    const log = loadLog(store);
    const endRecord = log.entries.find((e) => e.type === 'run_end');
    expect(endRecord).toMatchObject({
      type: 'run_end',
      cause: 'clear',
      won: true,
    });
    expect(log.deathCounts).toEqual({});
  });

  it('QA-P1T8-16 MEC-008-R2 runWon sets fullClear true and unlocks checkpoint 12 in saved data', () => {
    const { s, store } = setupSession({
      initialSave: { bestLevel: 30, fullClear: false, unlockedCheckpoints: [4, 6, 8, 10] },
    });
    s.startRun(1);
    processEvents(s, [{ type: 'runWon', score: 200, timeMs: 12000 }]);
    const saved = load(store, rules);
    expect(saved.fullClear).toBe(true);
    expect(saved.unlockedCheckpoints).toContain(12);
  });

  it('QA-P1T8-17 MEC-008-R2 / MEC-003-R19 reaching milestone level mid-run records checkpoint_unlocked with level, reachedLevel and runId', () => {
    const { s, store } = setupSession({
      initialSave: { bestLevel: 5, unlockedCheckpoints: [] },
    });
    s.startRun(1);
    // Simulate leveling up to L10
    processEvents(s, [
      {
        type: 'levelUp',
        level: 10,
        biome: 2,
        challenge: false,
        biomeChanged: true,
        clearedLevelTimeMs: 3500,
      },
    ]);
    s.pause();
    const log = loadLog(store);
    const cpRecords = log.entries.filter((e) => e.type === 'checkpoint_unlocked');
    expect(cpRecords).toHaveLength(1);
    expect(cpRecords[0]).toMatchObject({
      type: 'checkpoint_unlocked',
      level: 4,
      reachedLevel: 10,
      runId: 1,
    });
  });

  it('QA-P1T8-18 MEC-008-R3 unlockedCheckpoints are saved immediately mid-run upon reaching milestone', () => {
    const { s, store } = setupSession({
      initialSave: { bestLevel: 9, unlockedCheckpoints: [] },
    });
    s.startRun(1);
    expect(load(store, rules).unlockedCheckpoints).toEqual([]);
    processEvents(s, [
      {
        type: 'levelUp',
        level: 10,
        biome: 2,
        challenge: false,
        biomeChanged: true,
        clearedLevelTimeMs: 2000,
      },
    ]);
    // Must be persisted immediately before run ends
    expect(load(store, rules).unlockedCheckpoints).toContain(4);
    expect(load(store, rules).bestLevel).toBe(10);
  });

  it('QA-P1T8-19 MEC-003-R19 mid-run level_up and skill_used events append corresponding log records', () => {
    const { s, store } = setupSession({
      initialSave: { bestLevel: 12, lastLoadout: ['slowmo', null] },
    });
    s.startRun(1);
    processEvents(s, [
      {
        type: 'skillUsed',
        slot: 0,
        skill: 'slowmo',
        level: 3,
        energyBefore: 50,
        energyAfter: 20,
      },
      {
        type: 'levelUp',
        level: 4,
        biome: 1,
        challenge: false,
        biomeChanged: false,
        clearedLevelTimeMs: 4200,
      },
    ]);
    s.hidden();
    const log = loadLog(store);
    const skillRecord = log.entries.find((e) => e.type === 'skill_used');
    expect(skillRecord).toMatchObject({
      type: 'skill_used',
      skill: 'slowmo',
      level: 3,
      energyBefore: 50,
      runId: 1,
    });
    const levelRecord = log.entries.find((e) => e.type === 'level_up');
    expect(levelRecord).toMatchObject({
      type: 'level_up',
      level: 4,
      levelTimeMs: 4200,
      runId: 1,
    });
  });

  // =========================================================================
  // Group 5: Best Level & Best Score Progression (MEC-008-R1, DECISIONS P1-D1)
  // =========================================================================

  it('QA-P1T8-20 MEC-008-R1 bestLevel updates in save data immediately upon startRun and on each levelUp', () => {
    const { s, store } = setupSession({
      initialSave: { bestLevel: 0, unlockedCheckpoints: [4] },
    });
    // Starting at L4 must immediately update bestLevel to at least 4
    s.startRun(4);
    expect(load(store, rules).bestLevel).toBe(4);
    expect(s.save().bestLevel).toBe(4);

    // Reaching L5 updates bestLevel to 5
    processEvents(s, [
      {
        type: 'levelUp',
        level: 5,
        biome: 1,
        challenge: true,
        biomeChanged: false,
        clearedLevelTimeMs: 3000,
      },
    ]);
    expect(load(store, rules).bestLevel).toBe(5);
    expect(s.save().bestLevel).toBe(5);
  });

  it('QA-P1T8-21 P1-D1 / MEC-008 run ending with higher score updates bestScore and sets summary.newBest true', () => {
    // Search for a seed where the initial regular mango is directly on the snake's straight path (y = 8, 8 < x < 17)
    let pathSeed = 1;
    for (let seed = 1; seed <= 200; seed++) {
      const sim = createSim(b, seed);
      const m = sim.snapshot().mango;
      if (m && m.y === 8 && m.x > 8 && m.x < 17) {
        pathSeed = seed;
        break;
      }
    }

    const { s, store } = setupSession({
      initialSave: { bestScore: 0 },
      customSeed: pathSeed,
    });
    s.startRun(1);
    s.frame(WALL_DEATH_MS); // Unsteered snake moves, eats mango if on path, then hits right wall
    const summary = s.summary();
    expect(summary).not.toBeNull();
    if (summary!.score > 0) {
      expect(summary?.newBest).toBe(true);
      expect(summary?.bestScore).toBe(summary?.score);
      expect(load(store, rules).bestScore).toBe(summary?.score);
    } else {
      // In the rare event no mango was on that direct line, score is 0 and newBest is false
      expect(summary?.newBest).toBe(false);
      expect(summary?.bestScore).toBe(0);
    }
  });

  it('QA-P1T8-22 P1-D1 / MEC-008 run ending with lower or equal score does not overwrite bestScore and sets summary.newBest false', () => {
    const { s, store } = setupSession({
      initialSave: { bestScore: 500 },
    });
    s.startRun(1);
    s.frame(WALL_DEATH_MS);
    expect(s.summary()?.newBest).toBe(false);
    expect(s.summary()?.bestScore).toBe(500);
    expect(load(store, rules).bestScore).toBe(500);
  });

  // =========================================================================
  // Group 6: Energy Carry-Over (MEC-008-R5, MEC-008-R6, MEC-008-R7)
  // =========================================================================

  it('QA-P1T8-23 MEC-008-R5 startRun consumes carriedEnergy, resets saved carriedEnergy to 0, and injects it into sim', () => {
    const { s, store } = setupSession({
      initialSave: { carriedEnergy: 40 },
    });
    expect(load(store, rules).carriedEnergy).toBe(40);
    s.startRun(1);
    // Consumed in save
    expect(load(store, rules).carriedEnergy).toBe(0);
    // Injected into sim snapshot
    expect(s.snapshot().energy).toBe(40);
  });

  it('QA-P1T8-24 MEC-008-R6 run ending saves carriedEnergy = floor(energy * 0.5) clamped to carryMax (50)', () => {
    const { s, store } = setupSession({
      initialSave: { carriedEnergy: 37 },
    });
    s.startRun(1);
    expect(s.snapshot().energy).toBe(37);
    // End run via wall death
    s.frame(WALL_DEATH_MS);
    // 37 * 0.5 = 18.5 -> floor = 18
    expect(load(store, rules).carriedEnergy).toBe(18);
    expect(s.summary()?.carriedEnergy).toBe(18);
  });

  it('QA-P1T8-25 MEC-008-R7 pause() and hidden() save provisional carriedEnergy mid-run without ending active run', () => {
    const { s, store } = setupSession({
      initialSave: { carriedEnergy: 50 },
    });
    s.startRun(1);
    s.frame(100);
    expect(s.summary()).toBeNull(); // Still playing

    s.pause();
    // 50 * 0.5 = 25 provisional carry
    expect(load(store, rules).carriedEnergy).toBe(25);
    expect(s.summary()).toBeNull(); // Run is NOT ended

    s.hidden();
    expect(load(store, rules).carriedEnergy).toBe(25);
    expect(s.summary()).toBeNull(); // Run is NOT ended
  });

  // =========================================================================
  // Group 7: Models & Settings (MEC-007, MEC-008)
  // =========================================================================

  it('QA-P1T8-26 MEC-008-R4 / MEC-008-R11 homeModel returns unlocked checkpoints, defaultStart, carriedEnergy, and nextMilestone', () => {
    const { s } = setupSession({
      initialSave: {
        bestLevel: 12,
        unlockedCheckpoints: [4, 6],
        carriedEnergy: 15,
      },
    });
    const model = s.homeModel();
    expect(model.checkpoints).toEqual([4, 6]);
    expect(model.defaultStart).toBe(6); // highest checkpoint
    expect(model.carriedEnergy).toBe(15);
    expect(model.showLoadout).toBe(true); // bestLevel 12 has unlocked skills
    expect(model.nextMilestone).toEqual({ reach: 20, requiresClear: false });
  });

  it('QA-P1T8-27 MEC-007-R1 / MEC-007-R3 loadoutModel returns unlocked skills, slotCount, and sanitized selection based on bestLevel', () => {
    // bestLevel 4 -> slotCount 1 (slot 2 unlocks at L6), only slowmo unlocked (L3)
    const { s } = setupSession({
      initialSave: {
        bestLevel: 4,
        lastLoadout: ['tailSnip', 'shield'], // locked skills
      },
    });
    const model = s.loadoutModel();
    expect(model.slotCount).toBe(1);
    expect(model.unlocked).toEqual(['slowmo']);
    // TailSnip and shield are replaced by sanitized valid selection
    expect(model.selection).toEqual(['slowmo', null]);
  });

  it('QA-P1T8-28 MEC-007-R9 confirmLoadout updates lastLoadout in persistent save', () => {
    const { s, store } = setupSession({
      initialSave: {
        bestLevel: 16,
        lastLoadout: [null, null],
      },
    });
    s.confirmLoadout(['shield', 'slowmo']);
    expect(load(store, rules).lastLoadout).toEqual(['shield', 'slowmo']);
    expect(s.save().lastLoadout).toEqual(['shield', 'slowmo']);
  });

  it('QA-P1T8-29 P1-D1 setSound updates settings.sound in save data and is reflected in s.save()', () => {
    const { s, store } = setupSession();
    expect(s.save().settings.sound).toBe(true);
    s.setSound(false);
    expect(load(store, rules).settings.sound).toBe(false);
    expect(s.save().settings.sound).toBe(false);
    s.setSound(true);
    expect(load(store, rules).settings.sound).toBe(true);
    expect(s.save().settings.sound).toBe(true);
  });

  // =========================================================================
  // Group 8: Idle / No-Op Invariants & Storage Resiliency (P1-D1, MEC-003-R18, MEC-008-R12)
  // =========================================================================

  it('QA-P1T8-30 P1-D1 calls to pause(), hidden(), quit(), and frame() with no active run are safe no-ops', () => {
    const { s, store } = setupSession();
    expect(() => s.pause()).not.toThrow();
    expect(() => s.hidden()).not.toThrow();
    expect(() => s.quit()).not.toThrow();
    expect(s.frame(100)).toEqual([]);
    expect(s.summary()).toBeNull();
    expect(store.get(LOG_KEY)).toBeNull();
  });

  it('QA-P1T8-31 P1-D1 snapshot() throws Error when no run is active, but returns valid snapshot after run is over', () => {
    const { s } = setupSession();
    expect(() => s.snapshot()).toThrow(/no run/);
    s.startRun(1);
    expect(() => s.snapshot()).not.toThrow();
    s.frame(WALL_DEATH_MS); // Over
    expect(s.summary()?.cause).toBe('wall');
    // Snapshot should still be available after run ends
    expect(() => s.snapshot()).not.toThrow();
    expect(s.snapshot().status).toBe('over');
  });

  it('QA-P1T8-32 MEC-003-R18 / MEC-008-R12 store throwing on set or get never crashes session operations', () => {
    const throwingStore: KeyValueStore = {
      get(_key: string) {
        throw new Error('Storage read failure');
      },
      set(_key: string, _value: string) {
        throw new Error('Storage write failure');
      },
    };

    let session!: Session;
    expect(() => {
      session = createSession({
        balance: b,
        store: throwingStore,
        newSeed: () => 1,
        now: () => 1000,
      });
    }).not.toThrow();

    expect(() => session.startRun(1)).not.toThrow();
    expect(() => session.frame(100)).not.toThrow();
    expect(() => session.pause()).not.toThrow();
    expect(() => session.hidden()).not.toThrow();
    expect(() => session.confirmLoadout(['slowmo', null])).not.toThrow();
    expect(() => session.setSound(false)).not.toThrow();
    expect(() => session.quit()).not.toThrow();
    expect(session.summary()?.cause).toBe('quit');
  });

  // =========================================================================
  // Group 9: Spec Clarifications & Ambiguity Questions (it.todo)
  // =========================================================================

  it.todo(
    'QA-P1T8-33 MEC-008-R5 / P1-D1: If startRun is called while a run is already active, should the existing run be automatically terminated with cause "quit", throw an Error, or be replaced silently?',
  );

  it.todo(
    'QA-P1T8-34 MEC-007-R2: When startRun is called with entry "results", the UI bypasses loadout selection; should confirmLoadout be rejected or ignored while in results flow?',
  );

  it.todo(
    'QA-P1T8-35 MEC-003-R19: run_end.durationMs is specified as "= sim timeMs". Should durationMs strictly equal sim timeMs under slowmo or clock pause, rather than wall-clock duration?',
  );
});
