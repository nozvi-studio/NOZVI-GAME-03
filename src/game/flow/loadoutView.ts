import type { Balance, SkillId } from '../../core';
import type { LoadoutEditState } from './loadoutEdit';
export interface SkillCardView { id: SkillId; nameKey: string; locked: boolean; cost: number; unlockLevel: number;
  desc: { key: string; vars: Record<string, number> } | null; slot: 0 | 1 | null }
export interface LoadoutView { titleKey: 'loadout.title' | 'loadout.titleOne';
  slots: { index: 0 | 1; skill: SkillId | null; active: boolean }[]; cards: SkillCardView[]; startAt: number; energy: number | null }
const sec = (ms: number): number => ms / 1000;
// P3b3-R8 card copy is generated from balance (spec §2): no typed numbers.
export function skillDesc(id: SkillId, b: Balance): { key: string; vars: Record<string, number> } {
  const k = `skill.${id}.desc`;
  switch (id) {
    case 'slowmo': return { key: k, vars: { s: sec(b.skills.slowmo.durationMs) } };
    case 'tailSnip': return { key: k, vars: { s: sec(b.skills.tailSnip.wallLifeMs) } };
    case 'shield': return { key: k, vars: { s: sec(b.skills.shield.durationMs) } };
    case 'mangoRain': return { key: k, vars: { min: b.skills.mangoRain.dropsMin, max: b.skills.mangoRain.dropsMax, s: sec(b.skills.mangoRain.durationMs) } };
  }
}
// P3b3-R9 MEC-007-R3/R6 view: slot count follows the model (C3), locked cards show "Unlocks at Lx" (text) and no description.
export function loadoutView(e: LoadoutEditState, b: Balance, ctx: { level: number; carried: number }): LoadoutView {
  return {
    titleKey: e.slotCount === 2 ? 'loadout.title' : 'loadout.titleOne',
    slots: ([0, 1] as const).filter(i => i < e.slotCount).map(i => ({ index: i, skill: e.selection[i], active: e.activeSlot === i })),
    cards: b.loadout.order.map(id => {
      const locked = !e.unlocked.includes(id), s = e.selection.indexOf(id);
      return { id, nameKey: `skill.${id}.name`, locked, cost: b.skills[id].cost, unlockLevel: b.skills[id].unlockLevel,
        desc: locked ? null : skillDesc(id, b), slot: s === 0 || s === 1 ? s : null };
    }),
    startAt: ctx.level, energy: ctx.carried > 0 ? ctx.carried : null,
  };
}
