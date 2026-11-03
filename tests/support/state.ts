import type { Balance } from '../../src/core/balance';
import { tickMsFor } from '../../src/core/level';
import { initialState } from '../../src/core/sim';
import type { Dir, SimState, Step } from '../../src/core/types';

export const QUIET = Number.MAX_SAFE_INTEGER;   // spawnInMs that keeps the director silent
type P = [number, number];
export interface StateOpts {
  seed?: number; snake?: P[]; dir?: P; mango?: P | null; golden?: boolean; mangoLeftMs?: number;
  rottenRocks?: P[]; level?: number; progress?: number; eaten?: number; score?: number; spawnInMs?: number;
}
const toDir = ([x, y]: P): Dir => ({ x: x as Step, y: y as Step });

export function buildState(b: Balance, o: StateOpts = {}): SimState {
  const s = initialState(b, o.seed ?? 1);
  if (o.snake) {
    s.snake = o.snake.map(([x, y]) => ({ x, y }));
    s.headFrom = { ...s.snake[0]! }; s.tailFrom = { ...s.snake[s.snake.length - 1]! };
  }
  if (o.dir) s.dir = toDir(o.dir);
  if (o.mango) {
    const left = o.mangoLeftMs ?? b.mango.rotBaseMs;
    s.mango = { x: o.mango[0], y: o.mango[1], golden: o.golden ?? false, leftMs: left, totalMs: left };
  }
  if (o.rottenRocks) s.rottenRocks = o.rottenRocks.map(([x, y]) => ({ x, y }));
  if (o.level !== undefined) { s.level = o.level; s.tickMs = tickMsFor(b, o.level); }
  s.progress = o.progress ?? s.progress; s.eaten = o.eaten ?? s.eaten; s.score = o.score ?? s.score;
  s.spawnInMs = o.spawnInMs ?? s.spawnInMs;
  return s;
}
