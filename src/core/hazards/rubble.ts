import { defineFamily } from './family';
// src/core/hazards/rubble.ts — Shield rubble (MEC-006-R28)
import type { InstanceRules, Rubble } from '../types';

const hasCell = (r: Rubble, x: number, y: number): boolean => r.x === x && r.y === y;

// MEC-006-R28 rubble is solid for its life, then crumbles; never breakable, never director-spawned.
const rules: InstanceRules<Rubble> = {
  key: 'rubble', cause: 'rubble', capClass: 'none', maxActiveKey: null, breakable: false,
  spawn: () => null,
  update(r, ctx) {
    r.leftMs -= 1;
    if (r.leftMs <= 0) {
      if (r.state === 'crumble') return 'remove';
      r.state = 'crumble'; r.leftMs = ctx.balance.hazard.crumbleMs;
    }
    return 'keep';
  },
  solidAt: (r, x, y) => r.state === 'solid' && hasCell(r, x, y),
  bfsWallAt: hasCell, reservedAt: hasCell,
  onBreak(s, x, y) { s.families.rubble = s.families.rubble.filter(r => !hasCell(r, x, y)); },
};

// MEC-004-R2 compose state queries and updates over this family's own instances.
export const rubbleFamily = defineFamily('rubble', rules, s => s.families.rubble, (s, instances) => { s.families.rubble = instances; });
