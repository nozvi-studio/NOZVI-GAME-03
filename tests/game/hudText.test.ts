import { describe, it, expect } from 'vitest';
import { levelTitle, biomeName, runStartLines } from '../../src/game/hudText';
import { t } from '../../src/game/text';

describe('MEC-003 §8 run start banner', () => {
  it('MEC-003 §8 a run starting on a challenge level shows its challenge banner, other levels none', () => {
    expect(runStartLines({ level: 10, challenge: true }, t)).toEqual(['Challenge: Fence field!']);
    expect(runStartLines({ level: 1, challenge: false }, t)).toEqual([]);
  });
  it('MEC-003 §8 run-start banner derives from the snapshot at HUD create, so every challenge level start shows exactly one banner', () => {
    for (const level of [5, 10, 15, 20, 25, 30]) expect(runStartLines({ level, challenge: true }, t)).toEqual([expect.stringMatching(/^Challenge: /)]);
  });
});

describe('P3b2-R6 HUD header text', () => {
  it('P3b2-R6 level title and biome name; star only on a challenge level', () => {
    expect(levelTitle({ level: 7, challenge: false }, t)).toBe('Level 7');
    expect(levelTitle({ level: 10, challenge: true }, t)).toBe('Level 10 ★');
    expect(biomeName(2, t)).toBe('Rice Paddy');
  });
});
