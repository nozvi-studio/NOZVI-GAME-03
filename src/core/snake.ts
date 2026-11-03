// src/core/snake.ts — MEC-001 (prototype turn L698–706, step L769–799)
import type { Balance } from './balance';
import { cellSolidCause } from './cells';
import { inBounds } from './grid';
import { addProgress, tickMsFor } from './level';
import type { Rng } from './rng';
import type { CauseKey, Cell, MangoState, SimState, Step } from './types';

// MEC-001 queue a turn: compare with the last queued (else current) dir; no reverse, no repeat, max maxQueuedTurns
export function queueTurn(s: SimState, b: Balance, dx: Step, dy: Step): void {
  if (s.status !== 'playing') return;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return;               // not a unit step; no prototype input produces one
  const last = s.queue.length ? s.queue[s.queue.length - 1]! : s.dir;
  if (dx === -last.x && dy === -last.y) return;
  if (dx === last.x && dy === last.y) return;
  if (s.queue.length < b.snake.maxQueuedTurns) s.queue.push({ x: dx, y: dy });
}

// MEC-001 one step: take a queued turn; cause order wall → self → solid cell; move; eat
export function stepSnake(s: SimState, b: Balance, rng: Rng): void {
  const turn = s.queue.shift();
  if (turn) s.dir = turn;
  const head = s.snake[0]!;
  const nx = head.x + s.dir.x, ny = head.y + s.dir.y;
  const eating = s.mango !== null && s.mango.x === nx && s.mango.y === ny;
  const body = eating ? s.snake : s.snake.slice(0, -1);
  const cause: CauseKey | null = !inBounds(b.board.cols, b.board.rows, nx, ny) ? 'wall'
    : body.some(c => c.x === nx && c.y === ny) ? 'self'
    : cellSolidCause(s, nx, ny);
  if (cause) {
    s.status = 'over';
    s.outcome = { won: false, cause };
    s.events.push({ type: 'died', cause, x: head.x, y: head.y });
    return;
  }
  s.headFrom = { ...head };
  s.tailFrom = { ...s.snake[s.snake.length - 1]! };
  s.snake.unshift({ x: nx, y: ny });
  if (eating) eat(s, b, rng); else s.snake.pop();
}

function eat(s: SimState, b: Balance, rng: Rng): void {          // L781–795
  const m = s.mango as MangoState;
  const points = m.golden ? b.mango.points.golden : b.mango.points.normal;
  s.score += points;
  s.eaten += 1;
  s.events.push({ type: 'ate', x: m.x, y: m.y, golden: m.golden, points });
  addProgress(s, b, m.golden ? b.mango.progress.golden : b.mango.progress.normal);
  s.tickMs = tickMsFor(b, s.level);
  s.tailFrom = { ...(s.snake[s.snake.length - 1] as Cell) };
  void rng;          // used by mango placement from Task 4
  s.mango = null;    // Task 4 replaces this line with: if (!placeMango(s, b, rng)) endBoardFull(s);
}
