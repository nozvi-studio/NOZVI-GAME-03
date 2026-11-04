// src/core/hazards/rubble.ts — Shield rubble (MEC-006-R28)
import type { HazardFamily, Rubble } from '../types';

const hasCell = (r: Rubble, x: number, y: number): boolean => r.x === x && r.y === y;

// MEC-006-R28 rubble is solid for its life, then crumbles; never breakable, never director-spawned.
export const rubbleFamily: HazardFamily<Rubble> = {
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
  // MEC-006-EC15 temporary rubble crumbles at level-up.
  onLevelEnd(s, ctx) {
    for (const r of s.rubble) { r.state = 'crumble'; r.leftMs = ctx.balance.hazard.crumbleMs; }
  },
};
