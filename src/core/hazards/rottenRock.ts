import type { HazardFamily, RottenRock } from '../types';

const hasCell = (r: RottenRock, x: number, y: number): boolean => r.x === x && r.y === y;

// MEC-002-R7 temporary rotten rocks have no warning phase and never enter the director cap.
export const rottenRockFamily: HazardFamily<RottenRock> = {
  key: 'rottenRock', cause: 'rotten', capClass: 'none', maxActiveKey: null, breakable: true,
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
  // MEC-003-R7 transition cleanup restarts the crumble timer even for crumbling rocks.
  onLevelEnd(s, ctx) {
    for (const r of s.rottenRocks) { r.state = 'crumble'; r.leftMs = ctx.balance.hazard.crumbleMs; }
  },
};
