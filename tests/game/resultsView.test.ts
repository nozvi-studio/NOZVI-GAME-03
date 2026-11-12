import { describe, expect, it } from 'vitest';
import { RESULTS_BUTTONS, resultsView } from '../../src/game/flow/resultsView';
import { t } from '../../src/game/text';
import type { RunSummary } from '../../src/session';
const base: RunSummary = { won: false, cause: 'fence', level: 8, startLevel: 1, levelsCleared: 7, score: 44, bestScore: 61, newBest: false,
  carriedEnergy: 0, eaten: 35, biome: 2, newCheckpoints: [], firstRun: false };
const next = { reach: 10, requiresClear: false };

it('P3b3-R11 normal state: cause line, score, plain best chip, stats, next-checkpoint progress', () => {
  const v = resultsView(base, next, 6);
  expect(v.state).toBe('normal');
  expect(v.headline).toEqual({ key: 'cause.fence', context: null });
  expect(v.score).toBe(44);
  expect(v.bestChip).toEqual({ key: 'results.best', vars: { best: 61 }, gold: false });
  expect(v.stats.map(s => [s.labelKey, s.value, s.tone])).toEqual([
    ['results.levelLabel', '8', 'pink'], ['results.eatenLabel', '35', 'butter'], ['results.biomeLabel', '2/6', 'sky']]);
  expect(v.rows).toEqual([{ kind: 'next', fill: 0.8, level: 10, requiresClear: false }]);
});
it('P3b3-R11 newBest state: gold New best! chip', () => {
  const v = resultsView({ ...base, score: 68, bestScore: 68, newBest: true }, next, 6);
  expect(v.state).toBe('newBest');
  expect(v.bestChip).toMatchObject({ key: 'results.newBest', gold: true });
});
it('P3b3-R11 checkpointUnlocked state: banner shows the highest new start level and the next target', () => {
  const v = resultsView({ ...base, level: 10, newCheckpoints: [4] }, { reach: 15, requiresClear: false }, 6);
  expect(v.state).toBe('checkpointUnlocked');
  expect(v.rows).toEqual([{ kind: 'checkpoint', level: 4 }, { kind: 'next', fill: 10 / 15, level: 15, requiresClear: false }]);
  expect(resultsView({ ...base, newCheckpoints: [4, 6] }, next, 6).rows[0]).toEqual({ kind: 'checkpoint', level: 6 });
});
it('P3b3-R11 firstRun state: plain "Best N" chip even though the score is a new best (C5)', () => {
  const v = resultsView({ ...base, score: 44, bestScore: 44, newBest: true, firstRun: true }, next, 6);
  expect(v.state).toBe('firstRun');
  expect(v.bestChip).toEqual({ key: 'results.best', vars: { best: 44 }, gold: false });
});
it('P3b3-R11 win and quit headlines, mud context, energy saved, clear milestone, no milestone', () => {
  expect(resultsView({ ...base, won: true, cause: 'clear' }, null, 6).headline.key).toBe('results.won');
  expect(resultsView({ ...base, cause: 'quit' }, null, 6).headline.key).toBe('cause.quit');
  expect(resultsView({ ...base, cause: 'rock', context: 'mud' }, null, 6).headline).toEqual({ key: 'cause.rock', context: 'death.context.mud' });
  expect(resultsView({ ...base, carriedEnergy: 18 }, null, 6).rows).toEqual([{ kind: 'energy', value: 18 }]);
  expect(resultsView(base, { reach: 30, requiresClear: true }, 6).rows[0]).toMatchObject({ kind: 'next', requiresClear: true, level: 30 });
  expect(resultsView(base, null, 6).rows).toEqual([]);
  expect((resultsView({ ...base, level: 40 }, next, 6).rows[0] as { fill: number }).fill).toBe(1);
});
it('P3b3-R11 the title key is results.youWin for a won run and results.gameOver otherwise', () => {
  expect(resultsView({ ...base, won: true, cause: 'clear' }, null, 6).titleKey).toBe('results.youWin');
  expect(resultsView(base, null, 6).titleKey).toBe('results.gameOver');
  expect(resultsView({ ...base, cause: 'quit' }, null, 6).titleKey).toBe('results.gameOver');
});
it('P3b3-R11 the biome stat reads "n/total" through the text table', () => {
  expect(resultsView(base, null, 6).stats[2]!.value).toBe('2/6');
});

const summary = (o: Partial<RunSummary>): RunSummary => ({ ...base, ...o });
describe('D3-R18 results rows', () => {
  it('D3-R18 orders rows checkpoint, energy, next and drops empty ones', () => {
    const v = resultsView(summary({ newCheckpoints: [10], carriedEnergy: 35, level: 10 }), { reach: 12, requiresClear: false }, 6);
    expect(v.rows.map(r => r.kind)).toEqual(['checkpoint', 'energy', 'next']);
    expect(v.rows[0]).toEqual({ kind: 'checkpoint', level: 10 });
  });
  it('D3-R18 first run keeps only next and adds the tip (U5-R6)', () => {
    const v = resultsView(summary({ firstRun: true, carriedEnergy: 0, newCheckpoints: [] }), { reach: 10, requiresClear: false }, 6);
    expect(v.rows.map(r => r.kind)).toEqual(['next']);
    expect(v.firstRunTip).toBe(t('results.firstRunTip'));
  });
  it('D3-R18 no milestone and nothing saved gives no rows and no tip', () => {
    const v = resultsView(summary({ carriedEnergy: 0, newCheckpoints: [] }), null, 6);
    expect(v.rows).toEqual([]); expect(v.firstRunTip).toBeNull();
  });
  it('U5-R3 ribbon text follows won', () => {
    expect(resultsView(summary({ won: true }), null, 6).ribbon).toBe('results.youWin');
    expect(resultsView(summary({ won: false }), null, 6).ribbon).toBe('results.gameOver');
  });
});
