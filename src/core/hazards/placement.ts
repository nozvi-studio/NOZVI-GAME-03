import type { Balance } from '../balance';
import { inBounds, key, nearHead, reachable } from '../grid';
import { isReserved } from '../reserved';
import type { Cell, SimState } from '../types';
import { bfsWall } from './queries';

export interface CandidateOpts {
  nearDist: number;
  exemptNearHead?: boolean;
  wallCells: readonly Cell[];
  extraFree?: readonly Cell[];
}

// MEC-004-R4 preserve grid BFS order and the tail's passability.
export function reachableFrom(s: SimState, b: Balance, extraWalls?: Set<number>): Set<number> {
  const { cols, rows } = b.board;
  const body = new Set(s.snake.slice(1, -1).map(c => key(cols, c.x, c.y)));
  return reachable(cols, rows, s.snake[0]!, (x, y) =>
    body.has(key(cols, x, y)) || (extraWalls?.has(key(cols, x, y)) ?? false) || bfsWall(s, x, y));
}

// MEC-004-R12 already unreachable mangoes do not block otherwise valid spawns (L4).
export function keepsMangoReachable(s: SimState, b: Balance, wallCells: readonly Cell[]): boolean {
  const m = s.mango;
  if (!m || wallCells.length === 0) return true;
  const cols = b.board.cols, mangoKey = key(cols, m.x, m.y);
  if (!reachableFrom(s, b).has(mangoKey)) return true;
  return reachableFrom(s, b, new Set(wallCells.map(c => key(cols, c.x, c.y)))).has(mangoKey);
}

// MEC-004-R10-R12 validate the whole candidate before the family commits any state.
export function candidateValid(s: SimState, b: Balance, cells: readonly Cell[], o: CandidateOpts): boolean {
  const free = (c: Cell) => inBounds(b.board.cols, b.board.rows, c.x, c.y) && !isReserved(s, c.x, c.y);
  return cells.every(c => free(c) && (o.exemptNearHead ||
    !nearHead(s.snake[0]!, s.dir, c.x, c.y, o.nearDist, b.fairness.frontLaneCells)))
    && (o.extraFree ?? []).every(free) && keepsMangoReachable(s, b, o.wallCells);
}
