import { expect, it } from 'vitest';
import { skillLook } from '../../src/game/hud/skillLook';

const v = (state: 'off' | 'ready' | 'active', slot: 0 | 1 = 0) => ({ slot, id: 'shield' as const, cost: 50, state, ring: null, charge: 0.5 });
it('D3-R14 R1 tone by slot; off when unaffordable; locked when empty', () => {
  expect(skillLook(v('ready', 0), 0)).toEqual({ tone: 'skillA', locked: false, badgeNo: false });
  expect(skillLook(v('ready', 1), 1)).toEqual({ tone: 'skillB', locked: false, badgeNo: false });
  expect(skillLook(v('off', 1), 1)).toEqual({ tone: 'off', locked: false, badgeNo: true });
  expect(skillLook(v('active', 0), 0)).toEqual({ tone: 'skillA', locked: false, badgeNo: false });
  expect(skillLook(null, 1)).toEqual({ tone: 'off', locked: true, badgeNo: false });
});
