// tests/game/skillKeys.test.ts
import { describe, it, expect } from 'vitest';
import { skillSlotForKey, acceptSkillInput } from '../../src/game/input/skillKeys';
describe('skillKeys', () => {
  it('MEC-007-R14 keyboard J/Q and K/E map to slots 0 and 1', () => {
    expect(['KeyJ', 'KeyQ', 'KeyK', 'KeyE', 'KeyX'].map(k => skillSlotForKey(k, false))).toEqual([0, 0, 1, 1, null]);
    expect(skillSlotForKey('KeyJ', true)).toBeNull();
  });
  it('MEC-007-R15 skill input ignored during countdown, pause and over', () => {
    expect((['ready', 'countdown', 'playing', 'paused', 'over'] as const).map(acceptSkillInput))
      .toEqual([false, false, true, false, false]);
  });
});
