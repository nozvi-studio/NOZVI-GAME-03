import { expect, it } from 'vitest';
import { initEdit, tapCard } from '../../src/game/flow/loadoutEdit';
import { loadoutView, skillDesc } from '../../src/game/flow/loadoutView';
import { t } from '../../src/game/text';
import { loadBalance } from '../support/balance';
const b = loadBalance();
const model = (bestLevel: number, selection: [string | null, string | null]) => initEdit({
  unlocked: b.loadout.order.filter(id => b.skills[id].unlockLevel <= bestLevel), slotCount: bestLevel < b.loadout.secondSlotLevel ? 1 : 2, selection: selection as never });

it('P3b3-R8 skill descriptions come from balance values', () => {
  expect(t(skillDesc('slowmo', b).key, skillDesc('slowmo', b).vars)).toBe('Slower snake 4 s · timers keep real time');
  expect(t(skillDesc('tailSnip', b).key, skillDesc('tailSnip', b).vars)).toBe('Cut back half · rock wall for 3 s');
  const tweaked = structuredClone(b) as any; tweaked.skills.slowmo.durationMs = 7000; tweaked.skills.tailSnip.wallLifeMs = 2500;
  expect(t(skillDesc('slowmo', tweaked).key, skillDesc('slowmo', tweaked).vars)).toContain('7 s');
  expect(t(skillDesc('tailSnip', tweaked).key, skillDesc('tailSnip', tweaked).vars)).toContain('2.5 s');
  const r = skillDesc('mangoRain', b);
  expect(r.vars).toEqual({ min: b.skills.mangoRain.dropsMin, max: b.skills.mangoRain.dropsMax, s: b.skills.mangoRain.durationMs / 1000 });
  expect(skillDesc('shield', b).vars).toEqual({ s: b.skills.shield.durationMs / 1000 });
});
it('P3b3-R8 cards carry cost and unlock level from balance; locked cards have no description', () => {
  const v = loadoutView(model(6, ['slowmo', 'tailSnip']), b, { level: 4, carried: 0 });
  expect(v.cards.map(c => [c.id, c.locked, c.cost, c.unlockLevel, c.slot])).toEqual([
    ['slowmo', false, b.skills.slowmo.cost, 3, 0], ['tailSnip', false, b.skills.tailSnip.cost, 6, 1],
    ['shield', true, b.skills.shield.cost, 11, null], ['mangoRain', true, b.skills.mangoRain.cost, 16, null]]);
  expect(v.cards[2]!.desc).toBeNull();
  expect(v.cards[0]!.desc).not.toBeNull();
});
it('P3b3-R9 one slot and "Pick a skill" below the second-slot level, two slots after', () => {
  const one = loadoutView(model(3, ['slowmo', null]), b, { level: 1, carried: 0 });
  expect(one.titleKey).toBe('loadout.titleOne');
  expect(one.slots).toEqual([{ index: 0, skill: 'slowmo', active: true }]);
  const two = loadoutView(model(6, ['slowmo', 'tailSnip']), b, { level: 1, carried: 0 });
  expect(two.titleKey).toBe('loadout.title');
  expect(two.slots.map(s => s.active)).toEqual([true, false]);
});
it('P3b3-R9 tapping a card moves the active slot ring', () => {
  const e = tapCard(model(6, ['slowmo', 'tailSnip']), 'shield'); // locked: ignored
  expect(loadoutView(e, b, { level: 1, carried: 0 }).slots.map(s => s.active)).toEqual([true, false]);
});
it('P3b3-R9 start chips: chosen level always, energy only when carried > 0', () => {
  expect(loadoutView(model(6, ['slowmo', 'tailSnip']), b, { level: 6, carried: 25 })).toMatchObject({ startAt: 6, energy: 25 });
  expect(loadoutView(model(6, ['slowmo', 'tailSnip']), b, { level: 1, carried: 0 }).energy).toBeNull();
});
