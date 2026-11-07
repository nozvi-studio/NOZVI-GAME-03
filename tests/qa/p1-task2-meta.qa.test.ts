// tests/qa/p1-task2-meta.qa.test.ts — independent black-box QA tests for P1 Task 2 meta modules
import { describe, expect, it } from 'vitest';
import {
  appendRecord,
  applyLevelReached,
  applyRunWon,
  carryEnergy,
  defaultSave,
  emptyLog,
  flushLog,
  load,
  loadLog,
  LOG_KEY,
  memoryStore,
  MIGRATIONS,
  nextMilestone,
  nextRun,
  sanitizeLoadout,
  save,
  SAVE_KEY,
  SAVE_VERSION,
  defaultSettings,
  type KeyValueStore,
  type LogRecord,
  type ProgressionConfig,
  type RunLog,
  type SaveDataV2,
  type SaveRules,
  type UnlockTable,
} from '../../src/meta';

// Standard progression & loadout config slices derived from MEC specs & balance.json
const PROGRESSION_CFG: ProgressionConfig = {
  checkpoints: {
    milestones: [
      { reach: 10, start: 4 },
      { reach: 15, start: 6 },
      { reach: 20, start: 8 },
      { reach: 25, start: 10 },
      { reach: 30, start: 12, requiresClear: true },
    ],
    carryRatio: 0.5,
    carryMax: 50,
  },
};

type SkillId = 'slowmo' | 'tailSnip' | 'shield' | 'mangoRain';

const UNLOCK_TABLE: UnlockTable<SkillId> = {
  order: ['slowmo', 'tailSnip', 'shield', 'mangoRain'],
  unlockLevel: {
    slowmo: 3,
    tailSnip: 6,
    shield: 11,
    mangoRain: 16,
  },
  secondSlotLevel: 6,
};

const SAVE_RULES: SaveRules = {
  skillIds: ['slowmo', 'tailSnip', 'shield', 'mangoRain'],
  maxLevel: 30,
  carryMax: 50,
};

