import type { Balance } from '../balance';
import { inBounds, key } from '../grid';
import { effectiveTick } from '../skills';
import type { Cell, Dir, SimState } from '../types';
import { buildTimeline, type Timeline } from './timeline';

// MEC-004-R20 fixes the search board at 17 x 17; timelines carry their dimensions for validation.
const BOARD_SIZE = 17;
function assertBoardSize(cols: number, rows: number): void {
  if (cols !== BOARD_SIZE || rows !== BOARD_SIZE) throw new RangeError('MEC-004-R20 escape search requires a 17 x 17 board');
}
const DIRS: readonly Dir[] = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
type Node = [x: number, y: number, dir: number, k: number, g: number];
export interface SearchResult {
  reachedHorizon: boolean;
  firstMoveToHorizon: Dir | null;
  firstMoveToGoalSafe: Dir | null;
}

// MEC-004-R18 step 3: no growth or skills; original body cells release as the tail advances.
export function searchTimeline(tl: Timeline, state: SimState, goal?: Cell): SearchResult {
  assertBoardSize(tl.cols, tl.rows);
  const dir = DIRS.findIndex(d => d.x === state.dir.x && d.y === state.dir.y);
  if (dir < 0) throw new RangeError('MEC-004-R18 search requires a unit cardinal direction');
  const result: SearchResult = { reachedHorizon: false, firstMoveToHorizon: null, firstMoveToGoalSafe: null };
  const size = BOARD_SIZE * BOARD_SIZE * DIRS.length * (tl.steps + 1) * 2;
  const visited = new Uint8Array(size), firstMoves = new Uint8Array(size);
  const index = (x: number, y: number, d: number, k: number, g: number) =>
    (((k * BOARD_SIZE + y) * BOARD_SIZE + x) * DIRS.length + d) * 2 + g;
  const head = state.snake[0]!;
  const atGoal = (x: number, y: number) => goal !== undefined && x === goal.x && y === goal.y;
  const root: Node = [head.x, head.y, dir, 0, +atGoal(head.x, head.y)], queue: Node[] = [root];
  visited[index(...root)] = 1;
  // Latest release wins if a fixture contains a repeated cell.
  const release = new Map<number, number>();
  state.snake.forEach((c, i) => {
    const cell = key(BOARD_SIZE, c.x, c.y);
    release.set(cell, Math.max(release.get(cell) ?? 0, state.snake.length - i));
  });
  for (let qi = 0; qi < queue.length; qi++) {
    const [x, y, d, k, g] = queue[qi]!, id = index(x, y, d, k, g);
    if (k === tl.steps) {
      const first = firstMoves[id] ? { ...DIRS[firstMoves[id] - 1]! } : null;
      if (!result.reachedHorizon) { result.reachedHorizon = true; result.firstMoveToHorizon = first; }
      if (g) { result.firstMoveToGoalSafe = first; return result; }
      if (!goal) return result;
      continue;
    }
    const choices = tl.ice[k]!.has(key(BOARD_SIZE, x, y)) ? [d] : [d, (d + 3) % DIRS.length, (d + 1) % DIRS.length];
    for (const nd of choices) {
      const nx = x + DIRS[nd]!.x, ny = y + DIRS[nd]!.y, nk = k + 1, cell = key(BOARD_SIZE, nx, ny);
      if (!inBounds(BOARD_SIZE, BOARD_SIZE, nx, ny) || tl.lethal[nk]!.has(cell) || nk < (release.get(cell) ?? 0)) continue;
      const ng = g || +atGoal(nx, ny), next = index(nx, ny, nd, nk, ng);
      if (visited[next]) continue;
      visited[next] = 1; firstMoves[next] = k === 0 ? nd + 1 : firstMoves[id];
      queue.push([nx, ny, nd, nk, ng]);
    }
  }
  return result;
}

// MEC-004-R18 a director spawn must preserve an existing path through this horizon.
export function escapeExists(balance: Balance, state: SimState): boolean {
  assertBoardSize(balance.board.cols, balance.board.rows);
  // MEC-012-R6 lead ruling: escape horizon intentionally uses the initial head tile.
  const steps = Math.ceil(balance.fairness.escapeHorizonMs / effectiveTick(state, balance));
  return searchTimeline(buildTimeline(balance, state, steps), state).reachedHorizon;
}
