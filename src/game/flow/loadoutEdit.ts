// Pure loadout screen editing state (no Phaser import).
import type { Loadout, SkillId } from '../../core';
import type { LoadoutModel } from '../../session';

export interface LoadoutEditState { selection: Loadout; activeSlot: 0 | 1; slotCount: 1 | 2; unlocked: readonly SkillId[] }

export const initEdit = (m: LoadoutModel): LoadoutEditState =>
  ({ selection: [m.selection[0], m.selection[1]], activeSlot: 0, slotCount: m.slotCount, unlocked: [...m.unlocked] });

// MEC-007-R6 a slot beyond the unlocked slot count is ignored.
export function tapSlot(s: LoadoutEditState, slot: 0 | 1): LoadoutEditState {
  return slot >= s.slotCount ? s : { ...s, activeSlot: slot };
}

// MEC-007-R7 card tap: locked ignored; swap when the skill sits in the other slot; else replace the active slot.
export function tapCard(s: LoadoutEditState, id: SkillId): LoadoutEditState {
  if (!s.unlocked.includes(id)) return s;
  const sel: [SkillId | null, SkillId | null] = [s.selection[0], s.selection[1]];
  const a = s.activeSlot, other: 0 | 1 = a === 0 ? 1 : 0;
  if (s.slotCount === 2 && sel[other] === id) { sel[other] = sel[a]; sel[a] = id; }
  else if (sel[a] !== id) sel[a] = id;
  const activeSlot: 0 | 1 = s.slotCount === 2 ? other : 0;
  return { ...s, selection: sel, activeSlot };
}
