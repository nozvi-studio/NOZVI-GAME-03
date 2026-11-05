import type { KeyValueStore } from './storage';

export type LogRecord =
  | { type: 'run_start'; t: number; runId: number; startLevel: number; startEnergy: number; loadout: readonly [string | null, string | null]; entry: 'home' | 'results' }
  | { type: 'level_up'; t: number; runId: number; level: number; levelTimeMs: number }
  | { type: 'skill_used'; t: number; runId: number; skill: string; level: number; energyBefore: number }
  | { type: 'checkpoint_unlocked'; t: number; runId: number; level: number; reachedLevel: number }
  | { type: 'run_end'; t: number; runId: number; level: number; score: number; cause: string; durationMs: number; startLevel: number; levelsCleared: number; won: boolean; turns?: number; context?: 'ice' | 'mud' };
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
    case 'run_end': return numbers('level', 'score', 'durationMs', 'startLevel', 'levelsCleared') && typeof v.cause === 'string' && typeof v.won === 'boolean'
      && (v.turns === undefined || finite(v.turns)) // turns is absent in logs written before it existed
      && (v.context === undefined || v.context === 'ice' || v.context === 'mud'); // MEC-003-R19 only tile deaths carry context
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

export interface LogSummary {
  runs: number;
  runsFromResults: number; runsFromHome: number;
  checkpointStarts: number;
  levelsReached: Record<number, number>;
  causes: Record<string, number>;
  causeShare: Record<string, number>;
  runsWithSkill: number; skillRunShare: number;
  runsPerSession: number[];
}

const share = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 1000 : 0);
const bump = <K extends string | number>(m: Record<K, number>, k: K) => { m[k] = (Object.hasOwn(m, k) ? m[k] : 0) + 1; };

// P1 design §11 pure playtest summary of an exported run log.
export function summarizeLog(log: RunLog, sessionGapMs: number): LogSummary {
  const s: LogSummary = { runs: 0, runsFromResults: 0, runsFromHome: 0, checkpointStarts: 0, levelsReached: {}, causes: {},
    causeShare: {}, runsWithSkill: 0, skillRunShare: 0, runsPerSession: [] };
  const started = new Set<number>(), skilled = new Set<number>(), ended = new Set<number>();
  let lastEnd: number | null = null;
  for (const r of log.entries) {
    if (r.type === 'run_start' && !started.has(r.runId)) {
      started.add(r.runId); s.runs++;
      if (r.entry === 'home') s.runsFromHome++; else s.runsFromResults++;
      if (r.startLevel > 1) s.checkpointStarts++;
      if (s.runsPerSession.length === 0 || (lastEnd !== null && r.t - lastEnd > sessionGapMs)) s.runsPerSession.push(1);
      else s.runsPerSession[s.runsPerSession.length - 1]!++;
    } else if (r.type === 'skill_used') skilled.add(r.runId);
    else if (r.type === 'run_end' && !ended.has(r.runId)) {
      ended.add(r.runId); lastEnd = r.t;
      bump(s.levelsReached, r.level); bump(s.causes, r.cause);
    }
  }
  for (const [cause, n] of Object.entries(s.causes)) s.causeShare[cause] = share(n, ended.size);
  s.runsWithSkill = [...skilled].filter(id => started.has(id)).length;
  s.skillRunShare = share([...skilled].filter(id => ended.has(id)).length, ended.size);
  return s;
}

export const PLAYER_CAUSES = ['wall', 'self'] as const;
export const NON_DEATH_CAUSES = ['clear', 'quit'] as const;
export interface DeathCauseReport {
  deaths: number;
  familyShare: Record<string, number>;
  playerShare: Record<string, number>;
  over40: string[];
  review: string[];
}

// P2 design §15 / TR-C6: 40% rule on deaths only (clear and quit excluded); single source for the gate verdict.
export function deathCauseReport(log: RunLog, sessionGapMs: number, limit = 0.4): DeathCauseReport {
  const known = summarizeLog(log, sessionGapMs).causes;
  const isPlayer = (c: string) => (PLAYER_CAUSES as readonly string[]).includes(c);
  const isNonDeath = (c: string) => (NON_DEATH_CAUSES as readonly string[]).includes(c);
  const familyN: Record<string, number> = {}, playerN: Record<string, number> = {}, baseN: Record<string, number> = {};
  const seen = new Set<number>();
  let deaths = 0;
  for (const r of log.entries) {
    if (r.type !== 'run_end' || seen.has(r.runId) || !Object.hasOwn(known, r.cause) || isNonDeath(r.cause)) continue;
    seen.add(r.runId); deaths++;
    if (isPlayer(r.cause)) { bump(playerN, r.context ? `${r.cause}:${r.context}` : r.cause); bump(baseN, r.cause); }
    else bump(familyN, r.cause);
  }
  const shares = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).map(([k, n]) => [k, share(n, deaths)]));
  const familyShare = shares(familyN), playerShare = shares(playerN), playerTotal = shares(baseN);
  const over = (m: Record<string, number>) => Object.keys(m).filter(k => m[k]! > limit).sort((a, b) => m[b]! - m[a]!);
  return { deaths, familyShare, playerShare, over40: over(familyShare), review: over(playerTotal) };
}
