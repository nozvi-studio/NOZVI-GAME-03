// src/core/snake.ts — MEC-001 (prototype turn L698–706, step L769–799)
import type { Balance } from './balance';
import { cellSolidCause } from './cells';
import { inBounds } from './grid';
import { quota } from './level';
import { placeMango, goldenEnergy } from './mango';
import { eatOrb } from './energy';
import { rampOnMangoEaten } from './ramp';
import type { Rng } from './rng';
import type { CauseKey, Cell, MangoState, SimState, Step } from './types';
import { startLevelUp } from './transition';

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
  if (eating) eat(s, b, rng); else {
    s.snake.pop();
    eatOrb(s, b, { balance: b, snakeOn: (x, y) => s.snake.some(c => c.x === x && c.y === y), emit: e => { s.events.push(e); } }, nx, ny);
  }
}

// MEC-002-R3/R8 count regular mangoes before level reset and replacement.
function eat(s: SimState, b: Balance, rng: Rng): void {
  const ctx = { balance: b, snakeOn: (x: number, y: number) => s.snake.some(c => c.x === x && c.y === y),
    emit: (e: SimState['events'][number]) => { s.events.push(e); } };
  const m = s.mango as MangoState;
  const points = m.golden ? b.mango.points.golden : b.mango.points.normal;
  s.score += points;
  s.eatenInRun += 1; s.eatenInLevel += 1;
  const progressGain = m.golden ? b.mango.progress.golden : b.mango.progress.normal;
  s.events.push({ type: 'ate', x: m.x, y: m.y, golden: m.golden, points, progressGain, source: 'mango' });
  if (m.golden) goldenEnergy(s, b, ctx);
  // MEC-003-R5/R6 the final clear wins; earlier clears reset length and start transition.
  s.progress += progressGain;
  if (s.progress >= quota(b, s.level)) {
    if (s.level === b.level.maxLevel) {
      s.mango = null;
      s.levelsCleared = b.level.maxLevel; s.status = 'over'; s.outcome = { won: true };
      s.events.push({ type: 'runWon', score: s.score, timeMs: s.timeMs });
    } else startLevelUp(s, b, ctx, true);
  }
  rampOnMangoEaten(s, b, ctx);
  s.tailFrom = { ...(s.snake[s.snake.length - 1] as Cell) };
  if (s.status === 'playing' && s.phase === 'playing') placeMango(s, b, rng);
}

// MEC-001-R4 keep the head and followers in order; a reset never grows the snake.
export function resetLength(s: SimState, keep: number): Cell[] {
  return s.snake.splice(keep);
}

// MEC-001-R7 drop tail-end first without crossing the minimum length.
export function cutTail(s: SimState, keep: number, minLength: number): Cell[] {
  return s.snake.splice(Math.max(minLength, keep)).reverse();
}
