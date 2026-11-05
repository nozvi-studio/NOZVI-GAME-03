// src/core/grid.ts — grid helpers (prototype L314–378). MEC-004
import type { Cell, Dir } from './types';

const NEIGHBORS: readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const key = (cols: number, x: number, y: number): number => y * cols + x;
export const inBounds = (cols: number, rows: number, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < cols && y < rows;

// MEC-004 fairness: Manhattan distance < d, or one of `lane` cells straight ahead along the current dir (L353–358)
export function nearHead(head: Cell, dir: Dir, x: number, y: number, d: number, lane: number): boolean {
  if (Math.abs(head.x - x) + Math.abs(head.y - y) < d) return true;
  for (let i = 1; i <= lane; i++) if (head.x + dir.x * i === x && head.y + dir.y * i === y) return true;
  return false;
}

// MEC-004 BFS from the head over in-bounds cells that are not walls (L363–378). Result is transient, never stored.
export function reachable(cols: number, rows: number, head: Cell, isWall: (x: number, y: number) => boolean): Set<number> {
  const seen = new Set<number>([key(cols, head.x, head.y)]);
  const q: Cell[] = [head];
  for (let qi = 0; qi < q.length; qi++) {
    const p = q[qi] as Cell;
    for (const [dx, dy] of NEIGHBORS) {
      const nx = p.x + dx, ny = p.y + dy, k = key(cols, nx, ny);
      if (!inBounds(cols, rows, nx, ny) || seen.has(k) || isWall(nx, ny)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return seen;
}

// MEC-016-R1 cheapest path cost from `from` to `to`; stepCost(x, y) is the cost of leaving cell (x, y).
// Dijkstra over in-bounds non-wall cells; null when `to` is unreachable. Result is transient, never stored.
export function pathCost(cols: number, rows: number, from: Cell, to: Cell,
  isWall: (x: number, y: number) => boolean, stepCost: (x: number, y: number) => number): number | null {
  const n = cols * rows, dist = new Array<number>(n).fill(Infinity), done = new Array<boolean>(n).fill(false);
  dist[key(cols, from.x, from.y)] = 0;
  const target = key(cols, to.x, to.y);
  for (;;) {
    let k = -1;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i]! < Infinity && (k < 0 || dist[i]! < dist[k]!)) k = i;
    if (k < 0) return null;
    if (k === target) return dist[k]!;
    done[k] = true;
    const x = k % cols, y = (k - x) / cols, d = dist[k]! + stepCost(x, y);
    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(cols, rows, nx, ny) || isWall(nx, ny)) continue;
      const nk = key(cols, nx, ny);
      if (d < dist[nk]!) dist[nk] = d;
    }
  }
}

// MEC-016-R1 BFS step count from `from` to `to`; null when unreachable.
export function bfsDistance(cols: number, rows: number, from: Cell, to: Cell, isWall: (x: number, y: number) => boolean): number | null {
  return pathCost(cols, rows, from, to, isWall, () => 1);
}
