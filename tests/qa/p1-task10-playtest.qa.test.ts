// tests/qa/p1-task10-playtest.qa.test.ts — black-box QA tests for P1 Task 10 Playtest tooling (MEC-003-R21, docs/PLAYTEST.md)
import { describe, expect, it } from 'vitest';
import { emptyLog, appendRecord, summarizeLog, type LogRecord, type RunLog } from '../../src/meta';
import { isDebug } from '../../src/game/flow/debugFlag';
import { loadBalance } from '../support/balance';

const balance = loadBalance();
const DEFAULT_SESSION_GAP_MS = balance.log.sessionGapMs; // 600000 ms = 10 min

const startRec = (
  runId: number,
  t: number,
  entry: 'home' | 'results' = 'home',
  startLevel = 1,
): LogRecord => ({
  type: 'run_start',
  t,
  runId,
  startLevel,
  startEnergy: 0,
  loadout: [null, null],
  entry,
});

const endRec = (
  runId: number,
  t: number,
  cause: string,
  level = 1,
  startLevel = 1,
): LogRecord => ({
  type: 'run_end',
  t,
  runId,
  level,
  score: 10,
  cause,
  durationMs: 1000,
  startLevel,
  levelsCleared: Math.max(0, level - startLevel),
  won: cause === 'clear',
});

const skillRec = (
  runId: number,
  t: number,
  skill = 'slowmo',
  level = 1,
): LogRecord => ({
  type: 'skill_used',
  t,
  runId,
  skill,
  level,
  energyBefore: 50,
});

const levelUpRec = (
  runId: number,
  t: number,
  level: number,
): LogRecord => ({
  type: 'level_up',
  t,
  runId,
  level,
  levelTimeMs: 15000,
});

const checkpointRec = (
  runId: number,
  t: number,
  level: number,
  reachedLevel: number,
): LogRecord => ({
  type: 'checkpoint_unlocked',
  t,
  runId,
  level,
  reachedLevel,
});

const buildLog = (records: LogRecord[]): RunLog =>
  records.reduce((log, rec) => appendRecord(log, rec, 500), emptyLog());

describe('P1 Task 10 Playtest QA — isDebug flag (MEC-003-R21)', () => {
  it('QA-P1T10-01 isDebug returns true when query contains debug=1 alone', () => {
    expect(isDebug('?debug=1')).toBe(true);
  });

  it('QA-P1T10-02 isDebug returns true when debug=1 is combined with other query parameters', () => {
    expect(isDebug('?foo=bar&debug=1')).toBe(true);
    expect(isDebug('?debug=1&mode=hard')).toBe(true);
    expect(isDebug('?a=1&debug=1&b=2')).toBe(true);
  });

  it('QA-P1T10-03 isDebug returns false for empty or missing query strings', () => {
    expect(isDebug('')).toBe(false);
    expect(isDebug('?')).toBe(false);
    expect(isDebug('?foo=bar')).toBe(false);
  });

  it('QA-P1T10-04 isDebug returns false when debug parameter value is not exactly 1', () => {
    expect(isDebug('?debug=0')).toBe(false);
    expect(isDebug('?debug=true')).toBe(false);
    expect(isDebug('?debug=2')).toBe(false);
    expect(isDebug('?debug=')).toBe(false);
    expect(isDebug('?debug=10')).toBe(false);
    expect(isDebug('?notdebug=1')).toBe(false);
  });
});

