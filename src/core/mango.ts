// src/core/mango.ts — MEC-002 (prototype placeFood L381–398, rot L399–406)
import type { Balance } from './balance';
import { cellBfsWall, cellReserved } from './cells';
import { key, nearHead, reachable } from './grid';
import type { Rng } from './rng';
import type { Cell, MangoState, SimState } from './types';

export const rotMsFor = (b: Balance, eaten: number, golden: boolean): number =>
  Math.max(b.mango.rotMinMs, b.mango.rotBaseMs - b.mango.rotPerEatenMs * eaten) * (golden ? b.mango.goldenRotFactor : 1);

const reachSet = (s: SimState, b: Balance): Set<number> =>
  reachable(b.board.cols, b.board.rows, s.snake[0]!, (x, y) => cellBfsWall(s, x, y));
const nearForMango = (s: SimState, b: Balance, x: number, y: number): boolean =>
  nearHead(s.snake[0]!, s.dir, x, y, b.mango.nearHeadDist, b.fairness.frontLaneCells);

// MEC-002 place a mango: clear the old one, prefer reachable cells away from the head; golden rolled after the pick
export function placeMango(s: SimState, b: Balance, rng: Rng): boolean {
  s.mango = null;
  const reach = reachSet(s, b);
  const good: Cell[] = [], any: Cell[] = [];
  for (let y = 0; y < b.board.rows; y++) for (let x = 0; x < b.board.cols; x++) {
    if (cellReserved(s, x, y)) continue;
    any.push({ x, y });
    if (reach.has(key(b.board.cols, x, y)) && !nearForMango(s, b, x, y)) good.push({ x, y });
  }
  const pool = good.length ? good : any;
  if (!pool.length) return false;
  const c = rng.pick(pool);
  const golden = s.eaten >= b.mango.goldenMinEaten && rng.chance(b.mango.goldenChance);
  const total = rotMsFor(b, s.eaten, golden);
  s.mango = { x: c.x, y: c.y, golden, leftMs: total, totalMs: total };
  return true;
}

export function endBoardFull(s: SimState): void {
  s.status = 'over';
  s.outcome = { won: true };
  s.events.push({ type: 'boardFull' });
}

// MEC-002 rot: a fair mango (reachable, not near the head) leaves a permanent rotten rock; always re-place
export function rotMango(s: SimState, b: Balance, rng: Rng): void {
  const m = s.mango as MangoState;
  const fair = reachSet(s, b).has(key(b.board.cols, m.x, m.y)) && !nearForMango(s, b, m.x, m.y);
  if (fair) s.rottenRocks.push({ x: m.x, y: m.y });
  s.events.push({ type: 'rotted', x: m.x, y: m.y, leftRock: fair });
  if (!placeMango(s, b, rng)) endBoardFull(s);
}
