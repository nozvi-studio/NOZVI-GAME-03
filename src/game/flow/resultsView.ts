import type { RunSummary } from '../../session';
import { t } from '../text';

export type ResultsState = 'normal' | 'newBest' | 'checkpointUnlocked' | 'firstRun';
export interface ResultsView {
  state: ResultsState;
  titleKey: 'results.youWin' | 'results.gameOver';
  headline: { key: string; context: string | null };
  score: number;
  bestChip: { key: 'results.newBest' | 'results.best'; vars: { best: number }; gold: boolean };
  stats: { labelKey: string; value: string; tone: 'pink' | 'butter' | 'sky' }[];
  energySaved: number | null;
  checkpointBanner: { level: number } | null;
  next: { fill: number; chip: { key: 'results.nextCp' | 'results.nextCpClear'; level: number } } | null;
}

// P3b3-R11 ResultsD2 states (MEC-003-R20, MEC-008-R6/R11). Marbles row and marble-machine tip are hidden until P4 (D8).
export function resultsView(s: RunSummary, nextMilestone: { reach: number; requiresClear: boolean } | null, biomeCount: number): ResultsView {
  const checkpoint = s.newCheckpoints.length > 0;
  const state: ResultsState = checkpoint ? 'checkpointUnlocked' : s.firstRun ? 'firstRun' : s.newBest ? 'newBest' : 'normal';
  const gold = s.newBest && !s.firstRun;
  return {
    state,
    titleKey: s.won ? 'results.youWin' : 'results.gameOver',
    headline: { key: s.won ? 'results.won' : `cause.${s.cause}`, context: s.context ? `death.context.${s.context}` : null },
    score: s.score,
    bestChip: gold ? { key: 'results.newBest', vars: { best: s.bestScore }, gold: true } : { key: 'results.best', vars: { best: s.bestScore }, gold: false },
    stats: [
      { labelKey: 'results.levelLabel', value: String(s.level), tone: 'pink' },
      { labelKey: 'results.eatenLabel', value: String(s.eaten), tone: 'butter' },
      { labelKey: 'results.biomeLabel', value: t('results.biomeOf', { b: s.biome, n: biomeCount }), tone: 'sky' },
    ],
    energySaved: s.carriedEnergy > 0 ? s.carriedEnergy : null,
    checkpointBanner: checkpoint ? { level: Math.max(...s.newCheckpoints) } : null,
    next: nextMilestone ? { fill: Math.min(1, s.level / nextMilestone.reach),
      chip: { key: nextMilestone.requiresClear ? 'results.nextCpClear' : 'results.nextCp', level: nextMilestone.reach } } : null,
  };
}
