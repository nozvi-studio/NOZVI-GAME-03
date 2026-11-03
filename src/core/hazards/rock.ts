// src/core/hazards/rock.ts — MEC-004 falling rocks (spawnRock L427–439)
import type { HazardFamily, TimedHazard } from '../types';
import { rockPool } from './shapes';
import { makeTimed, timedHasCell, timedSolidAt, updateTimed } from './timed';

export const ROCK: HazardFamily<TimedHazard> = {
  key: 'rock', cause: 'rock', capClass: 'small', maxActiveKey: null, breakable: false,
  spawn(ctx, rng) {
    const b = ctx.balance, r = b.rock;
    const shape = r.shapes[rng.pick(rockPool(b, ctx.level))];       // picked once, before the tries (L429)
    for (let i = 0; i < r.tries; i++) {
      const ox = rng.int(b.board.cols), oy = rng.int(b.board.rows);  // not clamped: off-board cells fail cellFree
      const cells = shape.map(([dx, dy]) => ({ x: ox + dx, y: oy + dy }));
      if (cells.every(c => ctx.cellFree(c.x, c.y))) return makeTimed('rock', cells, r.warnMs, r.lifeMs + rng.next() * r.lifeRandMs);
    }
    return null;
  },
  update: updateTimed, solidAt: timedSolidAt, bfsWallAt: timedHasCell, reservedAt: timedHasCell,
};
