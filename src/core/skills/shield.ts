import type { Balance } from '../balance';
import { inBounds } from '../grid';
import { FAMILY, familyAt } from '../hazards/registry';
import { isReserved } from '../reserved';
import type { SkillDef } from '../skills';
import type { SimState, StepCtx } from '../types';

// MEC-006-R14/R24 Shield is active until it breaks one solid cell or times out.
export const shieldSkill: SkillDef = {
  id: 'shield', active: s => s.shield !== null, precondition: () => true,
  apply(s, b) { s.shield = { leftMs: b.skills.shield.durationMs }; },
  leftMs: s => s.shield?.leftMs ?? 0,
};

// MEC-006-R25..R28 break the solid cell at (x, y) before the head moves; true = survived.
export function shieldHit(s: SimState, b: Balance, ctx: StepCtx, x: number, y: number): boolean {
  const key = familyAt(s, x, y, 'solidAt');
  if (!s.shield || key === null || !FAMILY[key].breakable) return false;
  // MEC-006-R26 remove that one cell (from every breakable family solid there; overlaps are not expected).
  for (let k: typeof key | null = key; k !== null && FAMILY[k].breakable; k = familyAt(s, x, y, 'solidAt')) FAMILY[k].onBreak!(s, x, y);
  s.shield = null;
  ctx.emit({ type: 'skillEnded', skill: 'shield', reason: 'consumed' });
  // MEC-006-R28 rubble one step beyond, only on an in-bounds cell that is not reserved.
  const rx = x + s.dir.x, ry = y + s.dir.y;
  let rubble: { x: number; y: number } | null = null;
  if (inBounds(b.board.cols, b.board.rows, rx, ry) && !isReserved(s, rx, ry)) {
    rubble = { x: rx, y: ry };
    s.rubble.push({ family: 'rubble', x: rx, y: ry, state: 'solid', leftMs: b.skills.shield.rubbleLifeMs });
  }
  ctx.emit({ type: 'shieldBroke', x, y, family: key, rubble });
  // MEC-006-R27 bonk: the next step comes bonkPauseTicks + 1 ticks after the break (tickMs is this step's effective tick).
  s.acc = -b.skills.shield.bonkPauseTicks * s.tickMs;
  return true;
}
