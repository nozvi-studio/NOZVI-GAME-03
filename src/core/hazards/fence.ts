// src/core/hazards/fence.ts — MEC-004 fences (spawnFence L464–477)
import type { HazardFamily, TimedHazard } from '../types';
import { fencePool, lineFence, transform } from './shapes';
import { endTimedLevel, makeTimed, timedHasCell, timedSolidAt, updateTimed } from './timed';

export const FENCE: HazardFamily<TimedHazard> = {
  key: 'fence', cause: 'fence', capClass: 'small', maxActiveKey: null, breakable: false,
  onLevelEnd: s => endTimedLevel(s, 'fence'),
  spawn(ctx, rng) {
    const b = ctx.balance, f = b.fence;
    const kind = rng.pick(fencePool(b, ctx.level));
    const shape = transform(kind === 'line' ? lineFence(b, ctx.level, rng) : f.shapes[kind], rng, f.mirrorChance);
    const w = Math.max(...shape.map(p => p[0])) + 1, h = Math.max(...shape.map(p => p[1])) + 1;
    for (let i = 0; i < f.tries; i++) {
      const ox = rng.int(b.board.cols - w + 1), oy = rng.int(b.board.rows - h + 1);
      const cells = shape.map(([x, y]) => ({ x: ox + x, y: oy + y }));
      if (cells.every(c => ctx.cellFree(c.x, c.y))) return makeTimed('fence', cells, f.warnMs, f.lifeMs + rng.next() * f.lifeRandMs, kind);
    }
    return null;
  },
  update: updateTimed, solidAt: timedSolidAt, bfsWallAt: timedHasCell, reservedAt: timedHasCell,
};
