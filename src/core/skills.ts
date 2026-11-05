import type { Balance } from './balance';
import { baseTickMs } from './ramp';
import { levelUpSlowFactor } from './slowdown';
import { scaleTick } from './hazards/blocks/groundTiles';
import { slowmoSkill } from './skills/slowmo';
import { tailSnipSkill } from './skills/tailSnip';
import { shieldSkill } from './skills/shield';
import { mangoRainSkill } from './skills/mangoRain';
import type { SimState, SkillId, StepCtx } from './types';

export interface SkillDef {
  id: SkillId;
  active(s: SimState): boolean;
  precondition(s: SimState, b: Balance): boolean;
  apply(s: SimState, b: Balance, ctx: StepCtx): void;
  leftMs(s: SimState): number;
}

// MEC-006 section 4 every skill id has a definition.
export const SKILLS: Record<SkillId, SkillDef> = { slowmo: slowmoSkill, tailSnip: tailSnipSkill, shield: shieldSkill, mangoRain: mangoRainSkill };

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
  const reject = (reason: 'empty' | 'active' | 'energy' | 'noTarget') => ctx.emit({ type: 'skillRejected', slot, skill: id, reason });
  if (id === null) return reject('empty');
  const def = SKILLS[id];
  if (def.active(s)) return reject('active');
  const cost = b.skills[id].cost;
  if (s.energy < cost) return reject('energy');
  if (!def.precondition(s, b)) return reject('noTarget');
  const before = s.energy; s.energy -= cost;
  ctx.emit({ type: 'energyChanged', energy: s.energy, delta: -cost, source: 'skill' });
  ctx.emit({ type: 'skillUsed', slot, skill: id, level: s.level, energyBefore: before, energyAfter: s.energy });
  def.apply(s, b, ctx);
}

// MEC-006-R16 step 7 runs only during playing time; walls and rubble tick through their family.
export function skillTimers(s: SimState, _b: Balance, ctx: StepCtx): void {
  if (s.slowmo && --s.slowmo.leftMs <= 0) {
    s.slowmo = null;
    ctx.emit({ type: 'skillEnded', skill: 'slowmo', reason: 'timeout' });
  }
  if (s.shield && --s.shield.leftMs <= 0) {
    s.shield = null;
    ctx.emit({ type: 'skillEnded', skill: 'shield', reason: 'timeout' });
  }
}

// MEC-006-R17 / MEC-003-R22 / MEC-004-R7 max(Slow-mo, level-up slowdown) multiplies the tile factor.
export function effectiveTick(s: SimState, b: Balance): number {
  const base = baseTickMs(s, b);
  const f = Math.max(s.slowmo ? b.skills.slowmo.tickFactor : 1, levelUpSlowFactor(s));
  const tileFactor = 1; // MEC-012-R6 mud tuning and its head-cell factor arrive with the mud family.
  return scaleTick(base, f, tileFactor);
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
