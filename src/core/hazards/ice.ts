import type { Cell, HazardFamily } from '../types';
import { transform } from './shapes';
import { newPatch, patchCellOn, patchHas, stepPatch } from './blocks/groundTiles';

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
  // MEC-012-R1 retain shape -> transform -> origins -> lifetime RNG order.
  spawn(s, ctx) {
    const b = ctx.balance, i = b.ice, rng = ctx.rng;
    const shape = transform(i.shapes[rng.pick(i.shapePool)]!, rng, i.mirrorChance);
    const w = Math.max(...shape.map(([x]) => x)) + 1, h = Math.max(...shape.map(([, y]) => y)) + 1;
    for (let attempt = 0; attempt < i.tries; attempt++) {
      const ox = rng.int(b.board.cols - w + 1), oy = rng.int(b.board.rows - h + 1);
      const cells = shape.map(([x, y]) => ({ x: ox + x, y: oy + y })), ring = iceRing(cells);
      if (!ctx.candidateValid(s, cells, { nearDist: b.fairness.nearHeadDist, wallCells: cells, extraFree: ring })) continue;
      const st = s.families.ice;
      st.patches.push(newPatch(st.nextId++, cells, i.warnMs, i.lifeMs + rng.next() * i.lifeRandMs, ring));
      s.events.push({ type: 'hazardIncoming', family: 'ice' });
      return cells;
    }
    return null;
  },
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
