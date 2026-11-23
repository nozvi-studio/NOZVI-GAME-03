import { expect, it } from 'vitest';
import { badgeTone, skillLook } from '../../src/game/hud/skillLook';
import type { SkillView } from '../../src/game/hud/hudModel';

const mk = (state: SkillView['state'], slot: 0 | 1 = 0): SkillView => ({ slot, id: 'slowmo', state, cost: 3, charge: state === 'off' ? 0.5 : 1, ring: null });

it('D3-R14 / R1 skillLook maps slot and state to tone, lock and badge flag', () => {
  expect(skillLook(null, 0)).toEqual({ tone: 'off', locked: true, badgeNo: false });
  expect(skillLook(mk('off'), 0)).toEqual({ tone: 'off', locked: false, badgeNo: true });
  expect(skillLook(mk('ready'), 0)).toEqual({ tone: 'skillA', locked: false, badgeNo: false });
  expect(skillLook(mk('ready'), 1)).toEqual({ tone: 'skillB', locked: false, badgeNo: false });
  expect(skillLook(mk('active'), 1)).toEqual({ tone: 'skillB', locked: false, badgeNo: false });
});

it('D4-P5-R2 badgeTone is ready when affordable and short when not, for both slots', () => {
  expect(badgeTone(skillLook(mk('ready'), 0))).toBe('ready');
  expect(badgeTone(skillLook(mk('ready'), 1))).toBe('ready');
  expect(badgeTone(skillLook(mk('active'), 0))).toBe('ready');
  expect(badgeTone(skillLook(mk('off'), 0))).toBe('short');
  expect(badgeTone(skillLook(mk('off'), 1))).toBe('short');
});
