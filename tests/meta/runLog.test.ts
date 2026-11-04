import { expect, it } from 'vitest';
import { emptyLog, loadLog, nextRun, appendRecord, flushLog, memoryStore, LOG_KEY } from '../../src/meta';
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
  it('P1-PT summarizeLog counts a run without run_end in runs but not in ended-run shares', () => {
    const s = summarizeLog(logOf([sStart(1, 0, 'home'), sEnd(1, 10, 'rock'), sStart(2, 20, 'home')]), 600000);
    expect(s).toMatchObject({ runs: 2, causeShare: { rock: 1 }, runsPerSession: [2] });
  });
});