describe('P1 Task 10 Playtest QA — summarizeLog (MEC-003-R21, docs/PLAYTEST.md)', () => {
  it('QA-P1T10-05 summarizeLog on empty log returns zero counts and empty collections', () => {
    const summary = summarizeLog(emptyLog(), DEFAULT_SESSION_GAP_MS);
    expect(summary).toEqual({
      runs: 0,
      runsFromHome: 0,
      runsFromResults: 0,
      checkpointStarts: 0,
      levelsReached: {},
      causes: {},
      causeShare: {},
      runsWithSkill: 0,
      skillRunShare: 0,
      runsPerSession: [],
    });
  });

  it('QA-P1T10-06 summarizeLog distinguishes entry source between Home and Results', () => {
    const log = buildLog([
      startRec(1, 100, 'home'),
      endRec(1, 200, 'wall', 1),
      startRec(2, 300, 'results'),
      endRec(2, 400, 'rock', 2),
      startRec(3, 500, 'results'),
      endRec(3, 600, 'self', 1),
      startRec(4, 700, 'home'),
      endRec(4, 800, 'clear', 30),
    ]);
    const summary = summarizeLog(log, DEFAULT_SESSION_GAP_MS);
    expect(summary.runs).toBe(4);
    expect(summary.runsFromHome).toBe(2);
    expect(summary.runsFromResults).toBe(2);
  });

  it('QA-P1T10-07 summarizeLog counts checkpoint starts only for startLevel > 1', () => {
    const log = buildLog([
      startRec(1, 1000, 'home', 1), // baseline L1
      endRec(1, 2000, 'wall', 3, 1),
      startRec(2, 3000, 'home', 4), // checkpoint L4
      endRec(2, 4000, 'rock', 5, 4),
      startRec(3, 5000, 'results', 6), // checkpoint L6
      endRec(3, 6000, 'hazard', 8, 6),
      startRec(4, 7000, 'home', 1), // baseline L1
      endRec(4, 8000, 'quit', 1, 1),
    ]);
    const summary = summarizeLog(log, DEFAULT_SESSION_GAP_MS);
    expect(summary.runs).toBe(4);
    expect(summary.checkpointStarts).toBe(2);
  });

  it('QA-P1T10-08 summarizeLog aggregates death causes and calculates rounded cause shares', () => {
    // 3 runs: 2 rock deaths, 1 clear win
    const log = buildLog([
      startRec(1, 100, 'home'),
      endRec(1, 200, 'rock', 2),
      startRec(2, 300, 'results'),
      endRec(2, 400, 'rock', 3),
      startRec(3, 500, 'results'),
      endRec(3, 600, 'clear', 30),
    ]);
    const summary = summarizeLog(log, DEFAULT_SESSION_GAP_MS);
    expect(summary.causes).toEqual({ rock: 2, clear: 1 });
    expect(summary.causeShare).toEqual({
      rock: 0.667, // 2 / 3 rounded to 3 decimal places
      clear: 0.333, // 1 / 3 rounded to 3 decimal places
    });
  });

  it('QA-P1T10-09 summarizeLog counts each run with skill usage at most once in runsWithSkill', () => {
    const log = buildLog([
      startRec(1, 100, 'home'),
      skillRec(1, 110, 'slowmo'),
      skillRec(1, 120, 'tailSnip'),
      skillRec(1, 130, 'shield'),
      endRec(1, 200, 'rock', 3),
      startRec(2, 300, 'results'),
      // run 2 uses no skills
      endRec(2, 400, 'wall', 1),
    ]);
    const summary = summarizeLog(log, DEFAULT_SESSION_GAP_MS);
    expect(summary.runs).toBe(2);
    expect(summary.runsWithSkill).toBe(1);
  });

  it('QA-P1T10-10 summarizeLog calculates skillRunShare rounded to 3 decimals across all runs', () => {
    // 4 runs: runs 1 and 3 use a skill, runs 2 and 4 do not -> 2 / 4 = 0.5
    const log = buildLog([
      startRec(1, 100, 'home'),
      skillRec(1, 110, 'shield'),
      endRec(1, 200, 'rock', 2),
      startRec(2, 300, 'results'),
      endRec(2, 400, 'wall', 1),
      startRec(3, 500, 'results'),
      skillRec(3, 510, 'slowmo'),
      endRec(3, 600, 'self', 4),
      startRec(4, 700, 'results'),
      endRec(4, 800, 'quit', 4),
    ]);
    const summary = summarizeLog(log, DEFAULT_SESSION_GAP_MS);
    expect(summary.runs).toBe(4);
    expect(summary.runsWithSkill).toBe(2);
    expect(summary.skillRunShare).toBe(0.5);
  });

  it('QA-P1T10-11 summarizeLog tracks final levelsReached per ended run', () => {
    const log = buildLog([
      startRec(1, 100, 'home'),
      endRec(1, 200, 'rock', 2),
      startRec(2, 300, 'results'),
      endRec(2, 400, 'wall', 2),
      startRec(3, 500, 'results'),
      endRec(3, 600, 'hazard', 5),
    ]);
    const summary = summarizeLog(log, DEFAULT_SESSION_GAP_MS);
    expect(summary.levelsReached).toEqual({ 2: 2, 5: 1 });
  });

  it('QA-P1T10-12 summarizeLog includes incomplete runs without run_end in run counts without skewing ended-run shares', () => {
    // Run 1 ended with rock (no skills).
    // Run 2 started and used skill but never ended.
    // DECISIONS.md (2026-11-04 Task 10): runsWithSkill counts started runs with skill (1),
    // while skillRunShare and causeShare use ended runs only (ended runs with skill: 0/1 = 0).
    const log = buildLog([
      startRec(1, 100, 'home'),
      endRec(1, 200, 'rock', 2),
      startRec(2, 300, 'results'),
      skillRec(2, 350, 'slowmo'),
    ]);
    const summary = summarizeLog(log, DEFAULT_SESSION_GAP_MS);
    expect(summary.runs).toBe(2);
    expect(summary.runsFromHome).toBe(1);
    expect(summary.runsFromResults).toBe(1);
    expect(summary.runsWithSkill).toBe(1);
    expect(summary.skillRunShare).toBe(0); // 0 ended runs with skill / 1 ended run
    expect(summary.causes).toEqual({ rock: 1 });
    expect(summary.causeShare).toEqual({ rock: 1 }); // 1 / 1 ended run
    expect(summary.runsPerSession).toEqual([2]);
  });

  it('QA-P1T10-13 summarizeLog keeps runs within sessionGapMs in the same session', () => {
    const gap = DEFAULT_SESSION_GAP_MS; // 600000 ms
    const log = buildLog([
      startRec(1, 0, 'home'),
      endRec(1, 60000, 'rock', 1),
      startRec(2, 100000, 'results'),
      endRec(2, 200000, 'wall', 2),
      startRec(3, 400000, 'results'),
      endRec(3, 500000, 'clear', 30),
    ]);
    const summary = summarizeLog(log, gap);
    expect(summary.runsPerSession).toEqual([3]);
  });

  it('QA-P1T10-14 summarizeLog splits runs into separate sessions when time gap exceeds sessionGapMs', () => {
    const gap = 600000; // 10 minutes
    const log = buildLog([
      startRec(1, 0, 'home'),
      endRec(1, 10000, 'wall', 1),
      // gap between t=10000 and t=620000 is 610000 > 600000 -> new session
      startRec(2, 620000, 'home'),
      endRec(2, 630000, 'rock', 2),
    ]);
    const summary = summarizeLog(log, gap);
    expect(summary.runsPerSession).toEqual([1, 1]);
  });

  it('QA-P1T10-15 summarizeLog partitions multiple sessions with varying run counts', () => {
    const gap = 1000;
    // Session 1: 2 runs
    // Session 2: 3 runs
    // Session 3: 1 run
    const log = buildLog([
      // Session 1
      startRec(1, 100, 'home'),
      endRec(1, 200, 'wall', 1),
      startRec(2, 300, 'results'),
      endRec(2, 400, 'rock', 2),

      // Gap > 1000 (from 400 to 2000 = 1600)
      // Session 2
      startRec(3, 2000, 'home'),
      endRec(3, 2100, 'self', 1),
      startRec(4, 2200, 'results'),
      endRec(4, 2300, 'hazard', 3),
      startRec(5, 2400, 'results'),
      endRec(5, 2500, 'clear', 30),

      // Gap > 1000 (from 2500 to 5000 = 2500)
      // Session 3
      startRec(6, 5000, 'home', 4),
      endRec(6, 5100, 'rock', 4),
    ]);
    const summary = summarizeLog(log, gap);
    expect(summary.runs).toBe(6);
    expect(summary.runsPerSession).toEqual([2, 3, 1]);
  });

  it('QA-P1T10-16 summarizeLog processes interleaved intermediate events without duplicating run counts', () => {
    const log = buildLog([
      startRec(1, 100, 'home', 1),
      levelUpRec(1, 200, 2),
      skillRec(1, 250, 'slowmo', 2),
      levelUpRec(1, 300, 3),
      checkpointRec(1, 350, 4, 10),
      skillRec(1, 400, 'tailSnip', 3),
      endRec(1, 500, 'rock', 3, 1),
    ]);
    const summary = summarizeLog(log, DEFAULT_SESSION_GAP_MS);
    expect(summary.runs).toBe(1);
    expect(summary.runsFromHome).toBe(1);
    expect(summary.runsFromResults).toBe(0);
    expect(summary.checkpointStarts).toBe(0);
    expect(summary.runsWithSkill).toBe(1);
    expect(summary.skillRunShare).toBe(1);
    expect(summary.causes).toEqual({ rock: 1 });
    expect(summary.levelsReached).toEqual({ 3: 1 });
    expect(summary.runsPerSession).toEqual([1]);
  });
});
