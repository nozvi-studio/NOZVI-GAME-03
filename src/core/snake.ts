// src/core/snake.ts — MEC-001 (prototype turn L698–706, step L769–799)
import type { Balance } from './balance';
import { deathContext, resolveHeadCell } from './hazards/collision';
import { eatRain } from './skills/mangoRain';
import { inBounds } from './grid';
import { placeMango, goldenEnergy } from './mango';
import { eatOrb } from './energy';
import { rampOnMangoEaten } from './ramp';
import type { Rng } from './rng';
import type { CauseKey, Cell, MangoState, SimState, Step, StepCtx } from './types';
import { checkLevelClear } from './transition';

// MEC-001 queue a turn: compare with the last queued (else current) dir; no reverse, no repeat, max maxQueuedTurns
// Returns true only when the turn was queued (MEC-003-R19 run_end.turns counts these).
export function queueTurn(s: SimState, b: Balance, dx: Step, dy: Step): boolean {
  if (s.status !== 'playing') return false;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return false;         // not a unit step; no prototype input produces one
  const last = s.queue.length ? s.queue[s.queue.length - 1]! : s.dir;
  if (dx === -last.x && dy === -last.y) return false;
  if (dx === last.x && dy === last.y) return false;
  if (s.queue.length >= b.snake.maxQueuedTurns) return false;
  s.queue.push({ x: dx, y: dy });
  return true;
}

// MEC-001 one step: take a queued turn; cause order wall → self → solid cell (Shield, MEC-006-R25); move; eat
export function stepSnake(s: SimState, b: Balance, rng: Rng): void {
  const ctx: StepCtx = { balance: b, snakeOn: (x, y) => s.snake.some(c => c.x === x && c.y === y), emit: e => { s.events.push(e); } };
  const head = s.snake[0]!;
  const context = deathContext(s, head);
  const turn = s.queue.shift();
  if (turn) s.dir = turn;
  const nx = head.x + s.dir.x, ny = head.y + s.dir.y;
  const eating = s.mango !== null && s.mango.x === nx && s.mango.y === ny;
  const body = eating ? s.snake : s.snake.slice(0, -1);
  let cause: CauseKey | null = !inBounds(b.board.cols, b.board.rows, nx, ny) ? 'wall'
    : body.some(c => c.x === nx && c.y === ny) ? 'self'
    : null;
  // MEC-004-R6 only reach the solid/head-hit stage after wall and self checks.
  if (cause === null) {
    const result = resolveHeadCell(s, nx, ny, ctx);
    if (result.kind === 'death') cause = result.cause;
  }
  if (cause) {
    s.status = 'over';
    s.outcome = { won: false, cause };
    s.events.push({ type: 'died', cause, x: head.x, y: head.y, ...(context ? { context } : {}) });
    return;
  }
  s.headFrom = { ...head };
  s.tailFrom = { ...s.snake[s.snake.length - 1]! };
  s.snake.unshift({ x: nx, y: ny });
  if (eating) eat(s, b, rng);
  else if (s.rainMangoes.some(r => r.x === nx && r.y === ny)) eatRain(s, b, ctx, nx, ny);   // MEC-006-R32
  else {
    s.snake.pop();
    eatOrb(s, b, ctx, nx, ny);
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
  // MEC-008-R8 ramp counter runs before the level-clear check (ARCHITECTURE step 12.4).
  rampOnMangoEaten(s, b, ctx);
  // MEC-003-R5/R6 the final clear wins; earlier clears reset length and level up without stopping.
  s.progress += progressGain;
  checkLevelClear(s, b, ctx);
  s.tailFrom = { ...(s.snake[s.snake.length - 1] as Cell) };
  // MEC-002-R8(b) the next regular mango is placed after the chain, so cells freed by the reset are candidates.
  if (s.status === 'playing') placeMango(s, b, rng);
}

// MEC-001-R4 keep the head and followers in order; a reset never grows the snake.
export function resetLength(s: SimState, keep: number): Cell[] {
  return s.snake.splice(keep);
}

// MEC-001-R7 drop tail-end first without crossing the minimum length.
export function cutTail(s: SimState, keep: number, minLength: number): Cell[] {
  return s.snake.splice(Math.max(minLength, keep)).reverse();
}
