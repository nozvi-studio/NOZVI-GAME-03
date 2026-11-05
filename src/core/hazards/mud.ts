import type { HazardFamily } from '../types';
import { rngFrom } from '../rng';
import { transform } from './shapes';
import { newPatch, patchCellOn, patchHas, stepPatch } from './blocks/groundTiles';

const MIRROR_CHANCE = 0.5; // MEC-012-R1 fixed P0 transform probability, independent of fence tuning.

// MEC-012 mud reserves ground without blocking movement or BFS; patches survive level up.
export const mud: HazardFamily = {
  key: 'mud', cause: null, capClass: 'small', maxActiveKey: 'mud.maxActive', breakable: false,
  // MEC-012-R1 preserve the P0 shape, transform, origins, then lifetime RNG order.
  spawn(s, ctx) {
    const b = ctx.balance, m = b.mud, rng = ctx.rng ?? rngFrom(s.rng);
    const shape = transform(m.shapes[rng.pick(m.shapePool)]!, rng, MIRROR_CHANCE);
    const w = Math.max(...shape.map(([x]) => x)) + 1, h = Math.max(...shape.map(([, y]) => y)) + 1;
    for (let i = 0; i < m.tries; i++) {
      const ox = rng.int(b.board.cols - w + 1), oy = rng.int(b.board.rows - h + 1);
      const cells = shape.map(([x, y]) => ({ x: ox + x, y: oy + y }));
      if (!ctx.candidateValid(s, cells, { nearDist: b.fairness.nearHeadDist, wallCells: [] })) continue;
      const st = s.families.mud;
      st.patches.push(newPatch(st.nextId++, cells, m.warnMs, m.lifeMs + rng.next() * m.lifeRandMs));
      s.events.push({ type: 'hazardIncoming', family: 'mud' });
      return cells;
    }
    return null;
  },
  update(s, ctx) {
    s.families.mud.patches = s.families.mud.patches.filter(p => stepPatch(p, ctx.balance.hazard.crumbleMs, ctx.snakeOn));
  },
  count: s => s.families.mud.patches.length,
  tileAt: (s, x, y) => s.families.mud.patches.some(p => patchCellOn(p, x, y)) ? 'mud' : null,
  reservedAt: (s, x, y) => s.families.mud.patches.some(p => patchHas(p, x, y)),
  solidAt: () => false, bfsWallAt: () => false,
  snapshot: s => s.families.mud.patches,
};
