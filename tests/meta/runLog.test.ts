import { expect, it } from 'vitest';
import { emptyLog, loadLog, nextRun, appendRecord, flushLog, memoryStore, LOG_KEY, deathCauseReport } from '../../src/meta';
import type { LogRecord, KeyValueStore } from '../../src/meta';
const end = (runId: number, cause = 'rock'): LogRecord => ({ type: 'run_end', t: runId, runId, level: 3, score: 8, cause, durationMs: 100, startLevel: 1, levelsCleared: 2, won: cause === 'clear' });
it('MEC-003-R18 run log keeps the last 500 entries and cumulative deathCounts', () => {
  const before = emptyLog(); let log = before;
  for (let n = 1; n <= 501; n++) log = appendRecord(log, end(n), 500);
  expect(log.entries).toHaveLength(500); expect(log.entries[0]?.runId).toBe(2); expect(log.deathCounts.rock).toBe(501);
  expect(before.entries).toEqual([]); expect(before.deathCounts).toEqual({});
});
it('MEC-003-R20 quit and clear do not increment deathCounts', () => {
  expect(appendRecord(appendRecord(emptyLog(), end(1, 'quit'), 500), end(2, 'clear'), 500).deathCounts).toEqual({});
});
it('MEC-003-R18 loadLog never throws on corrupt JSON and flushLog swallows storage errors', () => {
  expect(loadLog(memoryStore({ [LOG_KEY]: '{' }))).toEqual(emptyLog());
  const broken: KeyValueStore = { get: () => { throw Error('denied'); }, set: () => { throw Error('quota'); } };
  expect(loadLog(broken)).toEqual(emptyLog()); expect(flushLog(broken, emptyLog())).toBe(false);
});
it('MEC-003-R18 nextRun increments nextRunId', () => {
  const before = emptyLog(); const a = nextRun(before); const b = nextRun(a.log);
  expect(a.runId).toBe(1); expect(b.runId).toBe(2); expect(b.log.nextRunId).toBe(3); expect(before.nextRunId).toBe(1);
});
it('MEC-003-R19 records round trip separately from progress', () => {
  const store = memoryStore(); const record: LogRecord = { type: 'run_start', t: 10, runId: 1, startLevel: 4, startEnergy: 18, loadout: ['slowmo', null], entry: 'results' };
  const log = appendRecord(nextRun(emptyLog()).log, record, 500);
  expect(flushLog(store, log)).toBe(true); expect(loadLog(store)).toEqual(log);
});
it('MEC-003-R18 malformed log envelopes default safely', () => {
  for (const data of [null, [], { version: 2 }, { version: 1, nextRunId: 0, entries: [], deathCounts: {} }, { version: 1, nextRunId: 1, entries: [null], deathCounts: {} }])
    expect(loadLog(memoryStore({ [LOG_KEY]: JSON.stringify(data) }))).toEqual(emptyLog());
});

import { describe } from 'vitest';
import { summarizeLog } from '../../src/meta';
const sStart = (runId: number, t: number, entry: 'home' | 'results', startLevel = 1): LogRecord =>
  ({ type: 'run_start', t, runId, startLevel, startEnergy: 0, loadout: [null, null], entry });
const sEnd = (runId: number, t: number, cause: string, level = 2): LogRecord =>
  ({ type: 'run_end', t, runId, level, score: 3, cause, durationMs: 1000, startLevel: 1, levelsCleared: 1, won: cause === 'clear' });
