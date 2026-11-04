// src/core/hazards/maze.ts — MEC-004 hedge mazes (spawnMaze L498–506); the director sets the cooldown
import { defineFamily } from './family';
import type { InstanceRules, TimedHazard } from '../types';
import { mazeCells } from './shapes';
import { breakTimed, makeTimed, timedHasCell, timedSolidAt, updateTimed } from './timed';

const rules: InstanceRules<TimedHazard> = {
  key: 'maze', cause: 'maze', capClass: 'big', maxActiveKey: null, breakable: true,
  onBreak: (s, x, y) => breakTimed(s, 'maze', x, y),
  // MEC-004-R10-R12 test reachability for the complete filtered maze.
  spawn(ctx, rng, s) {
    const b = ctx.balance, m = b.maze;
    const cells = mazeCells(rng.pick(m.layouts)).filter(c => ctx.cellFree(c.x, c.y));
    if (cells.length < m.minCells || !ctx.candidateValid(s, cells, { nearDist: b.fairness.nearHeadDist, wallCells: cells })) return null;
    return makeTimed('maze', cells, m.warnMs, m.lifeMs + rng.next() * m.lifeRandMs);
  },
  update: updateTimed, solidAt: timedSolidAt, bfsWallAt: timedHasCell, reservedAt: timedHasCell,
};

// MEC-004-R2 compose state queries and updates over this family's own instances.
export const MAZE = defineFamily('maze', rules, s => s.families.maze, (s, instances) => { s.families.maze = instances; });
