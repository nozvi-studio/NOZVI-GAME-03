import type { Balance } from '../../src/core/balance';
import { cellBfsWall } from '../../src/core/cells';
import { reachable } from '../../src/core/grid';
import type { SimState } from '../../src/core/types';
import { PERCENT } from './botConfig';

/** P2 design §17: escalate below this share of the board reachable. */
const MIN_REACHABLE_SHARE = 0.4;
/** P2 design §17: escalate when the L26-30 clear rate falls below this fraction of the L21-25 rate. */
const MIN_CLEAR_RATIO = 0.5;
const MIDDLE_PAIR = 2;

export interface BoardSizeResult { level: number; medianReachable: number; boardCells: number; share: number; clearRate: number }

// MEC-004-R20 BFS-reachable cells from the head, excluding the head and walls.
export function reachableFreeCells(s: SimState, b: Balance): number {
  const reach = reachable(b.board.cols, b.board.rows, s.snake[0]!, (x, y) => cellBfsWall(s, x, y));
  return reach.size - 1;
}

export function median(xs: readonly number[]): number {
  const a = [...xs].sort((x, y) => x - y), mid = Math.floor(a.length / MIDDLE_PAIR);
  return a.length % MIDDLE_PAIR ? a[mid]! : (a[mid - 1]! + a[mid]!) / MIDDLE_PAIR;
}

const pct = (x: number) => Math.round(x * PERCENT);

// MEC-004-R20 P2 design §17 board-size verdict.
export function boardSizeVerdict(r25: BoardSizeResult, r30: BoardSizeResult, clear21to25: number, clear26to30: number): { escalate: boolean; reasons: string[] } {
  const reasons: string[] = [];
  for (const r of [r25, r30]) if (r.share < MIN_REACHABLE_SHARE) reasons.push(`L${r.level} median reachable ${pct(r.share)}% < ${pct(MIN_REACHABLE_SHARE)}%`);
  if (clear26to30 < clear21to25 * MIN_CLEAR_RATIO) reasons.push(`L26-30 clear rate ${pct(clear26to30)}% < half of L21-25 (${pct(clear21to25)}%)`);
  return { escalate: reasons.length > 0, reasons };
}
