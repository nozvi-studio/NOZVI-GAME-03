// src/core/hazards/rock.ts — MEC-004 falling rocks (spawnRock L427–439)
import { defineFamily } from './family';
import type { InstanceRules, TimedHazard } from '../types';
import { rockPool } from './shapes';
import { breakTimed, makeTimed, timedHasCell, timedSolidAt, updateTimed } from './timed';

const rules: InstanceRules<TimedHazard> = {
  key: 'rock', cause: 'rock', capClass: 'small', maxActiveKey: null, breakable: true, emitsIncoming: true,
  onBreak: (s, x, y) => breakTimed(s, 'rock', x, y),
  // MEC-004-R10-R12 reject each unfair candidate before drawing its lifetime.
  spawn(ctx, rng, s) {
    const b = ctx.balance, r = b.rock;
    const shape = r.shapes[rng.pick(rockPool(b, ctx.level))];       // picked once, before the tries (L429)
    for (let i = 0; i < r.tries; i++) {
      const ox = rng.int(b.board.cols), oy = rng.int(b.board.rows);  // not clamped: off-board cells fail cellFree
      const cells = shape.map(([dx, dy]) => ({ x: ox + dx, y: oy + dy }));
      if (cells.every(c => ctx.cellFree(c.x, c.y)) && ctx.candidateValid(s, cells, { nearDist: b.fairness.nearHeadDist, wallCells: cells }))
        return makeTimed('rock', cells, r.warnMs, r.lifeMs + rng.next() * r.lifeRandMs);
    }
    return null;
  },
  update: updateTimed, solidAt: timedSolidAt, bfsWallAt: timedHasCell, reservedAt: timedHasCell,
};

// MEC-004-R2 compose state queries and updates over this family's own instances.
export const ROCK = defineFamily('rock', rules, s => s.families.rock, (s, instances) => { s.families.rock = instances; });
