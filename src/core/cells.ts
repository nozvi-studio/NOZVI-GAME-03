// src/core/cells.ts — cell queries for collision, placement and BFS (L318–351, L365–373). MEC-004
import type { CauseKey, Cell, SimState } from './types';
import { bfsWall, solidFamilyWithPriority } from './hazards/queries';
import { isReserved } from './reserved';

const at = (c: Cell, x: number, y: number): boolean => c.x === x && c.y === y;
export const snakeOn = (s: SimState, x: number, y: number): boolean => s.snake.some(c => at(c, x, y));

// MEC-004 solid right now: rotten rock, then hazard families (L341–346)
export function cellSolidCause(s: SimState, x: number, y: number): CauseKey | null {
  return solidFamilyWithPriority(s, x, y)?.cause ?? null;
}
// MEC-002-R2 all placement queries use the single reserved list.
export function cellReserved(s: SimState, x: number, y: number): boolean {
  return isReserved(s, x, y);
}
// MEC-004 BFS wall: snake body without the last cell, rotten rocks, hazard cells in any state (L365, L372–373)
export function cellBfsWall(s: SimState, x: number, y: number): boolean {
  for (let i = 0; i < s.snake.length - 1; i++) if (at(s.snake[i]!, x, y)) return true;
  return bfsWall(s, x, y);
}
