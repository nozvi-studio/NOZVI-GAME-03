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
} from '../../src/meta';
import { findViolations } from '../support/boundary';

const metaSources = import.meta.glob(['../../src/meta/**/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('QA Task 6: Save Skeleton (Black-Box)', () => {
  it('QA-T6-01 P0-Design §8, GDD-8.4 defaultSave returns valid baseline data', () => {
    const def = defaultSave();
    expect(def).toEqual({ bestScore: 0, settings: { sound: true } });
  });

  it('QA-T6-02 P0-Design §8, GDD-8.4 load on empty store returns defaultSave', () => {
    const store = memoryStore();
    expect(load(store)).toEqual({ bestScore: 0, settings: { sound: true } });
  });

  it('QA-T6-03 P0-Design §8, GDD-8.4 load returns fresh copy not shared reference', () => {
    const store = memoryStore();
    const s1 = load(store);
    s1.bestScore = 999;
    s1.settings.sound = false;
    const s2 = load(store);
    expect(s2).toEqual({ bestScore: 0, settings: { sound: true } });
  });

  it('QA-T6-04 P0-Design §8, GDD-8.4 round trip save and load preserves state', () => {
    const store = memoryStore();
    const data: SaveData = { bestScore: 42, settings: { sound: false } };
    const ok = save(store, data);
    expect(ok).toBe(true);
    expect(load(store)).toEqual(data);
  });

  it('QA-T6-05 P0-Design §8, GDD-8.4 save writes expected key and envelope format', () => {
    const store = memoryStore();
    const data: SaveData = { bestScore: 100, settings: { sound: true } };
    save(store, data);
    expect(SAVE_KEY).toBe('mango-snake.save');
    expect(SAVE_VERSION).toBe(1);
    const raw = store.get(SAVE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toEqual({
      version: 1,
      data: { bestScore: 100, settings: { sound: true } },
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

  it('QA-T6-08 P0-Design §8, GDD-8.4 migrations run sequentially from older version', () => {
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
    expect(load(store, migrations)).toEqual({ bestScore: 55, settings: { sound: true } });
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

  it('QA-T6-14 P0-Design §8, §9 wrong data shape falls back to defaultSave', () => {
    const badDataShapes = [
      { bestScore: '100', settings: { sound: true } },
      { bestScore: -5, settings: { sound: true } },
      { bestScore: 12.34, settings: { sound: true } },
      { bestScore: NaN, settings: { sound: true } },
      { bestScore: 10, settings: null },
      { bestScore: 10, settings: {} },
      { bestScore: 10, settings: { sound: 'true' } },
      { bestScore: 10, settings: { sound: 1 } },
      { bestScore: 10, settings: { sound: null } },
      { settings: { sound: true } },
    ];
    for (const bad of badDataShapes) {
      const store = memoryStore({
        [SAVE_KEY]: JSON.stringify({ version: 1, data: bad }),
      });
      expect(load(store)).toEqual(defaultSave());
    }
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
