// src/meta/save.ts — versioned save envelope (design §8). GDD-8.4
import type { KeyValueStore } from './storage';

export const SAVE_KEY = 'mango-snake.save';
export const SAVE_VERSION = 1;
export interface SaveData { bestScore: number; settings: { sound: boolean } }
export type Migration = (data: unknown) => unknown;
/** migrations[n] turns version n data into version n + 1 data. Empty in P0. */
export const MIGRATIONS: Record<number, Migration> = {};

export const defaultSave = (): SaveData => ({ bestScore: 0, settings: { sound: true } });

function isSaveData(d: unknown): d is SaveData {
  if (typeof d !== 'object' || d === null) return false;
  const o = d as { bestScore?: unknown; settings?: { sound?: unknown } };
  return Number.isInteger(o.bestScore) && (o.bestScore as number) >= 0
    && typeof o.settings === 'object' && o.settings !== null && typeof o.settings.sound === 'boolean';
}

// GDD-8.4 load: never throws; unknown future versions and bad data give defaults
export function load(store: KeyValueStore, migrations: Record<number, Migration> = MIGRATIONS): SaveData {
  try {
    const raw = store.get(SAVE_KEY);
    if (raw === null) return defaultSave();
    const env = JSON.parse(raw) as { version?: unknown; data?: unknown };
    if (!Number.isInteger(env.version) || (env.version as number) > SAVE_VERSION) return defaultSave();
    let v = env.version as number, data = env.data;
    while (v < SAVE_VERSION) {
      const m = migrations[v];
      if (!m) return defaultSave();
      data = m(data); v++;
    }
    return isSaveData(data) ? { bestScore: data.bestScore, settings: { sound: data.settings.sound } } : defaultSave();
  } catch { return defaultSave(); }
}

// GDD-8.4 save: full envelope; storage errors are swallowed (prototype saveBest L232)
export function save(store: KeyValueStore, data: SaveData): boolean {
  try { store.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, data })); return true; } catch { return false; }
}
