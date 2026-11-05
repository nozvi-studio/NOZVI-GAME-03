import { describe, it, expect } from 'vitest';
import { levelUpLines, levelLabel } from '../../src/game/hudText';
import { t } from '../../src/game/text';

describe('MEC-003 §8 challenge banner and HUD marker', () => {
  it('MEC-003 §8 a challenge level up shows the challenge banner after the level line', () => {
    const lines = levelUpLines({ level: 20, challenge: true, biomeChanged: false }, t);
    expect(lines).toContain('Challenge: Avalanche!');
    expect(lines[0]).toContain('Level 20');
    expect(lines.indexOf('Challenge: Avalanche!')).toBeGreaterThan(0);
    expect(levelUpLines({ level: 19, challenge: false, biomeChanged: false }, t).some(l => l.startsWith('Challenge'))).toBe(false);
  });
  it('MEC-003 §8 every challenge level has banner text', () => {
    for (const n of [5, 10, 15, 20, 25, 30]) {
      expect(levelUpLines({ level: n, challenge: true, biomeChanged: false }, t).some(l => l.startsWith('Challenge:'))).toBe(true);
    }
  });
  it('MEC-003 §8 biome and unlock lines stay before the challenge banner', () => {
    const lines = levelUpLines({ level: 5, challenge: true, biomeChanged: true, unlocked: 'rock' } as never, t);
    expect(lines[lines.length - 1]).toBe('Challenge: Rock rain!');
  });
  it('MEC-003 §8 HUD level label carries the star only while a challenge is active', () => {
    expect(levelLabel({ level: 5, biome: 1, challenge: true }, t)).toContain('★');
    expect(levelLabel({ level: 6, biome: 2, challenge: false }, t)).not.toContain('★');
  });
});

import { runStartLines } from '../../src/game/hudText';
describe('MEC-003 §8 run start banner', () => {
  it('MEC-003 §8 a run starting on a challenge level shows its challenge banner, other levels none', () => {
    expect(runStartLines({ level: 10, challenge: true }, t)).toEqual(['Challenge: Fence field!']);
    expect(runStartLines({ level: 1, challenge: false }, t)).toEqual([]);
  });
});
