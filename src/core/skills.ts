import type { Balance } from './balance';
import { baseTickMs } from './ramp';
import { slowmoSkill } from './skills/slowmo';
import { tailSnipSkill } from './skills/tailSnip';
import type { SimState, SkillId, StepCtx } from './types';

export interface SkillDef {
  id: SkillId;
  active(s: SimState): boolean;
  precondition(s: SimState, b: Balance): boolean;
  apply(s: SimState, b: Balance, ctx: StepCtx): void;
  leftMs(s: SimState): number;
}

export const SKILLS: Partial<Record<SkillId, SkillDef>> = { slowmo: slowmoSkill, tailSnip: tailSnipSkill };

// MEC-007 section 3 derives unlocks from balance and the saved best level.
export function unlockedSkills(b: Balance, bestLevel: number): SkillId[] {
  return b.loadout.order.filter(id => b.skills[id].unlockLevel <= bestLevel);
}

// MEC-007 section 3 opens the second loadout slot at its configured level.
export function slotCount(b: Balance, bestLevel: number): 1 | 2 {
  return bestLevel < b.loadout.secondSlotLevel ? 1 : 2;
}

// MEC-007 section 7 supplies plain data to meta without a core dependency.
export function unlockTable(b: Balance): { order: readonly SkillId[]; unlockLevel: Record<SkillId, number>; secondSlotLevel: number } {
  return { order: [...b.loadout.order], unlockLevel: {
    slowmo: b.skills.slowmo.unlockLevel, tailSnip: b.skills.tailSnip.unlockLevel,
    shield: b.skills.shield.unlockLevel, mangoRain: b.skills.mangoRain.unlockLevel,
  }, secondSlotLevel: b.loadout.secondSlotLevel };
}

// MEC-006-R11..R15 synchronous input: reject in order, spend, then apply.
export function useSkill(s: SimState, b: Balance, ctx: StepCtx, slot: 0 | 1): void {
  if (s.status !== 'playing') return;
  const id = s.loadout[slot];
  const reject = (reason: 'empty' | 'busy' | 'active' | 'energy' | 'noTarget') => ctx.emit({ type: 'skillRejected', slot, skill: id, reason });
  if (id === null) return reject('empty');
  const def = SKILLS[id];
  if (!def) throw new Error(`skill ${id} lands in P1 PR 7`);
  if (s.phase === 'transition') return reject('busy');
  if (def.active(s)) return reject('active');
  const cost = b.skills[id].cost;
  if (s.energy < cost) return reject('energy');
  if (!def.precondition(s, b)) return reject('noTarget');
  const before = s.energy; s.energy -= cost;
  ctx.emit({ type: 'energyChanged', energy: s.energy, delta: -cost, source: 'skill' });
  ctx.emit({ type: 'skillUsed', slot, skill: id, level: s.level, energyBefore: before, energyAfter: s.energy });
  def.apply(s, b, ctx);
}

// MEC-006-R16 step 7 runs only during playing time; walls tick through their family.
export function skillTimers(s: SimState, _b: Balance, ctx: StepCtx): void {
  if (s.slowmo && --s.slowmo.leftMs <= 0) {
    s.slowmo = null;
    ctx.emit({ type: 'skillEnded', skill: 'slowmo', reason: 'timeout' });
  }
}

// MEC-006-R17 apply Slow-mo to the live level/checkpoint-ramp speed.
export function effectiveTick(s: SimState, b: Balance): number {
  const base = baseTickMs(s, b);
  return s.slowmo ? Math.round(base * b.skills.slowmo.tickFactor) : base;
}

// MEC-007-R12 bestLevel stays the saved options value throughout the run.
export function applyMidRunUnlocks(s: SimState, b: Balance, ctx: StepCtx): void {
  if (s.level <= s.bestLevel) return;
  if (s.level === b.loadout.secondSlotLevel) ctx.emit({ type: 'slotUnlocked', slot: 1 });
  for (const id of b.loadout.order) {
    if (b.skills[id].unlockLevel !== s.level) continue;
    const index = s.loadout.findIndex((skill, i) => skill === null && i < slotCount(b, s.level));
    const slot = index < 0 ? null : index as 0 | 1;
    if (slot !== null) s.loadout[slot] = id;
    ctx.emit({ type: 'skillUnlocked', skill: id, slot });
  }
}