const logOf = (recs: LogRecord[]) => recs.reduce((l, r) => appendRecord(l, r, 500), emptyLog());
describe('summarizeLog', () => {
  it('P1-PT summarizeLog counts runs, entry source, checkpoint starts, causes and skill runs', () => {
    const log = logOf([sStart(1, 0, 'home'), sEnd(1, 10, 'rock'),
      sStart(2, 20, 'results'), { type: 'skill_used', t: 25, runId: 2, skill: 'slowmo', level: 3, energyBefore: 40 }, sEnd(2, 30, 'quit'),
      sStart(3, 40, 'home', 4), sEnd(3, 50, 'rock', 6)]);
    expect(summarizeLog(log, 600000)).toMatchObject({ runs: 3, runsFromHome: 2, runsFromResults: 1, checkpointStarts: 1,
      causes: { rock: 2, quit: 1 }, causeShare: { rock: 0.667, quit: 0.333 }, levelsReached: { 2: 2, 6: 1 },
      runsWithSkill: 1, skillRunShare: 0.333, runsPerSession: [3] });
  });
  it('P1-PT summarizeLog splits sessions on a gap longer than sessionGapMs', () => {
    const log = logOf([sStart(1, 0, 'home'), sEnd(1, 10, 'wall'), sStart(2, 700010, 'home'), sEnd(2, 700020, 'wall')]);
    expect(summarizeLog(log, 600000).runsPerSession).toEqual([1, 1]);
  });
  it('P1-PT summarizeLog of an empty log is all zeros', () => {
    expect(summarizeLog(emptyLog(), 600000)).toMatchObject({ runs: 0, skillRunShare: 0, runsPerSession: [] });
  });
  it('MEC-003-R19 loadLog keeps old run_end records without turns and rejects a non-numeric turns', () => {
    const store = memoryStore();
    const old = end(1);
    store.set(LOG_KEY, JSON.stringify({ version: 1, nextRunId: 3, entries: [old, { ...end(2), turns: 4 }], deathCounts: {} }));
    expect(loadLog(store).entries).toHaveLength(2);
    expect(summarizeLog(loadLog(store), 1000).causes).toEqual({ rock: 2 });
    store.set(LOG_KEY, JSON.stringify({ version: 1, nextRunId: 2, entries: [{ ...old, turns: 'x' }], deathCounts: {} }));
    expect(loadLog(store).entries).toHaveLength(0);
  });
  it('P1-PT summarizeLog counts a run without run_end in runs but not in ended-run shares', () => {
    const s = summarizeLog(logOf([sStart(1, 0, 'home'), sEnd(1, 10, 'rock'), sStart(2, 20, 'home')]), 600000);
    expect(s).toMatchObject({ runs: 2, causeShare: { rock: 1 }, runsPerSession: [2] });
  });
});

it('MEC-003-R19 run_end keeps the death context and deathCounts stay per cause', () => {
  const next = appendRecord(emptyLog(), { type: 'run_end', runId: 1, t: 0, level: 13, score: 40, cause: 'self', context: 'ice',
    durationMs: 90000, startLevel: 12, levelsCleared: 1, won: false }, 100);
  expect(next.entries.at(-1)).toMatchObject({ cause: 'self', context: 'ice' });
  expect(next.deathCounts).toEqual({ self: 1 });
});

const endCtx = (runId: number, cause: string, context?: 'ice' | 'mud'): LogRecord => ({ type: 'run_end', runId, t: runId * 1000, level: 20,
  score: 10, cause, durationMs: 60000, startLevel: 16, levelsCleared: 1, won: cause === 'clear', ...(context ? { context } : {}) });
const startRun = (runId: number): LogRecord => ({ type: 'run_start', runId, t: runId * 1000 - 500, startLevel: 16, startEnergy: 0, loadout: [null, null], entry: 'home' });

it('P2-EXIT no death cause > 40%: shares count deaths only and split family vs player causes', () => {
  let log = emptyLog();
  const causes = ['coconut', 'coconut', 'bomb', 'self', 'wall', 'clear', 'quit'];
  causes.forEach((c, i) => { log = appendRecord(log, startRun(i + 1), 100); log = appendRecord(log, endCtx(i + 1, c, c === 'self' ? 'ice' : undefined), 100); });
  const r = deathCauseReport(log, 600000);
  expect(r.deaths).toBe(5);
  expect(r.familyShare).toEqual({ coconut: 0.4, bomb: 0.2 });
  expect(r.playerShare).toEqual({ 'self:ice': 0.2, wall: 0.2 });
  expect(Object.keys(r.familyShare).every(k => k in summarizeLog(log, 600000).causes)).toBe(true);
  expect(r.over40).toEqual([]);
  log = appendRecord(log, startRun(9), 100); log = appendRecord(log, endCtx(9, 'coconut'), 100);
  expect(deathCauseReport(log, 600000).over40).toEqual(['coconut']);
});

it('P2-EXIT player causes above 40% go to review, not over40', () => {
  let log = emptyLog();
  ['wall', 'wall', 'bomb'].forEach((c, i) => { log = appendRecord(log, startRun(i + 1), 100); log = appendRecord(log, endCtx(i + 1, c), 100); });
  const r = deathCauseReport(log, 600000);
  expect(r.review).toEqual(['wall']);
  expect(r.over40).toEqual([]);
});
