// src/core/sim.ts — Sim factory, 1 ms step and snapshot (design §4; prototype frame L996–1007, reset L626–644)
import type { Balance, Pair } from './balance';
import { snakeOn } from './cells';
import { updateDirector } from './hazards/director';
import { stepHazards } from './hazards/registry';
import { needFor, tickMsFor } from './level';
import { placeMango, rotMango } from './mango';
import { rngFrom, seedRng, type Rng } from './rng';
import { queueTurn, stepSnake } from './snake';
import type { Dir, Sim, SimSnapshot, SimState, SimOptions, Step } from './types';

const toDir = ([x, y]: Pair): Dir => ({ x: x as Step, y: y as Step });
const states = new WeakMap<Sim, SimState>();

// MEC-003 section 7 validates the 1-based start level; other options arrive in later tasks.
export function initialState(b: Balance, seed: number, options: SimOptions = {}): SimState {
  const level = options.startLevel ?? 1;
  if (!Number.isInteger(level) || level < 1 || level > b.level.maxLevel) throw new RangeError('startLevel must be an integer 1..' + b.level.maxLevel);
  const snake = b.snake.start.map(([x, y]) => ({ x, y }));
  return {
    snake, dir: toDir(b.snake.startDir), queue: [],
    headFrom: { ...snake[0]! }, tailFrom: { ...snake[snake.length - 1]! },
    acc: 0, tickMs: tickMsFor(b, level), mango: null, rottenRocks: [], hazards: [], terrains: [],
    spawnInMs: b.director.firstSpawnMs, mazeCooldownMs: 0, score: 0, eaten: 0, level, progress: 0,
    status: 'playing', outcome: null, events: [], rng: seedRng(seed),
  };
}

// MEC-004 one 1 ms step in prototype frame() order (L997-1004).
function stepMs(s: SimState, b: Balance, rng: Rng): void {
  s.acc += 1;
  updateDirector(s, b, rng);
  stepHazards(s, { balance: b, snakeOn: (x, y) => snakeOn(s, x, y), emit: e => { s.events.push(e); } });
  s.tickMs = tickMsFor(b, s.level);
  if (s.mango) { s.mango.leftMs -= 1; if (s.mango.leftMs <= 0) rotMango(s, b, rng); }
  if (s.status === 'playing' && s.acc >= s.tickMs) { s.acc -= s.tickMs; stepSnake(s, b, rng); }
}

function snapshotOf(s: SimState, b: Balance): SimSnapshot {
  const c = structuredClone(s);
  return {
    snake: c.snake, dir: c.dir, heading: c.queue.length ? c.queue[c.queue.length - 1]! : { ...c.dir },
    headFrom: c.headFrom, tailFrom: c.tailFrom,
    tickAlpha: s.status === 'over' ? 1 : Math.min(1, s.acc / s.tickMs),
    mango: c.mango && { ...c.mango, ageMs: c.mango.totalMs - c.mango.leftMs },
    rottenRocks: c.rottenRocks,
    hazards: c.hazards.map(h => ({
      type: h.family, state: h.state, t: h.t, warnMs: h.warnMs, lifeMs: h.lifeMs, cells: h.cells,
      ...(h.kind ? { kind: h.kind } : {}),
    })),
    terrains: c.terrains.map(t => ({ t: t.t, lifeMs: t.lifeMs, cells: t.cells.map(({ x, y, vis, delay }) => ({ x, y, vis, delay })) })),
    score: s.score, level: s.level, progress: s.progress, need: needFor(b, s.level), tickMs: s.tickMs,
    status: s.status, outcome: c.outcome,
  };
}

function wrap(b: Balance, s: SimState): Sim {
  const rng = rngFrom(s.rng);
  const sim: Sim = {
    turn: (dx, dy) => queueTurn(s, b, dx, dy),
    advance: ms => {
      if (!Number.isInteger(ms) || ms < 0) throw new RangeError(`advance(ms): non-negative integer expected, got ${ms}`);
      for (let i = 0; i < ms && s.status === 'playing'; i++) stepMs(s, b, rng);
    },
    drainEvents: () => s.events.splice(0),
    snapshot: () => snapshotOf(s, b),
    clone: () => restoreSim(b, s),
  };
  states.set(sim, s);
  return sim;
}

export function createSim(b: Balance, seed: number, options?: SimOptions): Sim {
  const s = initialState(b, seed, options);
  placeMango(s, b, rngFrom(s.rng));            // reset() places the first mango (L637)
  return wrap(b, s);
}
/** Independent Sim from a state (deep copy). Used by clone(), tests and tools. */
export function restoreSim(b: Balance, state: SimState): Sim { return wrap(b, structuredClone(state)); }
/** Live state of a Sim. Tests and tools only; never mutate from the game layer. */
export function stateOf(sim: Sim): SimState {
  const s = states.get(sim);
  if (!s) throw new Error('stateOf: not a core Sim');
  return s;
}
