import type { KeyValueStore } from './storage';

export type LogRecord =
  | { type: 'run_start'; t: number; runId: number; startLevel: number; startEnergy: number; loadout: readonly [string | null, string | null]; entry: 'home' | 'results' }
  | { type: 'level_up'; t: number; runId: number; level: number; levelTimeMs: number }
  | { type: 'skill_used'; t: number; runId: number; skill: string; level: number; energyBefore: number }
  | { type: 'checkpoint_unlocked'; t: number; runId: number; level: number; reachedLevel: number }
  | { type: 'run_end'; t: number; runId: number; level: number; score: number; cause: string; durationMs: number; startLevel: number; levelsCleared: number; won: boolean };
export interface RunLog { version: 1; nextRunId: number; entries: LogRecord[]; deathCounts: Record<string, number> }
export const LOG_KEY = 'mango-snake.log';
export const emptyLog = (): RunLog => ({ version: 1, nextRunId: 1, entries: [], deathCounts: {} });

const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
function isRecord(v: unknown): v is LogRecord {
  if (!object(v) || !finite(v.t) || !Number.isInteger(v.runId) || (v.runId as number) < 1) return false;
  const numbers = (...keys: string[]) => keys.every(k => finite(v[k]));
  switch (v.type) {
    case 'run_start': return numbers('startLevel', 'startEnergy') && (v.entry === 'home' || v.entry === 'results')
      && Array.isArray(v.loadout) && v.loadout.length === 2 && v.loadout.every(id => id === null || typeof id === 'string');
    case 'level_up': return numbers('level', 'levelTimeMs');
    case 'skill_used': return numbers('level', 'energyBefore') && typeof v.skill === 'string';
    case 'checkpoint_unlocked': return numbers('level', 'reachedLevel');
    case 'run_end': return numbers('level', 'score', 'durationMs', 'startLevel', 'levelsCleared') && typeof v.cause === 'string' && typeof v.won === 'boolean';
    default: return false;
  }
}

// MEC-003-R18 malformed log data and storage errors never affect the save.
export function loadLog(store: KeyValueStore): RunLog {
  try {
    const raw = store.get(LOG_KEY);
    if (raw === null) return emptyLog();
    const v: unknown = JSON.parse(raw);
    if (!object(v) || v.version !== 1 || !Number.isInteger(v.nextRunId) || (v.nextRunId as number) < 1
      || !Array.isArray(v.entries) || !v.entries.every(isRecord) || !object(v.deathCounts)
      || !Object.values(v.deathCounts).every(n => Number.isInteger(n) && (n as number) >= 0)) return emptyLog();
    return v as unknown as RunLog;
  } catch { return emptyLog(); }
}

// MEC-003-R18 run identifiers are monotonically allocated without mutating the input.
export function nextRun(log: RunLog): { log: RunLog; runId: number } {
  return { log: { ...log, nextRunId: log.nextRunId + 1 }, runId: log.nextRunId };
}

// MEC-003-R18/R20 trim records, while retaining cumulative counts of deaths only.
export function appendRecord(log: RunLog, rec: LogRecord, maxEntries: number): RunLog {
  const deathCounts = { ...log.deathCounts };
  if (rec.type === 'run_end' && rec.cause !== 'quit' && rec.cause !== 'clear')
    deathCounts[rec.cause] = (Object.hasOwn(deathCounts, rec.cause) ? deathCounts[rec.cause]! : 0) + 1;
  return { ...log, entries: maxEntries > 0 ? [...log.entries, rec].slice(-maxEntries) : [], deathCounts };
}

// MEC-003-R18 flushing cannot throw on storage failure.
export function flushLog(store: KeyValueStore, log: RunLog): boolean {
  try { store.set(LOG_KEY, JSON.stringify(log)); return true; } catch { return false; }
}
