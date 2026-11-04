import type { CauseKey, IntroKey, UnlockKey } from '../core';

export const TEXT = {
  title: 'Mango Snake: Hard', header: 'Mango Snake', hard: 'hard', score: 'score', best: 'best',
  start: 'Fill the bar with mangoes to level up. Each level brings new obstacles.',
  play: 'Play', resume: 'Resume', playAgain: 'Play again', paused: 'Paused',
  pausedText: 'You get a short countdown when you resume.',
  landsSoon: 'Lands soon', groundRising: 'Ground rising', mangoRotting: 'Mango rotting',
  over: 'Game over', won: 'You filled the board!', wonWhy: 'No room left for mangoes.',
} as const;

export const CAUSE_TEXT: Record<CauseKey, string> = {
  wall: 'You hit the edge of the board.', self: 'You bit your own tail.',
  rotten: 'You hit a rock left by a rotten mango.', rock: 'A falling rock got you.',
  fence: 'You ran into a fence.', maze: 'You ran into a hedge.', ground: 'The ground rose in front of you.',
  snipWall: 'You hit your discarded tail.', rubble: 'You hit the rubble.',
};
const UNLOCK_NAMES: Record<IntroKey, string> = { rock: 'rocks', rottenRock: 'rotten rocks', fence: 'fences', terrain: 'rising ground', maze: 'hedge mazes' };
const INCOMING: Record<UnlockKey, string> = { fence: 'Fence incoming', maze: 'Maze incoming', terrain: 'The ground is shaking' };

// GDD-13 all player-facing P0 labels and messages match design §7.5.
export const levelLabel = (level: number): string => `Level ${level}`;
export const progressLabel = (progress: number, need: number, level: number, maxLevel: number): string =>
  level >= maxLevel ? 'Max level' : `${progress}/${need} mangoes`;
export const levelBanner = (level: number, unlocked?: IntroKey): string =>
  `${levelLabel(level)}: ${unlocked ? `${UNLOCK_NAMES[unlocked]} unlocked` : 'a bit faster'}`;
export const incomingBanner = (family: UnlockKey): string => INCOMING[family];
export const deathMessage = (won: boolean, cause: CauseKey | undefined, score: number, level: number): string =>
  `${won ? TEXT.wonWhy : cause ? CAUSE_TEXT[cause] : ''} Score ${score}, level ${level}.`;
export const bestLine = (kind: 'start' | 'over', best: number, newBest = false, score = 0): string =>
  kind === 'over' && newBest && score > 0 ? 'New best score!' : best > 0 ? `Best score ${best}` : '';
