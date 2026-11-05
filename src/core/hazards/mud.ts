import type { HazardFamily } from '../types';
import { patchCellOn, patchHas, spawnGroundPatch, stepPatch } from './blocks/groundTiles';

// MEC-012 mud reserves ground without blocking movement or BFS; patches survive level up.
export const mud: HazardFamily = {
  key: 'mud', cause: null, capClass: 'small', maxActiveKey: 'mud.maxActive', breakable: false, emitsIncoming: true,
  spawn: (s, ctx) => spawnGroundPatch(s, ctx, 'mud'),
  update(s, ctx) {
    s.families.mud.patches = s.families.mud.patches.filter(p => stepPatch(p, ctx.balance.hazard.crumbleMs, ctx.snakeOn));
  },
  count: s => s.families.mud.patches.length,
  tileAt: (s, x, y) => s.families.mud.patches.some(p => patchCellOn(p, x, y)) ? 'mud' : null,
  reservedAt: (s, x, y) => s.families.mud.patches.some(p => patchHas(p, x, y)),
  solidAt: () => false, bfsWallAt: () => false,
  snapshot: s => s.families.mud.patches,
};
