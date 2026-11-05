import type { Balance } from '../../src/core/balance';
import { escapeExists } from '../../src/core/fairness/escape';
import { inBounds, key, nearHead } from '../../src/core/grid';
import { keepsMangoReachable, reachableFrom } from '../../src/core/hazards/placement';
import { bfsWall, reservedByFamilies, solidCauseAt } from '../../src/core/hazards/queries';
import { FAMILIES, FAMILY } from '../../src/core/hazards/registry';
import { birdCanTarget } from '../../src/core/hazards/bird';
import { isReserved } from '../../src/core/reserved';
import { rngFrom, seedRng } from '../../src/core/rng';
import { createSim } from '../../src/core/sim';
import { createSimInternal, stateOf } from '../../src/core/simInternal';
import type { Cell, CauseKey, Dir, FamilyKey, Sim, SimEvent, SimSnapshot, SimState } from '../../src/core/types';
import { loadBalance, soloTable } from './balance';
import { checkMoverTransitions, moverCells } from './fuzz';

export interface FuzzConfig {
  family: FamilyKey; mode: 'solo' | 'full'; startLevel: number; seeds: number; durationMs: number;
  escape: 'off' | 'sample' | 'all';
}
type Phase = 'warn' | 'lethal' | 'active';
interface Mark { family: string; cell: number; phase: Phase; cause: CauseKey | null }
interface Input { t: number; dir: Dir }
const DIRS: readonly Dir[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
const INPUT_SEED_OFFSET = 1000003, TURN_INTERVAL_MS = 100, TURN_CHANCE = 0.35, REPLAY_CHUNK_MS = 37, SAMPLE_SPAWNS = 3;
const RERUN_SEED_OFFSET = 1000033;
/** MEC-017-R3 the blast area is head-only (body is safe), so it is exempt from I1 but keeps I3 and I6. */
const BOMB_AREA = 'bombArea';
/** MEC-004-R17 every modifier family must name its own spawn invariant; a missing entry is a violation, not a skip. */
export const MODIFIER_INVARIANTS: Partial<Record<FamilyKey, { holds: (before: SimState, b: Balance) => boolean; fail: string }>> = {
  bird: { holds: birdCanTarget, fail: 'MEC-016-R1 bird target was not reachable in time at spawn' },
};

// MEC-004-R17 modifiers place no cells, so I1-I5/R18 are replaced by the family's own invariant.
export function checkModifierSpawn(family: FamilyKey, before: SimState, b: Balance, bad: (m: string) => void,
  invariants = MODIFIER_INVARIANTS): void {
  const invariant = invariants[family];
  if (!invariant) bad(`modifier ${family} has no invariant`);
  else if (!invariant.holds(before, b)) bad(invariant.fail);
}

function cellsOf(snap: SimSnapshot, cols: number, showMs: number): Map<string, Mark> {
  const marks = new Map<string, Mark>();
  const add = (family: string, c: Cell, phase: Phase, cause: CauseKey | null) => {
    const cell = key(cols, c.x, c.y);
    marks.set(family + ':' + cell, { family, cell, phase, cause });
  };
  for (const h of snap.hazards) for (const c of h.cells) {
    if (c.on) add(h.type, c, 'lethal', h.type);
    else if (h.state === 'warn' || h.state === 'solid') add(h.type, c, 'warn', h.type);
  }
  for (const t of snap.terrains) for (const c of t.cells) {
    if (c.vis === 'up') add('terrain', c, 'lethal', 'ground');
    else if (c.vis === 'warn') add('terrain', c, 'warn', 'ground');
  }
  // MEC-014-R2/R3/R4 fence landing and repeated gate warnings are both observable.
  for (const g of snap.families.gate) {
    for (const c of g.fence) {
      if (c.on) add('gate', c, 'lethal', 'fence');
      else if (g.state !== 'crumble') add('gate', c, 'warn', 'fence');
    }
    for (const c of g.gate) {
      if (c.vis === 'up') add('gate', c, 'lethal', 'gate');
      else if (c.vis === 'warn') add('gate', c, 'warn', 'gate');
    }
  }
  // MEC-014-R6 down spots are the initial show warning; later rises use the beat warning.
  for (const g of snap.families.spike) for (const c of g.cells) {
    if (c.vis === 'up') add('spike', c, 'lethal', 'spike');
    else if (c.vis === 'warn' || g.t < showMs) add('spike', c, 'warn', 'spike');
  }
  for (const c of snap.rottenRocks) if (c.state === 'solid') add('rottenRock', c, 'lethal', 'rotten');
  // MEC-017-R1..R3 blast extraction: the bomb cell warns then is solid; the area warns while counting, then is lethal.
  for (const m of snap.families.bomb) {
    if (m.state !== 'active') add('bomb', m, m.state === 'count' ? 'lethal' : 'warn', 'bomb');
    if (m.state !== 'warn') for (const c of m.area) add(BOMB_AREA, c, m.state === 'active' ? 'lethal' : 'warn', 'bomb');
  }
  // MEC-018-R3 ring cells warn (also while waiting under the snake) until they close.
  const ring = snap.families.shrink;
  if (ring) for (const c of ring.cells) {
    if (c.on) add('shrink', c, 'lethal', 'shrink');
    else if (ring.state !== 'fade') add('shrink', c, 'warn', 'shrink');
  }
  for (const tile of snap.tiles) for (const c of tile.cells) {
    if (c.on) add(tile.family, c, 'active', null);
    else if (tile.state !== 'fade') add(tile.family, c, 'warn', null);
  }
  return marks;
}

function replay(sim: Sim, inputs: readonly Input[], until: number): void {
  let now = 0;
  const advance = (to: number) => {
    while (now < to) { const step = Math.min(REPLAY_CHUNK_MS, to - now); sim.advance(step); now += step; }
  };
  for (const input of inputs) {
    advance(input.t); sim.turn(input.dir.x, input.dir.y);
  }
  advance(until);
}

// MEC-004-R17 I1/I3 use the pre-movement snake and uninterrupted, per-family warning intervals.
function checkTransitions(previous: Map<string, Mark>, current: Map<string, Mark>, warnSince: Map<string, number>,
  snake: ReadonlySet<number>, time: number, minWarnMs: number, bad: (m: string) => void): void {
  for (const id of warnSince.keys()) if (!current.has(id)) warnSince.delete(id);
  for (const [id, mark] of current) {
    const old = previous.get(id);
    if (mark.phase === 'warn') {
      if (old?.phase !== 'warn') warnSince.set(id, time);
      continue;
    }
    if (old?.phase === mark.phase) continue;
    if (mark.family !== BOMB_AREA && snake.has(mark.cell)) bad(`I1 ${id} became ${mark.phase} on the snake`);
    if (mark.family !== 'rottenRock' && (old?.phase !== 'warn' || time - (warnSince.get(id) ?? time) < minWarnMs))
      bad(`I3 ${id} became ${mark.phase} without ${minWarnMs} ms continuous warning`);
    warnSince.delete(id);
  }
}

// MEC-004-R17 I6: snake-step events name the old head; update-time events name the hit cell.
function checkDeath(e: Extract<SimEvent, { type: 'died' }>, previous: Map<string, Mark>, snap: SimSnapshot,
  cols: number, snakeStep: boolean, bad: (m: string) => void): void {
  if (!FAMILIES.some(f => f.cause === e.cause && f.capClass !== 'none')
    && e.cause !== 'rotten' && e.cause !== 'chicken') return;
  const cell = snakeStep ? key(cols, e.x + snap.dir.x, e.y + snap.dir.y) : key(cols, e.x, e.y);
  // MEC-013-R5 MEC-015-R7 update-time movers enter this ms; snake entry uses the previous cell and variant.
  const moverFamily = e.cause === 'coconut' ? 'coconut' : e.cause === 'cat' || e.cause === 'chicken' ? 'npc' : null;
  if (moverFamily && (snakeStep ? previous.get(moverFamily + ':' + cell)?.cause === e.cause
    : moverCells(snap, cols).some(m => m.family === moverFamily && m.cause === e.cause
      && m.phase === 'mover' && m.cell === cell))) return;
  if (![...previous.values()].some(m => m.phase === 'lethal' && m.cause === e.cause && m.cell === cell))
    bad(`I6 death by ${e.cause} at (${e.x},${e.y}) had no matching lethal cell in the previous ms`);
}

// MEC-012-R10/EC10 check the reserved exit ring and mud separation on every simulation ms.
function checkIce(s: SimState, b: Balance, bad: (m: string) => void): void {
  const same = (a: Cell, c: Cell) => a.x === c.x && a.y === c.y;
  for (const patch of s.families.ice.patches) {
    if (patch.state === 'warn' || patch.state === 'active') for (const c of patch.ring ?? []) {
      if (!inBounds(b.board.cols, b.board.rows, c.x, c.y) || solidCauseAt(s, c.x, c.y) !== null
        || (s.mango !== null && same(s.mango, c)) || s.orbs.some(o => same(o, c)) || s.rainMangoes.some(m => same(m, c)))
        bad(`MEC-012-R10 unsafe ice exit (${c.x},${c.y})`);
    }
    for (const mud of s.families.mud.patches) for (const m of mud.cells) for (const i of patch.cells) {
      if (Math.abs(m.x - i.x) + Math.abs(m.y - i.y) <= 1) bad('MEC-012-EC10 mud touches ice');
    }
  }
}

// MEC-004-R17 natural runs (no freeze or level resets) with independent seeded inputs and I7 replay.
export function runFamilyFuzz(c: FuzzConfig): string[] {
  const shipped = loadBalance(), b = c.mode === 'solo' ? soloTable(shipped, c.family) : shipped;
  const violations: string[] = [];
  for (let seed = 1; seed <= c.seeds; seed++) runSeed(c, b, seed, violations);
  return violations;
}

function runSeed(c: FuzzConfig, b: Balance, seed: number, violations: string[]): void {
  const inputRng = rngFrom(seedRng(seed + INPUT_SEED_OFFSET));
  const bad = (m: string) => { violations.push(`${c.family}/${c.mode}/L${c.startLevel} seed=${seed} t=${time}: ${m}`); };
  const { cols } = b.board;
  let time = 0, spawns = 0, run = 0;
  while (time < c.durationMs) {
    const inputs: Input[] = [], start = time, simulationSeed = seed + run++ * RERUN_SEED_OFFSET;
    const sim = createSimInternal(b, simulationSeed, { startLevel: c.startLevel }, { observer: {
      spawned(family, cells, before, after) {
        spawns++;
        // MEC-004 / MEC-016 modifiers place no cells: skip I1-I3/I5 and check the family invariant instead.
        if (FAMILY[family]?.capClass === 'modifier') { checkModifierSpawn(family, before, b, bad); return; }
        const d = family === 'terrain' ? b.fairness.terrainNearHeadDist : b.fairness.nearHeadDist;
        for (const cell of cells) {
          const head = before.snake[0]!;
          // MEC-013-R1 TR-B3 replaces Manhattan proximity with head row/column and front-lane exclusion.
          const rowLane = cells.every(c => c.y === cells[0]!.y);
          const tooNear = family === 'coconut' ? (rowLane ? cell.y === head.y : cell.x === head.x)
            || nearHead(head, before.dir, cell.x, cell.y, 0, b.fairness.frontLaneCells)
            : nearHead(head, before.dir, cell.x, cell.y, d, b.fairness.frontLaneCells);
          // MEC-018-R3 TR-C3 the ring waits to close instead of excluding cells near the head; I1 covers its closing.
          if (tooNear && family !== 'shrink') bad(`I2 ${family} near head at (${cell.x},${cell.y})`);
          // MEC-013-EC1/R7 existing food does not prevent the warning lane; hazards and body still do.
          const placementState = family === 'coconut' ? { ...before, mango: null, orbs: [], rainMangoes: [] } : before;
          // MEC-018-R6/R7 the ring displaces food and may span the snake; only other hazards may not hold a ring cell.
          if (family === 'shrink' ? reservedByFamilies(before, cell.x, cell.y) : isReserved(placementState, cell.x, cell.y)) bad(`I5 ${family} on reserved cell (${cell.x},${cell.y})`);
        }
        const walls = cells.filter(cell => bfsWall(after, cell.x, cell.y));
        const mango = before.mango, mangoKey = mango && key(cols, mango.x, mango.y);
        if (!keepsMangoReachable(before, b, walls) || (mangoKey !== null && reachableFrom(before, b).has(mangoKey)
          && !reachableFrom(after, b).has(mangoKey))) bad(`I4 ${family} cut off the mango`);
        if ((c.escape === 'all' || (c.escape === 'sample' && spawns <= SAMPLE_SPAWNS))
          && escapeExists(b, before) && !escapeExists(b, after)) bad(`R18 ${family} removed every escape`);
      },
    } });
    let snap = sim.snapshot(), marks = cellsOf(snap, cols, b.spike.showMs);
    let movers = moverCells(snap, cols);
    const moverWarnSince = new Map<string, number>();
    const warnSince = new Map<string, number>();
    const minWarnMs = Math.max(b.fairness.minWarnMs, b.fairness.minWarnTicks * b.speed.startMs);
    while (time < c.durationMs && snap.status === 'playing') {
      if (time % TURN_INTERVAL_MS === 0 && inputRng.chance(TURN_CHANCE)) {
        const dir = inputRng.pick(DIRS);
        inputs.push({ t: time - start, dir }); sim.turn(dir.x, dir.y);
      }
      const snake = new Set(snap.snake.map(cell => key(cols, cell.x, cell.y)));
      const body = new Set(snap.snake.slice(1).map(cell => key(cols, cell.x, cell.y)));
      const accBefore = stateOf(sim).acc;
      sim.advance(1); time++;
      snap = sim.snapshot();
      checkIce(stateOf(sim), b, bad);
      const current = cellsOf(snap, cols, b.spike.showMs);
      const currentMovers = moverCells(snap, cols);
      checkMoverTransitions(movers, currentMovers, moverWarnSince, body, time, bad);
      checkTransitions(marks, current, warnSince, snake, time, minWarnMs, bad);
      // Without skill casts, update-time death leaves acc untouched; a fatal snake step consumes its tick.
      for (const m of movers) if (m.phase === 'mover') marks.set(m.family + ':' + m.cell,
        { family: m.family, cell: m.cell, phase: 'lethal', cause: m.cause });
      // MEC-017-R3 the blast kills on its activation ms (update time or the same ms's snake step).
      for (const [id, m] of current) if (m.family === BOMB_AREA && m.phase === 'lethal') marks.set(id, m);
      for (const e of sim.drainEvents()) if (e.type === 'died') checkDeath(e, marks, snap, cols, stateOf(sim).acc !== accBefore, bad);
      marks = current;
      movers = currentMovers;
    }
    const other = createSim(b, simulationSeed, { startLevel: c.startLevel });
    replay(other, inputs, time - start);
    if (JSON.stringify(other.snapshot()) !== JSON.stringify(snap)) bad('I7 advance chunks 1 and 37 differ');
  }
}
