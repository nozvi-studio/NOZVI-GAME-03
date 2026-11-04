// tests/qa/task6-save.qa.test.ts — independent black-box QA tests for Task 6
import { describe, expect, it } from 'vitest';
import {
  defaultSave,
  load,
  memoryStore,
  save,
  SAVE_KEY,
  SAVE_VERSION,
  type KeyValueStore,
  type Migration,
  type SaveData,
  type SaveDataV2,
  type SaveRules,
} from '../../src/meta';
import { findViolations } from '../support/boundary';

const metaSources = import.meta.glob(['../../src/meta/**/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('QA Task 6: Save Skeleton (Black-Box)', () => {
  // updated for P1 MEC-008-R12
  it('QA-T6-01 MEC-008-R12 defaultSave returns valid baseline data', () => {
    const def = defaultSave();
    expect(def).toEqual({
      bestScore: 0,
      settings: { sound: true },
      bestLevel: 0,
      fullClear: false,
      unlockedCheckpoints: [],
      carriedEnergy: 0,
      lastLoadout: [null, null],
    });
  });

  // updated for P1 MEC-008-R12
  it('QA-T6-02 MEC-008-R12 load on empty store returns defaultSave', () => {
    const store = memoryStore();
    expect(load(store)).toEqual(defaultSave());
  });

  // updated for P1 MEC-008-R12
  it('QA-T6-03 MEC-008-R12 load returns fresh copy not shared reference', () => {
    const store = memoryStore();
    const s1 = load(store);
    s1.bestScore = 999;
    s1.settings.sound = false;
    s1.bestLevel = 15;
    s1.fullClear = true;
    (s1.unlockedCheckpoints as number[]).push(4, 6);
    s1.carriedEnergy = 25;
    (s1.lastLoadout as unknown as (string | null)[])[0] = 'slowmo';
    const s2 = load(store);
    expect(s2).toEqual(defaultSave());
    expect(s2.settings).not.toBe(s1.settings);
    expect(s2.unlockedCheckpoints).not.toBe(s1.unlockedCheckpoints);
    expect(s2.lastLoadout).not.toBe(s1.lastLoadout);
  });

  // updated for P1 MEC-008-R12
  it('QA-T6-04 MEC-008-R12 round trip save and load preserves state', () => {
    const store = memoryStore();
    const rules: SaveRules = {
      skillIds: ['slowmo', 'tailSnip', 'shield', 'mangoRain'],
      maxLevel: 30,
      carryMax: 50,
    };
    const data: SaveDataV2 = {
      bestScore: 42,
      settings: { sound: false },
      bestLevel: 15,
      fullClear: false,
      unlockedCheckpoints: [4, 6],
      carriedEnergy: 25,
      lastLoadout: ['slowmo', 'tailSnip'],
    };
    const ok = save(store, data);
    expect(ok).toBe(true);
    expect(load(store, rules)).toEqual(data);
  });

  // updated for P1 MEC-008-R12
  it('QA-T6-05 MEC-008-R12 save writes expected key and envelope format', () => {
    const store = memoryStore();
    const data: SaveDataV2 = {
      ...defaultSave(),
      bestScore: 100,
      settings: { sound: true },
    };
    save(store, data);
    expect(SAVE_KEY).toBe('mango-snake.save');
    expect(SAVE_VERSION).toBe(2);
    const raw = store.get(SAVE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toEqual({
      version: 2,
      data,
    });
  });

  it('QA-T6-06 P0-Design §8, GDD-8.4 future version falls back to defaultSave', () => {
    const store = memoryStore({
      [SAVE_KEY]: JSON.stringify({
        version: 99,
        data: { bestScore: 999, settings: { sound: false } },
      }),
    });
    expect(load(store)).toEqual(defaultSave());
  });

  it('QA-T6-07 P0-Design §8, GDD-8.4 invalid version field falls back to defaultSave', () => {
    for (const badVersion of ['1', null, undefined, 1.5, NaN, {}]) {
      const store = memoryStore({
        [SAVE_KEY]: JSON.stringify({
          version: badVersion,
          data: { bestScore: 10, settings: { sound: true } },
        }),
      });
      expect(load(store)).toEqual(defaultSave());
    }
  });

  // updated for P1 MEC-008-R12
  it('QA-T6-08 MEC-008-R12 migrations run sequentially from older version', () => {
    const store = memoryStore({
      [SAVE_KEY]: JSON.stringify({
        version: 0,
        data: { legacyScore: 55 },
      }),
    });
    const migrations: Record<number, Migration> = {
      0: (d: unknown) => {
        const legacy = d as { legacyScore: number };
        return { bestScore: legacy.legacyScore, settings: { sound: true } };
      },
    };
    expect(load(store, migrations)).toEqual({
      ...defaultSave(),
      bestScore: 55,
      settings: { sound: true },
    });
  });

  it('QA-T6-09 P0-Design §8, GDD-8.4 migration throwing or returning invalid shape falls back to defaultSave', () => {
    const throwingStore = memoryStore({
      [SAVE_KEY]: JSON.stringify({ version: 0, data: { score: 10 } }),
    });
    const throwingMigrations: Record<number, Migration> = {
      0: () => {
        throw new Error('Migration failure');
      },
    };
    expect(() => load(throwingStore, throwingMigrations)).not.toThrow();
    expect(load(throwingStore, throwingMigrations)).toEqual(defaultSave());

    const badShapeMigrations: Record<number, Migration> = {
      0: () => ({ bestScore: 'not-a-number', settings: { sound: true } }),
    };
    expect(load(throwingStore, badShapeMigrations)).toEqual(defaultSave());
  });

  it('QA-T6-10 P0-Design §8, GDD-8.4 older version without migration falls back to defaultSave', () => {
    const store = memoryStore({
      [SAVE_KEY]: JSON.stringify({
        version: 0,
        data: { bestScore: 50, settings: { sound: true } },
      }),
    });
    expect(load(store, {})).toEqual(defaultSave());
  });

  it('QA-T6-11 P0-Design §8, §9 corrupt JSON string falls back to defaultSave without throwing', () => {
    const badStrings = ['{ broken json', '', 'undefined', '{ version: 1, data: }', '{{}}'];
    for (const bad of badStrings) {
      const store = memoryStore({ [SAVE_KEY]: bad });
      expect(() => load(store)).not.toThrow();
      expect(load(store)).toEqual(defaultSave());
    }
  });

  it('QA-T6-12 P0-Design §8, §9 non-object root JSON values fall back to defaultSave', () => {
    const nonObjects = ['123', 'true', 'false', '"hello"', 'null', '[]', '[1, 2, 3]'];
    for (const raw of nonObjects) {
      const store = memoryStore({ [SAVE_KEY]: raw });
      expect(() => load(store)).not.toThrow();
      expect(load(store)).toEqual(defaultSave());
    }
  });

  it('QA-T6-13 P0-Design §8, §9 missing data or version envelope falls back to defaultSave', () => {
    const badEnvelopes = [
      JSON.stringify({ version: 1 }),
      JSON.stringify({ data: { bestScore: 10, settings: { sound: true } } }),
      JSON.stringify({ version: 1, data: null }),
      JSON.stringify({ version: 1, data: 123 }),
      JSON.stringify({ version: 1, data: 'string' }),
    ];
    for (const env of badEnvelopes) {
      const store = memoryStore({ [SAVE_KEY]: env });
      expect(load(store)).toEqual(defaultSave());
    }
  });

  // updated for P1 MEC-008-R12
  it('QA-T6-14 MEC-008-R12 per-field validation resets invalid fields while preserving valid fields', () => {
    const rules: SaveRules = {
      skillIds: ['slowmo', 'tailSnip', 'shield', 'mangoRain'],
      maxLevel: 30,
      carryMax: 50,
    };
    // Invalid bestScore resets to default 0 while valid settings are preserved
    const invalidScores = ['100', -5, 12.34, NaN, undefined];
    for (const score of invalidScores) {
      const store = memoryStore({
        [SAVE_KEY]: JSON.stringify({
          version: 2,
          data: { ...defaultSave(), bestScore: score, settings: { sound: false } },
        }),
      });
      expect(load(store, rules)).toEqual({
        ...defaultSave(),
        bestScore: 0,
        settings: { sound: false },
      });
    }

    // Invalid settings resets to { sound: true } while valid bestScore is preserved
    const invalidSettings = [null, {}, { sound: 'true' }, { sound: 1 }, { sound: null }, undefined];
    for (const settings of invalidSettings) {
      const store = memoryStore({
        [SAVE_KEY]: JSON.stringify({
          version: 2,
          data: { ...defaultSave(), bestScore: 42, settings },
        }),
      });
      expect(load(store, rules)).toEqual({
        ...defaultSave(),
        bestScore: 42,
        settings: { sound: true },
      });
    }

    // Invalid progression fields clamp or reset while preserving valid fields
    const storeCorrupt = memoryStore({
      [SAVE_KEY]: JSON.stringify({
        version: 2,
        data: {
          bestScore: 88,
          settings: { sound: false },
          bestLevel: 14.9,
          fullClear: 'not-bool',
          carriedEnergy: 999,
          unlockedCheckpoints: [10, 4, 4, 99, -1, 'bad'],
          lastLoadout: ['unknownSkill', 'slowmo'],
        },
      }),
    });
    expect(load(storeCorrupt, rules)).toEqual({
      bestScore: 88,
      settings: { sound: false },
      bestLevel: 14,
      fullClear: false,
      carriedEnergy: 50,
      unlockedCheckpoints: [4, 10],
      lastLoadout: [null, null],
    });
  });

  it('QA-T6-15 P0-Design §8 store get throwing error falls back to defaultSave', () => {
    const throwingStore: KeyValueStore = {
      get: () => {
        throw new Error('Access denied by browser security policy');
      },
      set: () => {},
    };
    expect(() => load(throwingStore)).not.toThrow();
    expect(load(throwingStore)).toEqual(defaultSave());
  });

  it('QA-T6-16 P0-Design §8 store set throwing error returns false without throwing', () => {
    const throwingStore: KeyValueStore = {
      get: () => null,
      set: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(() => save(throwingStore, defaultSave())).not.toThrow();
    expect(save(throwingStore, defaultSave())).toBe(false);
  });

  it('QA-T6-17 P0-Design §8 memoryStore isolates entries and dump reflects state', () => {
    const store = memoryStore({ existing: 'val' });
    expect(store.get('existing')).toBe('val');
    expect(store.get('missing')).toBeNull();
    store.set('key1', 'value1');
    expect(store.get('key1')).toBe('value1');
    expect(store.dump()).toEqual({ existing: 'val', key1: 'value1' });
  });

  it.todo(
    'QA-T6-18 GDD-8.4 best score only updated when higher (inexpressible in src/meta: Task 6 save skeleton only provides envelope load/save; score progression logic is in game flow / Task 8)',
  );

  it('QA-T6-19 P0-Design §9 item 4 no browser API or phaser imports in src/meta', () => {
    expect(Object.keys(metaSources).length).toBeGreaterThan(0);
    expect(findViolations(metaSources)).toEqual([]);
  });
});
