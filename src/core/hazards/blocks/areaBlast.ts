import { inBounds } from '../../grid';
import type { Cell } from '../../types';

// MEC-004-R5 / MEC-017-R2 plus area: centre, +x 1..arm, -x 1..arm, +y 1..arm, -y 1..arm, clipped to the board.
export function plusArea(cx: number, cy: number, arm: number, cols: number, rows: number): Cell[] {
  const cells: Cell[] = [{ x: cx, y: cy }];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
    for (let i = 1; i <= arm; i++) cells.push({ x: cx + dx * i, y: cy + dy * i });
  return cells.filter(c => inBounds(cols, rows, c.x, c.y));
}

/** hit: the blast already hit the head once (MEC-017-R3 at most once per blast). */
export interface BlastState { area: Cell[]; countdownMs: number; activeMs: number; phase: 'count' | 'active' | 'done'; hit?: boolean }

// MEC-004-R5 one 1 ms step: count down, activate once at 0, then stay active for activeMs.
export function stepBlast(b: BlastState): 'activated' | 'keep' | 'done' {
  if (b.phase === 'count') {
    if (--b.countdownMs > 0) return 'keep';
    b.phase = 'active';
    return 'activated';
  }
  if (b.phase === 'active' && --b.activeMs > 0) return 'keep';
  b.phase = 'done';
  return 'done';
}
