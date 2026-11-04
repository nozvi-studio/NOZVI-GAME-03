import type { KeyValueStore } from './storage';

export const SAVE_KEY = 'mango-snake.save';
export const SAVE_VERSION = 2;
/** P0 save callers can still write the original fields during the staged P1 rollout. */
export interface SaveData { bestScore: number; settings: { sound: boolean } }
export interface SaveDataV2 extends SaveData {
  bestLevel: number;
  fullClear: boolean;
  unlockedCheckpoints: number[];
  carriedEnergy: number;
  lastLoadout: readonly [string | null, string | null];
}
export interface SaveRules { skillIds: readonly string[]; maxLevel: number; carryMax: number }
export type Migration = (data: unknown) => unknown;

// MEC-008-R12 each call owns its nested default values.
export const defaultSave = (): SaveDataV2 => ({ bestScore: 0, settings: { sound: true },
  bestLevel: 0, fullClear: false, unlockedCheckpoints: [], carriedEnergy: 0, lastLoadout: [null, null] });

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** MIGRATIONS[n] turns version n data into version n + 1 data. */
export const MIGRATIONS: Record<number, Migration> = {
  1: d => object(d) ? { ...defaultSave(), bestScore: d.bestScore, settings: d.settings } : null,
};

function bounded(value: unknown, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
}

function validated(data: Record<string, unknown>, rules?: SaveRules): SaveDataV2 {
  const out = defaultSave();
  if (Number.isInteger(data.bestScore) && (data.bestScore as number) >= 0) out.bestScore = data.bestScore as number;
  if (object(data.settings) && typeof data.settings.sound === 'boolean') out.settings.sound = data.settings.sound;
  // Legacy P0 callers have no P1 config; they read only the original fields.
  if (!rules) return out;
  out.bestLevel = bounded(data.bestLevel, rules.maxLevel);
  out.carriedEnergy = bounded(data.carriedEnergy, rules.carryMax);
  if (typeof data.fullClear === 'boolean') out.fullClear = data.fullClear;
  if (Array.isArray(data.unlockedCheckpoints)) out.unlockedCheckpoints = [...new Set<number>(
    data.unlockedCheckpoints.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= rules.maxLevel),
  )].sort((a, b) => a - b);
  const slots = data.lastLoadout;
  if (Array.isArray(slots) && slots.length === 2 && slots.every(id => id === null || typeof id === 'string' && rules.skillIds.includes(id)))
    out.lastLoadout = [slots[0], slots[1]];
  return out;
}

export function load(store: KeyValueStore, rules: SaveRules): SaveDataV2;
/** @deprecated P0 compatibility only; pass SaveRules to load P1 progression fields. */
export function load(store: KeyValueStore, migrations?: Record<number, Migration>): SaveDataV2;
// MEC-008-R12 envelope errors reset everything; invalid fields reset independently.
export function load(store: KeyValueStore, options?: SaveRules | Record<number, Migration>): SaveDataV2 {
  try {
    const raw = store.get(SAVE_KEY);
    if (raw === null) return defaultSave();
    const env: unknown = JSON.parse(raw);
    if (!object(env) || !Number.isInteger(env.version) || (env.version as number) < 0
      || (env.version as number) > SAVE_VERSION || !object(env.data)) return defaultSave();
    const rules = options && 'skillIds' in options ? options as SaveRules : undefined;
    const migrations = rules ? MIGRATIONS : { ...MIGRATIONS, ...options };
    let version = env.version as number, data: unknown = env.data;
    while (version < SAVE_VERSION) {
      const migrate = migrations[version];
      if (!migrate) return defaultSave();
      data = migrate(data); version++;
    }
    return object(data) ? validated(data, rules) : defaultSave();
  } catch { return defaultSave(); }
}

// MEC-008-R12 writes the complete v2 envelope; storage errors are swallowed.
export function save(store: KeyValueStore, data: SaveDataV2): boolean;
export function save(store: KeyValueStore, data: SaveData): boolean;
export function save(store: KeyValueStore, data: SaveData): boolean {
  try { store.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, data: { ...defaultSave(), ...data } })); return true; }
  catch { return false; }
}
