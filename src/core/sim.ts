// src/core/sim.ts — Sim factory, 1 ms step and snapshot (design §4; prototype frame L996–1007, reset L626–644)
import type { Balance, Pair } from './balance';
import { needFor, tickMsFor } from './level';
import { rngFrom, seedRng, type Rng } from './rng';
import { queueTurn, stepSnake } from './snake';
import type { Dir, Sim, SimSnapshot, SimState, Step } from './types';

const toDir = ([x, y]: Pair): Dir => ({ x: x as Step, y: y as Step });
const states = new WeakMap<Sim, SimState>();

export function initialState(b: Balance, seed: number): SimState {
  const snake = b.snake.start.map(([x, y]) => ({ x, y }));
  return {
    snake, dir: toDir(b.snake.startDir), queue: [],
    headFrom: { ...snake[0]! }, tailFrom: { ...snake[snake.length - 1]! },
    acc: 0, tickMs: tickMsFor(b, 0), mango: null, rottenRocks: [], hazards: [], terrains: [],
    spawnInMs: b.director.firstSpawnMs, mazeCooldownMs: 0, score: 0, eaten: 0, level: 0, progress: 0,
    status: 'playing', outcome: null, events: [], rng: seedRng(seed),
  };
}

// One 1 ms step in prototype frame() order (L997–1004). Director/hazards are added in Task 5, rot in Task 4.
function stepMs(s: SimState, b: Balance, rng: Rng): void {
  s.acc += 1;
  s.tickMs = tickMsFor(b, s.level);
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

export function createSim(b: Balance, seed: number): Sim { return wrap(b, initialState(b, seed)); }
/** Independent Sim from a state (deep copy). Used by clone(), tests and tools. */
export function restoreSim(b: Balance, state: SimState): Sim { return wrap(b, structuredClone(state)); }
/** Live state of a Sim. Tests and tools only; never mutate from the game layer. */
export function stateOf(sim: Sim): SimState {
  const s = states.get(sim);
  if (!s) throw new Error('stateOf: not a core Sim');
  return s;
}
