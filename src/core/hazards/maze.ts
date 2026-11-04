// src/core/hazards/maze.ts — MEC-004 hedge mazes (spawnMaze L498–506); the director sets the cooldown
import type { HazardFamily, TimedHazard } from '../types';
import { mazeCells } from './shapes';
import { endTimedLevel, makeTimed, timedHasCell, timedSolidAt, updateTimed } from './timed';

export const MAZE: HazardFamily<TimedHazard> = {
  key: 'maze', cause: 'maze', capClass: 'big', maxActiveKey: null, breakable: false,
  onLevelEnd: s => endTimedLevel(s, 'maze'),
  spawn(ctx, rng) {
    const m = ctx.balance.maze;
    const cells = mazeCells(rng.pick(m.layouts)).filter(c => ctx.cellFree(c.x, c.y));
    if (cells.length < m.minCells) return null;
    return makeTimed('maze', cells, m.warnMs, m.lifeMs + rng.next() * m.lifeRandMs);
  },
  update: updateTimed, solidAt: timedSolidAt, bfsWallAt: timedHasCell, reservedAt: timedHasCell,
};
