// tests/qa/task8-text.qa.test.ts — black-box QA tests for Task 8 text strings vs §7.5
import { describe, expect, it } from 'vitest';
import {
  bestLine,
  CAUSE_TEXT,
  deathMessage,
  incomingBanner,
  levelBanner,
  levelLabel,
  progressLabel,
  TEXT,
} from '../../src/game/text';

describe('QA Task 8: Text and String Table (Black-Box)', () => {
  it('QA-T8-01 P0-Design §7.5 static UI labels and messages match exact strings', () => {
    expect(TEXT.title).toBe('Mango Snake: Hard');
    expect(TEXT.header).toBe('Mango Snake');
    expect(TEXT.hard).toBe('hard');
    expect(TEXT.score).toBe('score');
    expect(TEXT.best).toBe('best');
    expect(TEXT.start).toBe('Fill the bar with mangoes to level up. Each level brings new obstacles.');
    expect(TEXT.play).toBe('Play');
    expect(TEXT.resume).toBe('Resume');
    expect(TEXT.playAgain).toBe('Play again');
    expect(TEXT.paused).toBe('Paused');
    expect(TEXT.landsSoon).toBe('Lands soon');
    expect(TEXT.groundRising).toBe('Ground rising');
    expect(TEXT.mangoRotting).toBe('Mango rotting');
    expect(TEXT.over).toBe('Game over');
    expect(TEXT.won).toBe('You filled the board!');
    expect(TEXT.wonWhy).toBe('No room left for mangoes.');
  });

  it('QA-T8-02 P0-Design §7.5 death cause messages match exact strings', () => {
    expect(CAUSE_TEXT.wall).toBe('You hit the edge of the board.');
    expect(CAUSE_TEXT.self).toBe('You bit your own tail.');
    expect(CAUSE_TEXT.rotten).toBe('You hit a rock left by a rotten mango.');
    expect(CAUSE_TEXT.rock).toBe('A falling rock got you.');
    expect(CAUSE_TEXT.fence).toBe('You ran into a fence.');
    expect(CAUSE_TEXT.maze).toBe('You ran into a hedge.');
    expect(CAUSE_TEXT.ground).toBe('The ground rose in front of you.');
  });

  it('QA-T8-03 P0-Design §7.5 levelLabel formats 0-indexed levels correctly', () => {
    // updated for P1 MEC-003-R1
    expect(levelLabel(1)).toBe('Level 1');
    expect(levelLabel(2)).toBe('Level 2');
    expect(levelLabel(10)).toBe('Level 10');
  });

  it('QA-T8-04 P0-Design §7.5 progressLabel formats normal and max level', () => {
    expect(progressLabel(0, 5, 0, 9)).toBe('0/5 mangoes');
    expect(progressLabel(3, 5, 2, 9)).toBe('3/5 mangoes');
    expect(progressLabel(5, 5, 8, 9)).toBe('5/5 mangoes');
    expect(progressLabel(0, 5, 9, 9)).toBe('Max level');
    expect(progressLabel(4, 5, 10, 9)).toBe('Max level');
  });

  it('QA-T8-05 P0-Design §7.5 levelBanner handles unlocked families and default speed up', () => {
    // updated for P1 MEC-003-R1/R15/R16
    expect(levelBanner(6, 'fence')).toBe('Level 6: fences unlocked');
    expect(levelBanner(11, 'terrain')).toBe('Level 11: rising ground unlocked');
    expect(levelBanner(12, 'rottenRock')).toBe('Level 12: rotten rocks unlocked');
    expect(levelBanner(26, 'maze')).toBe('Level 26: hedge mazes unlocked');
    expect(levelBanner(2)).toBe('Level 2: a bit faster');
    expect(levelBanner(4, undefined)).toBe('Level 4: a bit faster');
  });

  it('QA-T8-06 P0-Design §7.5 incomingBanner formats hazard warnings', () => {
    expect(incomingBanner('fence')).toBe('Fence incoming');
    expect(incomingBanner('maze')).toBe('Maze incoming');
    expect(incomingBanner('terrain')).toBe('The ground is shaking');
  });

  it('QA-T8-07 P0-Design §7.5 deathMessage formats won run text', () => {
    // updated for P1 MEC-003-R1
    expect(deathMessage(true, undefined, 42, 7)).toBe('No room left for mangoes. Score 42, level 7.');
  });

  it('QA-T8-08 P0-Design §7.5 deathMessage formats loss causes and 1-based level', () => {
    // updated for P1 MEC-003-R1
    expect(deathMessage(false, 'wall', 0, 1)).toBe('You hit the edge of the board. Score 0, level 1.');
    expect(deathMessage(false, 'fence', 15, 3)).toBe('You ran into a fence. Score 15, level 3.');
    expect(deathMessage(false, 'maze', 30, 7)).toBe('You ran into a hedge. Score 30, level 7.');
    expect(deathMessage(false, 'ground', 22, 5)).toBe('The ground rose in front of you. Score 22, level 5.');
  });

  it('QA-T8-09 P0-Design §7.1, §7.5 bestLine on start card reflects best score', () => {
    expect(bestLine('start', 0)).toBe('');
    expect(bestLine('start', 10)).toBe('Best score 10');
  });

  it('QA-T8-10 P0-Design §7.1, §7.5 bestLine on death card handles new best vs existing best', () => {
    // New best score achieved (score > 0)
    expect(bestLine('over', 20, true, 20)).toBe('New best score!');
    // If score is 0 and marked newBest, rule specifies score > 0 required
    expect(bestLine('over', 0, true, 0)).toBe('');
    // No new best, but previous best exists
    expect(bestLine('over', 25, false, 12)).toBe('Best score 25');
    // No new best, no previous best
    expect(bestLine('over', 0, false, 0)).toBe('');
  });
});