describe('QA P1 Task 2: Meta Modules (Black-Box)', () => {
  // =========================================================================
  // Section 1: Save v2 + migration v1->v2 (MEC-008-R12)
  // =========================================================================

  it('QA-P1T2-01 MEC-008-R12 defaultSave provides baseline SaveDataV2 with default fields', () => {
    const def = defaultSave();
    expect(def).toEqual({
      bestScore: 0,
      settings: { ...defaultSettings(), sound: true },
      bestLevel: 0,
      fullClear: false,
      unlockedCheckpoints: [],
      carriedEnergy: 0,
      lastLoadout: [null, null],
    });
  });

  it('QA-P1T2-02 MEC-008-R12 MIGRATIONS[1] maps valid v1 save object to v2 preserving bestScore & sound', () => {
    const v1Data = { bestScore: 120, settings: { ...defaultSettings(), sound: false } };
    const migrated = MIGRATIONS[1](v1Data);
    expect(migrated).toEqual({
      bestScore: 120,
      settings: { ...defaultSettings(), sound: false },
      bestLevel: 0,
      fullClear: false,
      unlockedCheckpoints: [],
      carriedEnergy: 0,
      lastLoadout: [null, null],
    });
  });

  it('QA-P1T2-03 MEC-008-R12 MIGRATIONS[1] safely handles non-object input by returning null', () => {
    expect(MIGRATIONS[1](null)).toBeNull();
    expect(MIGRATIONS[1]('string')).toBeNull();
    expect(MIGRATIONS[1](123)).toBeNull();
    expect(MIGRATIONS[1]([1, 2, 3])).toBeNull();
  });

  it('QA-P1T2-04 MEC-008-R12 load on stored v1 save triggers migration to v2', () => {
    const store = memoryStore({
      [SAVE_KEY]: JSON.stringify({
        version: 1,
        data: { bestScore: 250, settings: { ...defaultSettings(), sound: false } },
      }),
    });
    const loaded = load(store, SAVE_RULES);
    expect(loaded).toEqual({
      bestScore: 250,
      settings: { ...defaultSettings(), sound: false },
      bestLevel: 0,
      fullClear: false,
      unlockedCheckpoints: [],
      carriedEnergy: 0,
      lastLoadout: [null, null],
    });
  });

  it('QA-P1T2-05 MEC-008-R12 load validates per-field: bestLevel and carriedEnergy are floored and clamped', () => {
    const store = memoryStore({
      [SAVE_KEY]: JSON.stringify({
        version: 2,
        data: {
          ...defaultSave(),
          bestLevel: 12.8,
          carriedEnergy: 999,
        },
      }),
    });
    const loaded = load(store, SAVE_RULES);
    expect(loaded.bestLevel).toBe(12);
    expect(loaded.carriedEnergy).toBe(50);

    // Negative values clamped to 0
    const storeNeg = memoryStore({
      [SAVE_KEY]: JSON.stringify({
        version: 2,
        data: {
          ...defaultSave(),
          bestLevel: -10,
          carriedEnergy: -5,
        },
      }),
    });
    const loadedNeg = load(storeNeg, SAVE_RULES);
    expect(loadedNeg.bestLevel).toBe(0);
    expect(loadedNeg.carriedEnergy).toBe(0);
  });

  it('QA-P1T2-06 MEC-008-R12 load validates per-field: unlockedCheckpoints drops non-integers, out-of-range, and de-duplicates/sorts', () => {
    const store = memoryStore({
      [SAVE_KEY]: JSON.stringify({
        version: 2,
        data: {
          ...defaultSave(),
          unlockedCheckpoints: [8, 4, 4, 1.5, 0, 31, -5, 'invalid', null, 6],
        },
      }),
    });
    const loaded = load(store, SAVE_RULES);
    expect(loaded.unlockedCheckpoints).toEqual([4, 6, 8]);
  });

  it('QA-P1T2-07 MEC-008-R12 load validates per-field: lastLoadout resets to [null, null] when invalid shape or unknown skills', () => {
    const invalidLoadouts = [
      ['unknownSkill', null],
      ['slowmo', 'unknownSkill'],
      ['slowmo'],
      ['slowmo', 'tailSnip', 'shield'],
      'not-an-array',
      null,
      [123, 456],
    ];

    for (const bad of invalidLoadouts) {
      const store = memoryStore({
        [SAVE_KEY]: JSON.stringify({
          version: 2,
          data: {
            ...defaultSave(),
            bestScore: 50,
            lastLoadout: bad,
          },
        }),
      });
      const loaded = load(store, SAVE_RULES);
      expect(loaded.bestScore).toBe(50);
      expect(loaded.lastLoadout).toEqual([null, null]);
    }
  });

  it('QA-P1T2-08 MEC-008-R12 load validates per-field: fullClear resets to false if not a boolean while keeping valid fields', () => {
    const store = memoryStore({
      [SAVE_KEY]: JSON.stringify({
        version: 2,
        data: {
          ...defaultSave(),
          bestScore: 75,
          fullClear: 'true',
        },
      }),
    });
    const loaded = load(store, SAVE_RULES);
    expect(loaded.bestScore).toBe(75);
    expect(loaded.fullClear).toBe(false);
  });

  it('QA-P1T2-09 MEC-008-R12 load envelope errors fall back to full defaultSave on unparsable JSON', () => {
    const corruptStrings = ['{ broken json', '', 'undefined', 'not-json', '{ version: 2 }'];
    for (const bad of corruptStrings) {
      const store = memoryStore({ [SAVE_KEY]: bad });
      expect(() => load(store, SAVE_RULES)).not.toThrow();
      expect(load(store, SAVE_RULES)).toEqual(defaultSave());
    }
  });

  it('QA-P1T2-10 MEC-008-R12 load envelope errors fall back to full defaultSave on invalid or future version', () => {
    const badVersions = [
      { version: 3, data: defaultSave() },
      { version: -1, data: defaultSave() },
      { version: '2', data: defaultSave() },
      { data: defaultSave() },
      { version: 2 },
    ];
    for (const env of badVersions) {
      const store = memoryStore({ [SAVE_KEY]: JSON.stringify(env) });
      expect(load(store, SAVE_RULES)).toEqual(defaultSave());
    }
  });

  it('QA-P1T2-11 MEC-008-R12 load never throws when store.get throws, returning defaultSave', () => {
    const throwingStore: KeyValueStore = {
      get: () => {
        throw new Error('Storage read failure');
      },
      set: () => {},
    };
    expect(() => load(throwingStore, SAVE_RULES)).not.toThrow();
    expect(load(throwingStore, SAVE_RULES)).toEqual(defaultSave());
  });

  it('QA-P1T2-12 MEC-008-R12 save writes envelope with version 2 and returns false on store.set throwing', () => {
    const store = memoryStore();
    const saveState: SaveDataV2 = {
      bestScore: 99,
      settings: { ...defaultSettings(), sound: false },
      bestLevel: 15,
      fullClear: false,
      unlockedCheckpoints: [4, 6],
      carriedEnergy: 20,
      lastLoadout: ['slowmo', 'tailSnip'],
    };
    expect(save(store, saveState)).toBe(true);

    const raw = store.get(SAVE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(SAVE_VERSION);
    expect(parsed.data).toEqual(saveState);

    const throwingStore: KeyValueStore = {
      get: () => null,
      set: () => {
        throw new Error('Quota exceeded');
      },
    };
    expect(() => save(throwingStore, saveState)).not.toThrow();
    expect(save(throwingStore, saveState)).toBe(false);
  });

  // =========================================================================
  // Section 2: Checkpoint progression (MEC-008)
  // =========================================================================

  it('QA-P1T2-13 MEC-008-R1 applyLevelReached updates bestLevel to max(bestLevel, reachedLevel)', () => {
    const init = defaultSave();
    const step1 = applyLevelReached(init, 5, PROGRESSION_CFG);
    expect(step1.data.bestLevel).toBe(5);

    // Reaching a lower level does not decrease bestLevel
    const step2 = applyLevelReached(step1.data, 3, PROGRESSION_CFG);
    expect(step2.data.bestLevel).toBe(5);
  });

  it('QA-P1T2-14 MEC-008-R2, MEC-008-R3 applyLevelReached unlocks checkpoints and returns them in newCheckpoints', () => {
    const init = defaultSave();
    // Reaching L10 unlocks start checkpoint 4
    const res10 = applyLevelReached(init, 10, PROGRESSION_CFG);
    expect(res10.data.bestLevel).toBe(10);
    expect(res10.data.unlockedCheckpoints).toEqual([4]);
    expect(res10.newCheckpoints).toEqual([4]);

    // Reaching L15 unlocks start checkpoint 6
    const res15 = applyLevelReached(res10.data, 15, PROGRESSION_CFG);
    expect(res15.data.bestLevel).toBe(15);
    expect(res15.data.unlockedCheckpoints).toEqual([4, 6]);
    expect(res15.newCheckpoints).toEqual([6]);

    // Reaching L20 unlocks start checkpoint 8
    const res20 = applyLevelReached(res15.data, 20, PROGRESSION_CFG);
    expect(res20.data.unlockedCheckpoints).toEqual([4, 6, 8]);
    expect(res20.newCheckpoints).toEqual([8]);

    // Reaching L25 unlocks start checkpoint 10
    const res25 = applyLevelReached(res20.data, 25, PROGRESSION_CFG);
    expect(res25.data.unlockedCheckpoints).toEqual([4, 6, 8, 10]);
    expect(res25.newCheckpoints).toEqual([10]);
  });

  it('QA-P1T2-15 MEC-008-R2 applyLevelReached reaching L30 does NOT unlock L12 without clear', () => {
    const save25 = {
      ...defaultSave(),
      bestLevel: 25,
      unlockedCheckpoints: [4, 6, 8, 10],
    };
    const res30 = applyLevelReached(save25, 30, PROGRESSION_CFG);
    expect(res30.data.bestLevel).toBe(30);
    expect(res30.data.unlockedCheckpoints).toEqual([4, 6, 8, 10]);
    expect(res30.newCheckpoints).toEqual([]);
    expect(res30.data.fullClear).toBe(false);
  });

  it('QA-P1T2-16 MEC-008-R3 applyLevelReached is idempotent for already unlocked checkpoints', () => {
    const save10 = {
      ...defaultSave(),
      bestLevel: 10,
      unlockedCheckpoints: [4],
    };
    const res = applyLevelReached(save10, 10, PROGRESSION_CFG);
    expect(res.data.unlockedCheckpoints).toEqual([4]);
    expect(res.newCheckpoints).toEqual([]);
  });

  it('QA-P1T2-17 MEC-008-R2, MEC-008-R3 applyRunWon sets fullClear: true and unlocks requiresClear checkpoint L12', () => {
    const save30 = {
      ...defaultSave(),
      bestLevel: 30,
      unlockedCheckpoints: [4, 6, 8, 10],
    };
    const resWon = applyRunWon(save30, PROGRESSION_CFG);
    expect(resWon.data.fullClear).toBe(true);
    expect(resWon.data.unlockedCheckpoints).toEqual([4, 6, 8, 10, 12]);
    expect(resWon.newCheckpoints).toEqual([12]);

    // Calling applyRunWon again is idempotent
    const resWon2 = applyRunWon(resWon.data, PROGRESSION_CFG);
    expect(resWon2.newCheckpoints).toEqual([]);
    expect(resWon2.data.unlockedCheckpoints).toEqual([4, 6, 8, 10, 12]);
  });

  it('QA-P1T2-18 MEC-008-R3 permanence: existing unlocked checkpoints are preserved and sorted even if config milestones change', () => {
    const customSave: SaveDataV2 = {
      ...defaultSave(),
      bestLevel: 1,
      unlockedCheckpoints: [5, 12],
    };
    const res = applyLevelReached(customSave, 10, PROGRESSION_CFG);
    // Unlocked 4 from L10 milestone, keeps 5 and 12, sorted ascending
    expect(res.data.unlockedCheckpoints).toEqual([4, 5, 12]);
    expect(res.newCheckpoints).toEqual([4]);
  });

  it('QA-P1T2-19 MEC-008-R6 carryEnergy calculates floor(energy * carryRatio) clamped to [0, carryMax]', () => {
    expect(carryEnergy(50, PROGRESSION_CFG)).toBe(25);
    expect(carryEnergy(35, PROGRESSION_CFG)).toBe(17); // floor(17.5) = 17
    expect(carryEnergy(1, PROGRESSION_CFG)).toBe(0); // floor(0.5) = 0
    expect(carryEnergy(0, PROGRESSION_CFG)).toBe(0);
    expect(carryEnergy(100, PROGRESSION_CFG)).toBe(50); // clamped to carryMax 50
    expect(carryEnergy(200, PROGRESSION_CFG)).toBe(50);
    expect(carryEnergy(37, PROGRESSION_CFG)).toBe(18); // floor(18.5) = 18
  });

  it('QA-P1T2-20 MEC-008-R11 nextMilestone returns next milestone or null when all unlocked', () => {
    // bestLevel 0 -> reach 10
    expect(nextMilestone(defaultSave(), PROGRESSION_CFG)).toEqual({ reach: 10, requiresClear: false });

    // bestLevel 10 -> reach 15
    const s10 = { ...defaultSave(), bestLevel: 10, unlockedCheckpoints: [4] };
    expect(nextMilestone(s10, PROGRESSION_CFG)).toEqual({ reach: 15, requiresClear: false });

    // bestLevel 25 -> reach 30 (requiresClear true)
    const s25 = { ...defaultSave(), bestLevel: 25, unlockedCheckpoints: [4, 6, 8, 10] };
    expect(nextMilestone(s25, PROGRESSION_CFG)).toEqual({ reach: 30, requiresClear: true });

    // bestLevel 30, but fullClear false -> reach 30 (requiresClear true)
    const s30 = { ...defaultSave(), bestLevel: 30, unlockedCheckpoints: [4, 6, 8, 10], fullClear: false };
    expect(nextMilestone(s30, PROGRESSION_CFG)).toEqual({ reach: 30, requiresClear: true });

    // bestLevel 30 and fullClear true -> null (all milestones unlocked)
    const sWon = { ...defaultSave(), bestLevel: 30, unlockedCheckpoints: [4, 6, 8, 10, 12], fullClear: true };
    expect(nextMilestone(sWon, PROGRESSION_CFG)).toBeNull();
  });

  // =========================================================================
  // Section 3: Loadout sanitizing (MEC-007-R4)
  // =========================================================================

  it('QA-P1T2-21 MEC-007-R4 step 1: missing, non-array or wrong length input is treated as [null, null]', () => {
    const wrongInputs = [undefined, null, 'slowmo', 123, [], ['slowmo'], ['slowmo', 'tailSnip', 'shield']];
    for (const bad of wrongInputs) {
      // At bestLevel 6, slowmo and tailSnip are unlocked; slotCount is 2
      const sanitized = sanitizeLoadout(bad, 6, UNLOCK_TABLE);
      expect(sanitized).toEqual(['slowmo', 'tailSnip']);
    }
  });

  it('QA-P1T2-22 MEC-007-R4 at bestLevel 1-2 (no skills unlocked), returns [null, null]', () => {
    expect(sanitizeLoadout([null, null], 1, UNLOCK_TABLE)).toEqual([null, null]);
    expect(sanitizeLoadout(['slowmo', 'tailSnip'], 2, UNLOCK_TABLE)).toEqual([null, null]);
  });

  it('QA-P1T2-23 MEC-007-R4 at bestLevel 3-5 (1 slot, only slowmo unlocked), returns [slowmo, null]', () => {
    // Slot 2 must be null when bestLevel < secondSlotLevel (6)
    expect(sanitizeLoadout([null, null], 3, UNLOCK_TABLE)).toEqual(['slowmo', null]);
    expect(sanitizeLoadout(['slowmo', 'tailSnip'], 4, UNLOCK_TABLE)).toEqual(['slowmo', null]);
    expect(sanitizeLoadout([null, 'slowmo'], 5, UNLOCK_TABLE)).toEqual(['slowmo', null]);
  });

  it('QA-P1T2-24 MEC-007-R4 steps 2 & 4: unknown skills and locked skills are replaced by null', () => {
    // At bestLevel 6, tailSnip is unlocked, but shield (L11) and mangoRain (L16) are locked
    const input = ['unknownSkill' as SkillId, 'shield' as SkillId];
    const sanitized = sanitizeLoadout(input, 6, UNLOCK_TABLE);
    // Step 2 turns both to null -> Step 5 fills with slowmo, tailSnip
    expect(sanitized).toEqual(['slowmo', 'tailSnip']);
  });

  it('QA-P1T2-25 MEC-007-R4 step 3: duplicate skills in slots are replaced with next unchosen unlocked skill', () => {
    // At bestLevel 11, slowmo, tailSnip, shield are unlocked; 2 slots
    const input: [SkillId, SkillId] = ['shield', 'shield'];
    const sanitized = sanitizeLoadout(input, 11, UNLOCK_TABLE);
    // Duplicate shield in slot 2 becomes null, then filled with first unchosen unlocked ('slowmo')
    expect(sanitized).toEqual(['shield', 'slowmo']);
  });

  it('QA-P1T2-26 MEC-007-R4 step 5: fills null slots below slotCount from order with first unchosen unlocked', () => {
    // At bestLevel 16, all 4 skills unlocked; slot 0 has mangoRain
    const input: [SkillId, null] = ['mangoRain', null];
    const sanitized = sanitizeLoadout(input, 16, UNLOCK_TABLE);
    expect(sanitized).toEqual(['mangoRain', 'slowmo']);

    // When slot 0 has slowmo, slot 1 fills with tailSnip
    const input2: [SkillId, null] = ['slowmo', null];
    const sanitized2 = sanitizeLoadout(input2, 16, UNLOCK_TABLE);
    expect(sanitized2).toEqual(['slowmo', 'tailSnip']);
  });

  it('QA-P1T2-27 MEC-007-R4 step 6: if slot 1 (index 0) is null and slot 2 (index 1) is not null, moves slot 2 to slot 1', () => {
    // If input has [null, 'slowmo'] at L3 (slotCount 1):
    // Step 4 sets slot 2 to null -> Step 6 moves or Step 5 fills -> ['slowmo', null]
    expect(sanitizeLoadout([null, 'slowmo'], 3, UNLOCK_TABLE)).toEqual(['slowmo', null]);

    // Custom table test where only 1 skill is unlocked but passed in slot 2 with 2 slots available
    const customTable: UnlockTable<'a' | 'b'> = {
      order: ['a', 'b'],
      unlockLevel: { a: 10, b: 1 },
      secondSlotLevel: 1,
    };
    // At level 5: b is unlocked (L1), a is locked (L10); slotCount is 2
    // input [null, 'b'] -> step 2 leaves [null, 'b'] -> step 5 has no other unlocked skill to fill -> step 6 moves 'b' to slot 0
    expect(sanitizeLoadout([null, 'b'], 5, customTable)).toEqual(['b', null]);
  });

  it('QA-P1T2-28 MEC-007-R4 sanitizeLoadout does not mutate the passed input array', () => {
    const input: [SkillId, SkillId] = ['slowmo', 'slowmo'];
    Object.freeze(input);
    expect(() => sanitizeLoadout(input, 6, UNLOCK_TABLE)).not.toThrow();
    expect(input).toEqual(['slowmo', 'slowmo']);
  });

  // =========================================================================
  // Section 4: Run log ring buffer, deathCounts, causes, never-throws (MEC-003-R18..R20)
  // =========================================================================

  it('QA-P1T2-29 MEC-003-R18 emptyLog returns initial baseline and LOG_KEY matches spec', () => {
    expect(LOG_KEY).toBe('mango-snake.log');
    expect(emptyLog()).toEqual({
      version: 1,
      nextRunId: 1,
      entries: [],
      deathCounts: {},
    });
  });

  it('QA-P1T2-30 MEC-003-R18 loadLog and flushLog round-trip correctly via KeyValueStore', () => {
    const store = memoryStore();
    expect(loadLog(store)).toEqual(emptyLog());

    const log: RunLog = {
      version: 1,
      nextRunId: 2,
      entries: [
        {
          type: 'run_start',
          t: 1000,
          runId: 1,
          startLevel: 1,
          startEnergy: 0,
          loadout: [null, null],
          entry: 'home',
        },
      ],
      deathCounts: { wall: 1 },
    };

    expect(flushLog(store, log)).toBe(true);
    expect(loadLog(store)).toEqual(log);
  });

  it('QA-P1T2-31 MEC-003-R18 loadLog never throws on corrupt JSON or invalid envelope', () => {
    const corruptValues = ['{ invalid json', '', 'null', '123', JSON.stringify({ version: 2 })];
    for (const bad of corruptValues) {
      const store = memoryStore({ [LOG_KEY]: bad });
      expect(() => loadLog(store)).not.toThrow();
      expect(loadLog(store)).toEqual(emptyLog());
    }
  });

  it('QA-P1T2-32 MEC-003-R18 loadLog and flushLog swallow storage errors without throwing', () => {
    const throwingStore: KeyValueStore = {
      get: () => {
        throw new Error('Store read failed');
      },
      set: () => {
        throw new Error('Store write failed');
      },
    };
    expect(() => loadLog(throwingStore)).not.toThrow();
    expect(loadLog(throwingStore)).toEqual(emptyLog());
    expect(() => flushLog(throwingStore, emptyLog())).not.toThrow();
    expect(flushLog(throwingStore, emptyLog())).toBe(false);
  });

  it('QA-P1T2-33 MEC-003-R19 nextRun increments nextRunId and returns previous ID', () => {
    const log0 = emptyLog();
    const { log: log1, runId: id1 } = nextRun(log0);
    expect(id1).toBe(1);
    expect(log1.nextRunId).toBe(2);

    const { log: log2, runId: id2 } = nextRun(log1);
    expect(id2).toBe(2);
    expect(log2.nextRunId).toBe(3);
  });

  it('QA-P1T2-34 MEC-003-R18 appendRecord enforces ring buffer dropping oldest entries beyond maxEntries (including 501 entries)', () => {
    let log = emptyLog();
    const MAX = 500;

    // Append 501 run_start records
    for (let i = 1; i <= 501; i++) {
      const rec: LogRecord = {
        type: 'run_start',
        t: i * 10,
        runId: i,
        startLevel: 1,
        startEnergy: 0,
        loadout: [null, null],
        entry: 'home',
      };
      log = appendRecord(log, rec, MAX);
    }

    expect(log.entries.length).toBe(MAX);
    // Oldest entry (runId 1) was dropped; first entry should now be runId 2
    expect(log.entries[0].runId).toBe(2);
    // Last entry is the 501st entry
    expect(log.entries[MAX - 1].runId).toBe(501);
  });

  it('QA-P1T2-35 MEC-003-R20 appendRecord increments deathCounts for death causes including unknown cause', () => {
    let log = emptyLog();

    const deathRec1: LogRecord = {
      type: 'run_end',
      t: 100,
      runId: 1,
      level: 4,
      score: 10,
      cause: 'wall',
      durationMs: 5000,
      startLevel: 1,
      levelsCleared: 3,
      won: false,
    };
    log = appendRecord(log, deathRec1, 500);
    expect(log.deathCounts.wall).toBe(1);

    // Another death by wall
    log = appendRecord(log, { ...deathRec1, runId: 2 }, 500);
    expect(log.deathCounts.wall).toBe(2);

    // Death by unknown cause (e.g. 'meteor') increments its own counter
    const unknownCauseRec: LogRecord = {
      type: 'run_end',
      t: 200,
      runId: 3,
      level: 5,
      score: 15,
      cause: 'meteor',
      durationMs: 7000,
      startLevel: 1,
      levelsCleared: 4,
      won: false,
    };
    log = appendRecord(log, unknownCauseRec, 500);
    expect(log.deathCounts.meteor).toBe(1);
    expect(log.deathCounts.wall).toBe(2);
  });

  it('QA-P1T2-36 MEC-003-R20 appendRecord with causes clear and quit does NOT increment deathCounts', () => {
    let log = emptyLog();

    // Clear (run won)
    const clearRec: LogRecord = {
      type: 'run_end',
      t: 100,
      runId: 1,
      level: 30,
      score: 500,
      cause: 'clear',
      durationMs: 60000,
      startLevel: 1,
      levelsCleared: 30,
      won: true,
    };
    log = appendRecord(log, clearRec, 500);
    expect(log.deathCounts).toEqual({});

    // Quit (abandoned run)
    const quitRec: LogRecord = {
      type: 'run_end',
      t: 200,
      runId: 2,
      level: 5,
      score: 20,
      cause: 'quit',
      durationMs: 10000,
      startLevel: 1,
      levelsCleared: 4,
      won: false,
    };
    log = appendRecord(log, quitRec, 500);
    expect(log.deathCounts).toEqual({});
  });

  it('QA-P1T2-37 MEC-003-R18, MEC-003-R20 deathCounts are cumulative and never trimmed when ring buffer overflows', () => {
    let log = emptyLog();
    const SMALL_MAX = 3;

    // Append 5 death records with ring buffer max = 3
    for (let i = 1; i <= 5; i++) {
      const rec: LogRecord = {
        type: 'run_end',
        t: i * 100,
        runId: i,
        level: i,
        score: i * 10,
        cause: 'hazard',
        durationMs: 2000,
        startLevel: 1,
        levelsCleared: i - 1,
        won: false,
      };
      log = appendRecord(log, rec, SMALL_MAX);
    }

    // Ring buffer dropped first 2 entries
    expect(log.entries.length).toBe(SMALL_MAX);
    expect(log.entries.map(e => e.runId)).toEqual([3, 4, 5]);
    // deathCounts never trimmed, counted all 5 deaths
    expect(log.deathCounts.hazard).toBe(5);
  });

  it('QA-P1T2-38 MEC-003-R19 non-run_end records append to entries without modifying deathCounts', () => {
    let log = emptyLog();

    const recs: LogRecord[] = [
      {
        type: 'run_start',
        t: 100,
        runId: 1,
        startLevel: 1,
        startEnergy: 0,
        loadout: [null, null],
        entry: 'home',
      },
      {
        type: 'level_up',
        t: 200,
        runId: 1,
        level: 2,
        levelTimeMs: 15000,
      },
      {
        type: 'skill_used',
        t: 250,
        runId: 1,
        skill: 'slowmo',
        level: 2,
        energyBefore: 30,
      },
      {
        type: 'checkpoint_unlocked',
        t: 300,
        runId: 1,
        level: 4,
        reachedLevel: 10,
      },
    ];

    for (const rec of recs) {
      log = appendRecord(log, rec, 500);
    }

    expect(log.entries.length).toBe(4);
    expect(log.deathCounts).toEqual({});
  });

  // =========================================================================
  // Section 5: Spec Clarifications / edge case questions (mark it.todo)
  // =========================================================================

  it.todo(
    'QA-P1T2-39 MEC-003-R18 appendRecord behavior when maxEntries <= 0: should it throw RangeError or truncate all entries?',
  );

  it.todo(
    'QA-P1T2-40 MEC-008-R1 applyLevelReached behavior when reaching level > maxLevel (e.g. 31): should meta clamp to maxLevel or trust the core?',
  );

  it.todo(
    'QA-P1T2-41 MEC-008-R6 vs Section 3: carryEnergy with negative energy. Formula min(carryMax, floor(energy * carryRatio)) produces negative values, but Section 3 specifies carriedEnergy is in [0, 50]. Should carryEnergy clamp lower bound to 0?',
  );
});
