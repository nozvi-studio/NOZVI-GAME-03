import { describe, expect, it } from 'vitest';
import { bestLine, CAUSE_TEXT, deathMessage, incomingBanner, levelBanner, levelLabel, progressLabel, TEXT } from '../../src/game/text';

describe('GDD-13 strings verbatim from the prototype (design §7.5)', () => {
  it('GDD-13 level banners (L605)', () => {
    expect(levelBanner(2, 'fence')).toBe('Level 3: fences unlocked');
    expect(levelBanner(4, 'terrain')).toBe('Level 5: rising ground unlocked');
    expect(levelBanner(6, 'maze')).toBe('Level 7: hedge mazes unlocked');
    expect(levelBanner(1)).toBe('Level 2: a bit faster');
  });
  it('GDD-13 hazard banners', () => {
    expect([incomingBanner('fence'), incomingBanner('maze'), incomingBanner('terrain')])
      .toEqual(['Fence incoming', 'Maze incoming', 'The ground is shaking']);
  });
  it('GDD-13 death message and best lines (L689–694, L1017)', () => {
    expect(deathMessage(false, 'fence', 12, 3)).toBe('You ran into a fence. Score 12, level 4.');
    expect(deathMessage(true, undefined, 280, 10)).toBe('No room left for mangoes. Score 280, level 11.');
    expect(bestLine('over', 12, true, 12)).toBe('New best score!');
    expect(bestLine('over', 0, true, 0)).toBe('');
    expect(bestLine('over', 30, false, 12)).toBe('Best score 30');
    expect(bestLine('start', 0, false, 0)).toBe('');
    expect(bestLine('start', 30)).toBe('Best score 30');
  });
  it('GDD-13 every cause has its text', () => {
    expect(CAUSE_TEXT).toEqual({
      wall: 'You hit the edge of the board.', self: 'You bit your own tail.',
      rotten: 'You hit a rock left by a rotten mango.', rock: 'A falling rock got you.',
      fence: 'You ran into a fence.', maze: 'You ran into a hedge.', ground: 'The ground rose in front of you.',
    });
  });
  it('GDD-13 level bar labels', () => {
    expect(progressLabel(3, 6, 2, 10)).toBe('3/6 mangoes');
    expect(progressLabel(3, 6, 10, 10)).toBe('Max level');
    expect(levelLabel(0)).toBe('Level 1');
  });
  it('GDD-13 fixed texts', () => {
    expect(TEXT).toEqual({
      title: 'Mango Snake: Hard', header: 'Mango Snake', hard: 'hard', score: 'score', best: 'best',
      start: 'Fill the bar with mangoes to level up. Each level brings new obstacles.',
      play: 'Play', resume: 'Resume', playAgain: 'Play again', paused: 'Paused',
      pausedText: 'You get a short countdown when you resume.',
      landsSoon: 'Lands soon', groundRising: 'Ground rising', mangoRotting: 'Mango rotting',
      over: 'Game over', won: 'You filled the board!', wonWhy: 'No room left for mangoes.',
    });
  });
});
