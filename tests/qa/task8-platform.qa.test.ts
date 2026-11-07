// tests/qa/task8-platform.qa.test.ts — black-box QA tests for localStore save adapter
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSave, defaultSettings, load, save, SAVE_KEY, type SaveData, type SaveDataV2, type SaveRules } from '../../src/meta';
import { localStore } from '../../src/game/platform/localStore';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('QA Task 8: Platform LocalStore Adapter (Black-Box)', () => {
  it('QA-T8-11 P0-Design §8 localStore provides KeyValueStore interface', () => {
    const store = localStore();
    expect(typeof store.get).toBe('function');
    expect(typeof store.set).toBe('function');
  });

  it('QA-T8-12 P0-Design §8 localStore writes and reads from window.localStorage', () => {
    const map = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => map.set(k, v),
      },
    });

    const store = localStore();
    expect(store.get('testKey')).toBeNull();
    store.set('testKey', 'testVal');
    expect(store.get('testKey')).toBe('testVal');
  });

  it('QA-T8-13 P0-Design §8, GDD-8.4 get swallowing localStorage access errors', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new DOMException('Access denied by browser security policy', 'SecurityError');
        },
        setItem: () => {},
      },
    });

    const store = localStore();
    expect(() => store.get('anyKey')).not.toThrow();
    expect(store.get('anyKey')).toBeNull();
  });

  it('QA-T8-14 P0-Design §8, GDD-8.4 set swallowing storage full or blocked quota errors', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
        },
      },
    });

    const store = localStore();
    expect(() => store.set('key', 'val')).not.toThrow();
  });

  // updated for P1 MEC-008-R12
  it('QA-T8-15 MEC-008-R12 round-trip save and load via localStore', () => {
    const map = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => map.set(k, v),
      },
    });

    const store = localStore();
    const rules: SaveRules = {
      skillIds: ['slowmo', 'tailSnip', 'shield', 'mangoRain'],
      maxLevel: 30,
      carryMax: 50,
    };
    const data: SaveDataV2 = {
      bestScore: 99,
      settings: { ...defaultSettings(), sound: false },
      bestLevel: 10,
      fullClear: false,
      unlockedCheckpoints: [4],
      carriedEnergy: 30,
      lastLoadout: ['slowmo', null],
    };
    const ok = save(store, data);
    expect(ok).toBe(true);

    const loaded = load(store, rules);
    expect(loaded).toEqual(data);
    expect(map.has(SAVE_KEY)).toBe(true);
  });

  it('QA-T8-16 P0-Design §8 load(localStore()) falls back safely on corrupted data', () => {
    const map = new Map<string, string>([[SAVE_KEY, '{invalid-json}']]);
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => map.set(k, v),
      },
    });

    const store = localStore();
    expect(load(store)).toEqual(defaultSave());
  });
});
