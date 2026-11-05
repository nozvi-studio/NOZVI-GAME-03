// src/core/sim.ts — Sim factory, 1 ms step and snapshot (design §4; prototype frame L996–1007, reset L626–644)
import { timedHazards } from './hazards/timed';
import type { Balance, Pair } from './balance';
import { snakeOn } from './cells';
import { spawnCtx, updateDirector } from './hazards/director';
import type { InternalOptions } from './simInternal';
import { stepHazards } from './hazards/registry';
import { tileAt } from './hazards/queries';
import { applyHeadHit } from './hazards/collision';
import { biome, isChallenge, needFor, levelTickMs } from './level';
import { orbTick } from './energy';
import { effectiveTick, SKILLS, skillTimers, slotCount, unlockedSkills, useSkill } from './skills';
import { placeMango, mangoTick } from './mango';
import { levelUpSlowTick } from './slowdown';
import { rainTick } from './skills/mangoRain';
import { rngFrom, seedRng, type Rng } from './rng';
import { queueTurn, stepSnake } from './snake';
import type { Dir, HitCtx, Sim, SimSnapshot, SimState, SimOptions, Step, StepCtx } from './types';

const toDir = ([x, y]: Pair): Dir => ({ x: x as Step, y: y as Step });
const states = new WeakMap<Sim, SimState>();

// MEC-003 section 7 / MEC-006-R1 / MEC-007-R11 validate run options and copy the loadout.
export function initialState(b: Balance, seed: number, options: SimOptions = {}): SimState {
  const level = options.startLevel ?? 1;
  if (!Number.isInteger(level) || level < 1 || level > b.level.maxLevel) throw new RangeError('startLevel must be an integer 1..' + b.level.maxLevel);
  const energy = options.startEnergy ?? 0;
  if (!Number.isInteger(energy) || energy < 0 || energy > b.energy.max) throw new RangeError('startEnergy must be an integer 0..' + b.energy.max);
  const bestLevel = options.bestLevel === undefined ? 1 : options.bestLevel;
  if (!Number.isInteger(bestLevel) || bestLevel < 1 || bestLevel > b.level.maxLevel) throw new RangeError('bestLevel must be an integer 1..' + b.level.maxLevel);
  const loadout = options.loadout === undefined ? [null, null] as const : options.loadout;
  const unlocked = unlockedSkills(b, bestLevel);
  if (!Array.isArray(loadout) || loadout.length !== 2
    || [loadout[0], loadout[1]].some(id => id !== null && !unlocked.includes(id))
    || (loadout[0] !== null && loadout[0] === loadout[1])
    || (slotCount(b, bestLevel) === 1 && loadout[1] !== null)) {
    throw new RangeError('loadout must have two slots, unique unlocked skill ids or null, and an empty locked slot');
  }
  const snake = b.snake.start.map(([x, y]) => ({ x, y }));
  return {
    snake, dir: toDir(b.snake.startDir), queue: [],
    headFrom: { ...snake[0]! }, tailFrom: { ...snake[snake.length - 1]! },
    acc: 0, tickMs: levelTickMs(b, 1), mango: null,
    families: { rock: [], fence: [], maze: [], terrain: [], rottenRock: [], snipWall: [], rubble: [] }, nextHazardSeq: 0,
    energy, orbs: [], orbSpawnMs: 0, rampActive: true, rampEaten: 0,
    bestLevel, loadout: [loadout[0], loadout[1]], slowmo: null, levelUpSlow: null,
    shield: null, rain: null, rainMangoes: [], rainBudgets: [], nextCastId: 1,
    spawnInMs: b.director.firstSpawnMs, mazeCooldownMs: 0, score: 0, eatenInRun: 0, retryMs: 0, level, progress: 0,
    levelTimeMs: 0, timeMs: 0,
    startLevel: level, levelsCleared: 0, eatenInLevel: 0,
    status: 'playing', outcome: null, events: [], rng: seedRng(seed),
  };
}

// MEC-004 one 1 ms step in prototype frame() order (L997-1004).
function stepMs(s: SimState, b: Balance, rng: Rng, internal: InternalOptions): void {
  s.timeMs += 1;
  const ignoreOutcomes = internal.freezeSnake && internal.ignoreOutcomes;
  const ctx: StepCtx & HitCtx = { balance: b, snakeOn: (x, y) => snakeOn(s, x, y), emit: e => { s.events.push(e); },
    hitHead: (f, x, y, kind, dir) => { if (!ignoreOutcomes) applyHeadHit(s, ctx, f, x, y, kind, dir); },
  };
  s.levelTimeMs += 1;
  if (internal.directorEnabled !== false) {
    updateDirector(s, b, rng, internal.observer ? { ...spawnCtx(s, b), observer: internal.observer } : undefined);
  }
  stepHazards(s, ctx);
  if (s.status === 'over') {
    if (!ignoreOutcomes) return; // MEC-004-R8 normal death ends this millisecond before timers and movement.
    s.status = 'playing'; s.outcome = null;
  }
  skillTimers(s, b, ctx);
  // MEC-003-R22 step 7a: the slowdown eases before the speed is computed.
  levelUpSlowTick(s);
  // MEC-006-R18 preserve negative bonk pauses and permit at most one immediate move.
  const eff = effectiveTick(s, b);
  if (eff !== s.tickMs) { s.acc = Math.min(s.acc, eff); s.tickMs = eff; }
  mangoTick(s, b, ctx);
  orbTick(s, b, ctx);
  rainTick(s, b, ctx);
  s.acc += 1;
  if (s.acc >= s.tickMs) {
    s.acc -= s.tickMs;
    if (!internal.freezeSnake) stepSnake(s, b, rng);
  }
}

