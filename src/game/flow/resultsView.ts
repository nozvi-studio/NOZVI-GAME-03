import type { RunSummary } from '../../session';
import { t } from '../text';

/** P3b3-R11 / UIFIX-R10 scene object names kept for QA; Home lives in the footer only. */
export const RESULTS_BUTTONS = { again: 'results-again', home: 'results-home' } as const;

export type ResultsState = 'normal' | 'newBest' | 'checkpointUnlocked' | 'firstRun';
export type ResultsRow =
  | { kind: 'checkpoint'; level: number }
  | { kind: 'energy'; value: number }
  | { kind: 'next'; fill: number; level: number; requiresClear: boolean };
export interface ResultsView {
  rows: ResultsRow[]; firstRunTip: string | null; ribbon: 'results.youWin' | 'results.gameOver';
  state: ResultsState;
  titleKey: 'results.youWin' | 'results.gameOver';
  headline: { key: string; context: string | null };
  score: number;
  bestChip: { key: 'results.newBest' | 'results.best'; vars: { best: number }; gold: boolean };
  stats: { labelKey: string; value: string; tone: 'pink' | 'butter' | 'sky' }[];
}

// D3-R18 / U5-R5/R6 (was P3b3-R11) Results view: states (MEC-003-R20, MEC-008-R6/R11), rows in board order (checkpoint, energy, next), first-run tip, ribbon key.
// Marbles row and marble-machine tip are hidden until P4 (D8).
export function resultsView(s: RunSummary, nextMilestone: { reach: number; requiresClear: boolean } | null, biomeCount: number): ResultsView {
  const checkpoint = s.newCheckpoints.length > 0;
  const state: ResultsState = checkpoint ? 'checkpointUnlocked' : s.firstRun ? 'firstRun' : s.newBest ? 'newBest' : 'normal';
  const gold = s.newBest && !s.firstRun;
  const rows: ResultsRow[] = [];
  if (checkpoint) rows.push({ kind: 'checkpoint', level: Math.max(...s.newCheckpoints) });
  if (s.carriedEnergy > 0) rows.push({ kind: 'energy', value: s.carriedEnergy });
  if (nextMilestone) rows.push({ kind: 'next', fill: Math.min(1, s.level / nextMilestone.reach), level: nextMilestone.reach, requiresClear: nextMilestone.requiresClear });
  return {
    rows, firstRunTip: state === 'firstRun' ? t('results.firstRunTip') : null, ribbon: s.won ? 'results.youWin' : 'results.gameOver',
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
  };
}
