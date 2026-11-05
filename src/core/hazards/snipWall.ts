import { defineFamily } from './family';
import type { InstanceRules, SnipWall } from '../types';

const hasCell = (w: SnipWall, x: number, y: number): boolean => w.cells.some(c => c.x === x && c.y === y);

// MEC-006-R22/R23 solid walls kill; both solid and crumble reserve cells and block BFS.
const rules: InstanceRules<SnipWall> = {
  key: 'snipWall', cause: 'snipWall', capClass: 'none', maxActiveKey: null, breakable: true,
  spawn: () => null,
  update(w, ctx) {
    w.leftMs -= 1;
    if (w.leftMs <= 0) {
      if (w.state === 'crumble') return 'remove';
      w.state = 'crumble'; w.leftMs = ctx.balance.hazard.crumbleMs;
      ctx.emit({ type: 'skillEnded', skill: 'tailSnip', reason: 'timeout' });
    }
    return 'keep';
  },
  solidAt: (w, x, y) => w.state === 'solid' && hasCell(w, x, y),
  bfsWallAt: hasCell, reservedAt: hasCell,
  // MEC-006-R26 Shield removes one wall cell; an empty wall is dropped.
  onBreak(s, x, y) {
    for (const w of s.families.snipWall) if (w.state === 'solid') w.cells = w.cells.filter(c => c.x !== x || c.y !== y);
    s.families.snipWall = s.families.snipWall.filter(w => w.cells.length > 0);
  },
};

// MEC-004-R2 compose state queries and updates over this family's own instances.
export const snipWallFamily = defineFamily('snipWall', rules, s => s.families.snipWall, (s, instances) => { s.families.snipWall = instances; });