function snapshotOf(s: SimState, b: Balance): SimSnapshot {
  // MEC-004-R17 projects only snapshot-owned data: per-ms fuzz must not clone pending events/internal state.
  return {
    // MEC-012 section 7 tile families populate the tile views when registered.
    tiles: [], headTile: tileAt(s, s.snake[0]!.x, s.snake[0]!.y),
    skills: s.loadout.map((id, slot) => ({ slot: slot as 0 | 1, id, cost: id === null ? 0 : b.skills[id].cost,
      affordable: id !== null && s.energy >= b.skills[id].cost,
      active: id !== null && SKILLS[id].active(s), leftMs: id === null ? 0 : SKILLS[id].leftMs(s) })),
    slowmo: s.slowmo && { ...s.slowmo }, levelUpSlow: s.levelUpSlow && { ...s.levelUpSlow }, shield: s.shield && { ...s.shield },
    rubble: s.families.rubble.map(({ x, y, state, leftMs }) => ({ x, y, state, leftMs })),
    rain: s.rain && { leftMs: s.rain.leftMs, dropsLeft: s.rain.drops - s.rain.dropped },
    rainMangoes: s.rainMangoes.map(({ x, y, ageMs }) => ({ x, y, leftMs: b.skills.mangoRain.mangoLifeMs - ageMs })),
    snipWall: s.families.snipWall.flatMap(w => w.cells.map(c => ({ ...c, state: w.state, leftMs: w.leftMs }))),
    energy: s.energy, energyMax: b.energy.max,
    orbs: s.orbs.map(({ x, y, ageMs }) => ({ x, y, leftMs: b.energy.orbLifeMs - ageMs })),
    rampActive: s.rampActive, rampMangoesLeft: s.rampActive ? Math.max(0, b.checkpoints.rampMangoes - s.rampEaten) : 0,
    snake: s.snake.map(cell => ({ ...cell })), dir: { ...s.dir }, heading: { ...(s.queue.length ? s.queue[s.queue.length - 1]! : s.dir) },
    headFrom: { ...s.headFrom }, tailFrom: { ...s.tailFrom },
    tickAlpha: s.status === 'over' ? 1 : Math.max(0, Math.min(1, s.acc / s.tickMs)),
    mango: s.mango && { ...s.mango, ageMs: s.mango.totalMs - s.mango.leftMs },
    rottenRocks: s.families.rottenRock.map(({ x, y, state, leftMs }) => ({ x, y, state, leftMs })),
    eatenInLevel: s.eatenInLevel, eatenInRun: s.eatenInRun,
    hazards: timedHazards(s).map(h => ({
      type: h.family, state: h.state, t: h.t, warnMs: h.warnMs, lifeMs: h.lifeMs, cells: h.cells.map(cell => ({ ...cell })),
      ...(h.kind ? { kind: h.kind } : {}),
    })),
    terrains: s.families.terrain.map(t => ({ t: t.t, lifeMs: t.lifeMs, cells: t.cells.map(({ x, y, vis, delay }) => ({ x, y, vis, delay })) })),
    score: s.score, level: s.level, progress: s.progress, need: needFor(b, s.level), tickMs: s.tickMs,
    biome: biome(b, s.level), challenge: isChallenge(b, s.level),
    levelTimeMs: s.levelTimeMs, timeMs: s.timeMs,
    startLevel: s.startLevel, levelsCleared: s.levelsCleared,
    length: s.snake.length, minLength: b.skills.tailSnip.minLength,
    status: s.status, outcome: s.outcome && { ...s.outcome },
  };
}

function wrap(b: Balance, s: SimState, internal: InternalOptions = {}): Sim {
  const rng = rngFrom(s.rng);
  const sim: Sim = {
    useSkill: slot => useSkill(s, b, { balance: b, snakeOn: (x, y) => snakeOn(s, x, y), emit: e => { s.events.push(e); } }, slot),
    turn: (dx, dy) => queueTurn(s, b, dx, dy),
    advance: ms => {
      if (!Number.isInteger(ms) || ms < 0) throw new RangeError(`advance(ms): non-negative integer expected, got ${ms}`);
      // MEC-004-R18 terminal outcomes of the stationary reference head do not stop its timeline.
      const ignoreOutcomes = internal.freezeSnake && internal.ignoreOutcomes;
      if (ignoreOutcomes) { s.status = 'playing'; s.outcome = null; }
      for (let i = 0; i < ms && s.status === 'playing'; i++) {
        stepMs(s, b, rng, internal);
        if (ignoreOutcomes) { s.status = 'playing'; s.outcome = null; }
      }
    },
    drainEvents: () => s.events.splice(0),
    snapshot: () => snapshotOf(s, b),
    clone: () => restoreSim(b, s, internal),
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
export function restoreSim(b: Balance, state: SimState, internal?: InternalOptions): Sim { return wrap(b, structuredClone(state), internal); }
/** Live state of a Sim. Tests and tools only; never mutate from the game layer. */
export function stateOf(sim: Sim): Readonly<SimState> {
  const s = states.get(sim);
  if (!s) throw new Error('stateOf: not a core Sim');
  return s;
}

// MEC-003-R7 plain-data snapshots for deterministic test/tool round trips (internal).
export function exportState(sim: Sim): SimState { return structuredClone(stateOf(sim)); }
export function simFromState(b: Balance, s: SimState): Sim { return restoreSim(b, s); }
