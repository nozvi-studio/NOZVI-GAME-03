import { describe, expect, it } from 'vitest';
import { bestLine, CAUSE_TEXT, deathMessage, incomingBanner, levelBanner, levelLabel, progressLabel, t, TEXT } from '../../src/game/text';

describe('GDD-13 strings verbatim from the prototype (design §7.5)', () => {
  it('MEC-014-R9 levelBanner names gates at introduction', () => {
    expect(levelBanner(17, 'gate')).toBe('Level 17: gates unlocked');
  });
  it('MEC-013-R8 levelBanner names rolling coconuts at introduction', () => {
    expect(levelBanner(16, 'coconut')).toBe('Level 16: rolling coconuts unlocked');
  });
  it('GDD-13 level banners (L605)', () => {
    expect(levelBanner(6, 'fence')).toBe('Level 6: fences unlocked');
    expect(levelBanner(11, 'terrain')).toBe('Level 11: rising ground unlocked');
    expect(levelBanner(26, 'maze')).toBe('Level 26: hedge mazes unlocked');
    expect(levelBanner(2)).toBe('Level 2: a bit faster');
  });
  it('GDD-13 hazard banners', () => {
    expect([incomingBanner('fence'), incomingBanner('maze'), incomingBanner('terrain')])
      .toEqual(['Fence incoming', 'Maze incoming', 'The ground is shaking']);
  });
  it('GDD-13 death message and best lines (L689–694, L1017)', () => {
    expect(deathMessage(false, 'fence', 12, 3)).toBe('You ran into a fence. Score 12, level 3.');
    expect(deathMessage(true, undefined, 280, 10)).toBe('No room left for mangoes. Score 280, level 10.');
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
      snipWall: 'You hit your discarded tail.', rubble: 'You hit the rubble.',
      coconut: 'Hit by a coconut.', gate: 'Crushed by a gate.', spike: 'Spiked.',
      cat: 'Ran into the cat.', chicken: 'Ran into the chicken.', bomb: 'Caught in the blast.', shrink: 'You hit the closed edge.',
    });
  });
  it('GDD-13 level bar labels', () => {
    expect(progressLabel(3, 6, 2, 10)).toBe('3/6 mangoes');
    expect(progressLabel(3, 6, 10, 10)).toBe('Max level');
    expect(levelLabel(1)).toBe('Level 1');
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
  it('GDD-13 new causes have death messages before their families are registered', () => {
    expect(deathMessage(false, 'coconut', 12, 16)).toBe('Hit by a coconut. Score 12, level 16.');
    expect(deathMessage(false, 'gate', 12, 17)).toBe('Crushed by a gate. Score 12, level 17.');
    expect(deathMessage(false, 'spike', 12, 18)).toBe('Spiked. Score 12, level 18.');
    expect(deathMessage(false, 'cat', 12, 21)).toBe('Ran into the cat. Score 12, level 21.');
    expect(deathMessage(false, 'chicken', 12, 21)).toBe('Ran into the chicken. Score 12, level 21.');
    expect(deathMessage(false, 'bomb', 12, 23)).toBe('Caught in the blast. Score 12, level 23.');
  });
});

describe('P1 text keys (MEC-003/006/007/008 §8)', () => {
  const keys = [
    'banner.levelUp', 'banner.freshStart', ...[1, 2, 3, 4, 5, 6].map(b => `banner.biome.${b}`),
    ...['rock', 'rottenRock', 'fence', 'terrain', 'maze'].map(f => `banner.new.${f}`), 'hud.level',
    'hud.energy', 'skill.slowmo.name', 'skill.tailSnip.name', 'skill.shield.name', 'skill.mangoRain.name',
    'skill.reject.energy', 'skill.reject.active', 'skill.reject.noTarget', 'tip.orb.first',
    'death.snipWall', 'death.rubble',
    'loadout.title', 'loadout.go', 'loadout.back', 'loadout.slot1', 'loadout.slot2', 'loadout.locked',
    'tip.skillUnlocked.slot', 'tip.skillUnlocked.next', 'tip.slotUnlocked',
    'home.playCheckpoint', 'home.playL1', 'home.play', 'home.carry', 'banner.checkpoint', 'tip.checkpoint',
    'hud.nextCheckpoint', 'hud.nextCheckpointClear', 'hud.ramp',
    ...['wall', 'self', 'rotten', 'rock', 'fence', 'maze', 'ground', 'snipWall', 'rubble', 'quit', 'clear'].map(c => `cause.${c}`),
  ];
  it('P1 text: every MEC §8 key, every CauseKey and quit/clear resolve to a string', () => {
    for (const k of keys) expect(t(k), k).not.toBe(k);
    expect(t('skill.reject.energy', { cost: 40 })).toBe('Need 40 energy');
    expect(t('loadout.locked', { level: 6 })).toBe('Reach L6');
    expect(t('hud.ramp', { n: 3 })).toBe('Warming up 3');
    expect(t('home.playCheckpoint', { level: 8 })).toBe('Play from checkpoint L8');
    expect(t('banner.biome.6')).toBe('Storm Garden');
    expect(t('no.such.key')).toBe('no.such.key');
  });
});

it('MEC-014-R9 spike introduction has a readable level banner', () => {
  expect(levelBanner(18, 'spike')).toBe('Level 18: spikes unlocked');
});

it('MEC-015-R8 NPC introduction has a readable level banner', () => {
  expect(levelBanner(21, 'npc')).toBe('Level 21: cats and chickens unlocked');
});

it('MEC-003 §8 every P2b family has a banner and every P2b cause has a death text', () => {
  for (const k of ['coconut', 'gate', 'spike', 'npc', 'bird', 'bomb']) expect(t(`banner.new.${k}`)).not.toMatch(/^banner\./);
  for (const c of ['coconut', 'gate', 'spike', 'cat', 'chicken', 'bomb']) expect(t(`death.${c}`)).not.toMatch(/^death\./);
});

it('MEC-018-R11 shrink has a banner and a death text', () => {
  expect(t('banner.new.shrink')).toBe('The board shrinks! The edge closes for a while.');
  expect(t('death.shrink')).toBe('You hit the closed edge.');
});
