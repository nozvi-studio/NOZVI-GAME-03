import { expect, it } from 'vitest';
import { resultsView } from '../../src/game/flow/resultsView';
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
  expect(v.checkpointBanner).toBeNull();
  expect(v.next).toEqual({ fill: 0.8, chip: { key: 'results.nextCp', level: 10 } });
  expect(v.energySaved).toBeNull();
});
it('P3b3-R11 newBest state: gold New best! chip', () => {
  const v = resultsView({ ...base, score: 68, bestScore: 68, newBest: true }, next, 6);
  expect(v.state).toBe('newBest');
  expect(v.bestChip).toMatchObject({ key: 'results.newBest', gold: true });
});
it('P3b3-R11 checkpointUnlocked state: banner shows the highest new start level and the next target', () => {
  const v = resultsView({ ...base, level: 10, newCheckpoints: [4] }, { reach: 15, requiresClear: false }, 6);
  expect(v.state).toBe('checkpointUnlocked');
  expect(v.checkpointBanner).toEqual({ level: 4 });
  expect(v.next).toEqual({ fill: 10 / 15, chip: { key: 'results.nextCp', level: 15 } });
  expect(resultsView({ ...base, newCheckpoints: [4, 6] }, next, 6).checkpointBanner).toEqual({ level: 6 });
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
  expect(resultsView({ ...base, carriedEnergy: 18 }, null, 6).energySaved).toBe(18);
  expect(resultsView(base, { reach: 30, requiresClear: true }, 6).next!.chip).toEqual({ key: 'results.nextCpClear', level: 30 });
  expect(resultsView(base, null, 6).next).toBeNull();
  expect(resultsView({ ...base, level: 40 }, next, 6).next!.fill).toBe(1);
});
it('P3b3-R11 the title key is results.youWin for a won run and results.gameOver otherwise', () => {
  expect(resultsView({ ...base, won: true, cause: 'clear' }, null, 6).titleKey).toBe('results.youWin');
  expect(resultsView(base, null, 6).titleKey).toBe('results.gameOver');
  expect(resultsView({ ...base, cause: 'quit' }, null, 6).titleKey).toBe('results.gameOver');
});
it('P3b3-R11 the biome stat reads "n/total" through the text table', () => {
  expect(resultsView(base, null, 6).stats[2]!.value).toBe('2/6');
});
