import type { Cell, HazardFamily } from '../types';
import { patchCellOn, patchHas, spawnGroundPatch, stepPatch } from './blocks/groundTiles';

const NEIGHBOURS = [[0, -1], [-1, 0], [1, 0], [0, 1]] as const;

// MEC-012-R7 unique four-neighbour exit ring, independent of input order and sorted row-major.
export function iceRing(cells: readonly Cell[]): Cell[] {
  const patch = new Set(cells.map(c => `${c.x},${c.y}`)), ring = new Map<string, Cell>();
  for (const c of cells) for (const [dx, dy] of NEIGHBOURS) {
    const x = c.x + dx, y = c.y + dy, key = `${x},${y}`;
    if (!patch.has(key)) ring.set(key, { x, y });
  }
  return [...ring.values()].sort((a, b) => a.y - b.y || a.x - b.x);
}

// MEC-012-R7/R8 ice reserves its cells and exit ring; only patch cells block BFS.
export const ice: HazardFamily = {
  key: 'ice', cause: null, capClass: 'small', maxActiveKey: 'ice.maxActive', breakable: false, emitsIncoming: true,
  spawn: (s, ctx) => spawnGroundPatch(s, ctx, 'ice', iceRing),
  update(s, ctx) {
    s.families.ice.patches = s.families.ice.patches.filter(p => stepPatch(p, ctx.balance.hazard.crumbleMs, ctx.snakeOn));
  },
  count: s => s.families.ice.patches.length,
  tileAt: (s, x, y) => s.families.ice.patches.some(p => patchCellOn(p, x, y)) ? 'ice' : null,
  reservedAt: (s, x, y) => s.families.ice.patches.some(p => patchHas(p, x, y) || p.ring?.some(c => c.x === x && c.y === y)),
  bfsWallAt: (s, x, y) => s.families.ice.patches.some(p => patchHas(p, x, y)),
  solidAt: () => false,
  snapshot: s => s.families.ice.patches,
};
