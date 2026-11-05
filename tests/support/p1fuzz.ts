// tests/support/p1fuzz.ts — P1 skill fuzz (P1 design §10.3). Inputs come from a seeded RNG separate from the Sim's.
import { timedHazards } from '../../src/core/hazards/timed';
import type { Balance } from '../../src/core/balance';
import { cellReserved, cellSolidCause, snakeOn } from '../../src/core/cells';
import { goodCells } from '../../src/core/energy';
import { isReserved } from '../../src/core/reserved';
import { rngFrom, seedRng, type Rng } from '../../src/core/rng';
import { createSim, exportState, stateOf } from '../../src/core/sim';
import { slotCount, unlockedSkills } from '../../src/core/skills';
import type { Loadout, Sim, SkillId, SimOptions, SimState, Step } from '../../src/core/types';

export const START_LEVELS = [1, 4, 12, 26] as const;
const DIRS: [Step, Step][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export interface P1Report {
  violations: string[]; used: Partial<Record<SkillId, number>>;
  steps: number; skillsUsed: number; rainDrops: number; shieldBreaks: number; orbs: number; orbsEaten: number; levelUps: number;
}

// MEC-007 a valid random loadout for the given best level (sanitizeLoadout-equivalent pick).
export function randomOptions(b: Balance, input: Rng, bestLevel: number): SimOptions {
  const pool = [...unlockedSkills(b, bestLevel)];
  const slots = slotCount(b, bestLevel);
  const pick = (): SkillId | null => pool.length ? pool.splice(input.int(pool.length), 1)[0]! : null;
  const a = pick(), c = slots === 2 ? pick() : null;
  return { startLevel: input.pick([...START_LEVELS]), startEnergy: input.int(51), bestLevel, loadout: [a, c] as Loadout };
}

function steer(sim: Sim, s: SimState, b: Balance, input: Rng): void {
  const h = s.snake[0]!;
  const safe = DIRS.filter(([dx, dy]) => {
    const x = h.x + dx, y = h.y + dy;
    return x >= 0 && y >= 0 && x < b.board.cols && y < b.board.rows && !(dx === -s.dir.x && dy === -s.dir.y)
      && !snakeOn(s, x, y) && !cellReserved({ ...s, mango: null, orbs: [], rainMangoes: [] }, x, y);
  });
  // With an active Shield, sometimes aim at an adjacent solid cell so breaks are exercised.
  const solid = DIRS.filter(([dx, dy]) => !(dx === -s.dir.x && dy === -s.dir.y) && cellSolidCause(s, h.x + dx, h.y + dy) !== null);
  if (s.shield && solid.length && input.chance(0.5)) { const [dx, dy] = input.pick(solid); sim.turn(dx, dy); return; }
  // Aim at the nearest food: regular mango, orb or rain mango.
  const dist = (c: { x: number; y: number }) => Math.abs(h.x - c.x) + Math.abs(h.y - c.y);
  const foods = [...(s.mango ? [s.mango] : []), ...s.orbs, ...s.rainMangoes].sort((p, q) => dist(p) - dist(q));
  const m = foods[0], toward = m ? safe.filter(([dx, dy]) => Math.abs(h.x + dx - m.x) + Math.abs(h.y + dy - m.y) < Math.abs(h.x - m.x) + Math.abs(h.y - m.y)) : [];
  const pool = toward.length && input.chance(0.7) ? toward : safe.length ? safe : DIRS;
  const [dx, dy] = input.pick(pool);
  sim.turn(dx, dy);
}

// Shallow copy of everything isReserved/goodCells read; enough because placements only add new objects.
function shallow(s: SimState): SimState {
  return { ...s, snake: s.snake.map(c => ({ ...c })), dir: { ...s.dir }, orbs: [...s.orbs], rainMangoes: [...s.rainMangoes],
    families: { mud: { ...s.families.mud, patches: [...s.families.mud.patches] }, rock: [...s.families.rock], fence: [...s.families.fence], maze: [...s.families.maze],
      terrain: [...s.families.terrain], rottenRock: [...s.families.rottenRock], snipWall: [...s.families.snipWall], rubble: [...s.families.rubble] } };
}

export function p1FuzzSeed(b: Balance, seed: number, simMs: number): P1Report {
  const input = rngFrom(seedRng(seed ^ 0x5bd1e995));
  const rep: P1Report = { violations: [], used: {}, steps: 0, skillsUsed: 0, rainDrops: 0, shieldBreaks: 0, orbs: 0, orbsEaten: 0, levelUps: 0 };
  const bad = (msg: string) => { if (rep.violations.length < 20) rep.violations.push(`seed ${seed}: ${msg}`); };
  let played = 0, run = 0;
  while (played < simMs) {
    const opts = randomOptions(b, input, 30);
    // Plan start energy is 0…50; even seeds start full so Mango Rain (cost 80) is cast at all (see DECISIONS, P1 Task 7).
    if (seed % 2 === 0) opts.startEnergy = b.energy.max;
    const sim = createSim(b, seed * 1000 + run, opts), s = stateOf(sim);
    run++;
    const budget = new Map<number, number>(), gained = new Map<number, number>();
    while (s.status === 'playing' && played < simMs) {
      if (played % 16 === 0) {
        if (!s.queue.length) steer(sim, s, b, input);
        // Save up for the costliest slot (so Mango Rain is exercised); otherwise press a random slot now and then.
        const cost = (i: 0 | 1) => { const id = s.loadout[i]; return id === null ? -1 : b.skills[id].cost; };
        const top: 0 | 1 = cost(1) > cost(0) ? 1 : 0;
        if (cost(top) >= 0 && s.energy >= cost(top) && input.chance(0.5)) sim.useSkill(top);
        else if (input.chance(0.003)) sim.useSkill(input.int(2) as 0 | 1);
      }
      const before = shallow(s), mango = s.mango, t = played + 1;
      sim.advance(1); played++;
      const events = sim.drainEvents();
      for (const e of events) {
        if (e.type === 'skillUsed') { rep.skillsUsed++; rep.used[e.skill] = (rep.used[e.skill] ?? 0) + 1; }
        else if (e.type === 'rainDrop') rep.rainDrops++;
        else if (e.type === 'shieldBroke') rep.shieldBreaks++;
        else if (e.type === 'orbSpawned') rep.orbs++;
        else if (e.type === 'orbEaten') rep.orbsEaten++;
        else if (e.type === 'levelUp') rep.levelUps++;
        else if (e.type === 'ate' && e.source === 'rain') {
          const r = before.rainMangoes.find(m => m.x === e.x && m.y === e.y);
          if (r) gained.set(r.castId, (gained.get(r.castId) ?? 0) + e.progressGain);
        }
      }
      for (const g of s.rainBudgets) if (!budget.has(g.castId)) budget.set(g.castId, g.left);
      // MEC-006-R32 rain progress per cast never exceeds its budget
      for (const [id, n] of gained) if (n > (budget.get(id) ?? 0)) bad(`t=${t}: cast ${id} gave ${n} progress > budget ${budget.get(id)}`);
      // MEC-006-R2
      if (s.energy < 0 || s.energy > b.energy.max || !Number.isInteger(s.energy)) bad(`t=${t}: energy ${s.energy}`);
      // MEC-001-R7
      if (s.snake.length < b.skills.tailSnip.minLength) bad(`t=${t}: length ${s.snake.length}`);
      const h0 = before.snake[0]!, h1 = s.snake[0]!, moved = h0.x !== h1.x || h0.y !== h1.y;
      if (moved) rep.steps++;
      // MEC-003-R22 an active slowdown always sits inside its ease window
      if (s.levelUpSlow && (s.levelUpSlow.leftMs < 1 || s.levelUpSlow.leftMs > s.levelUpSlow.easeMs)) bad(`t=${t}: slowdown leftMs ${s.levelUpSlow.leftMs}`);
      // P0: at most one snake step per 1 ms step
      if (Math.abs(h0.x - h1.x) + Math.abs(h0.y - h1.y) > 1) bad(`t=${t}: head jumped`);
      checkPlacements(b, before, s, mango, t, bad);
    }
    if (s.status === 'over') {                              // MEC-001-R11 the snake never moves after died
      const snap = JSON.stringify(sim.snapshot());
      sim.turn(0, 1); sim.useSkill(0); sim.useSkill(1); sim.advance(1000);
      if (JSON.stringify(sim.snapshot()) !== snap) bad('state changed after over');
    }
  }
  return rep;
}

// MEC-002-R2 / MEC-006-R6 new placements never use a reserved cell; orbs and rain drops are fair.
function checkPlacements(b: Balance, before: SimState, s: SimState, mango: SimState['mango'], t: number, bad: (m: string) => void): void {
  const fresh = <T>(now: T[], old: T[]) => now.filter(x => !old.includes(x));
  for (const h of fresh(timedHazards(s), timedHazards(before))) for (const c of h.cells)
    if (isReserved(before, c.x, c.y)) bad(`t=${t}: ${h.family} on reserved (${c.x},${c.y})`);
  for (const T of fresh(s.families.terrain, before.families.terrain)) for (const c of T.cells)
    if (isReserved(before, c.x, c.y)) bad(`t=${t}: terrain on reserved (${c.x},${c.y})`);
  const newRubble = fresh(s.families.rubble, before.families.rubble);
  // State at placement time: the snake has not moved yet; later placements of this step are excluded.
  const mid = (): SimState => ({ ...shallow(s), snake: before.snake, dir: before.dir, families: { ...s.families, rubble: s.families.rubble.filter(r => !newRubble.includes(r)) } });
  for (const o of fresh(s.orbs, before.orbs)) {
    const m = mid(); m.orbs = m.orbs.filter(x => x !== o);
    if (isReserved(m, o.x, o.y) || !goodCells(m, b).some(c => c.x === o.x && c.y === o.y)) bad(`t=${t}: unfair orb (${o.x},${o.y})`);
  }
  for (const r of fresh(s.rainMangoes, before.rainMangoes)) {
    const m = mid(); m.rainMangoes = m.rainMangoes.filter(x => x !== r);
    if (isReserved(m, r.x, r.y) || !goodCells(m, b).some(c => c.x === r.x && c.y === r.y)) bad(`t=${t}: unfair rain mango (${r.x},${r.y})`);
  }
  for (const r of newRubble) {
    const m = { ...mid(), families: { ...s.families, rubble: before.families.rubble } };
    if (isReserved(m, r.x, r.y)) bad(`t=${t}: rubble on reserved (${r.x},${r.y})`);
  }
  if (s.mango && s.mango !== mango && isReserved({ ...s, mango: null }, s.mango.x, s.mango.y)) bad(`t=${t}: mango on reserved`);
}

export type Input = { t: number; turn?: [Step, Step]; slot?: 0 | 1 };

// MEC-006-R35 a timed input script from a seeded RNG.
export function script(seed: number, ms: number): Input[] {
  const r = rngFrom(seedRng(seed ^ 0x27d4eb2d)), out: Input[] = [];
  for (let t = 0; t < ms; t += 1 + r.int(120)) out.push(r.chance(0.1) ? { t, slot: r.int(2) as 0 | 1 } : { t, turn: r.pick(DIRS) });
  return out;
}

// Plays the script from `from` to `to`, advancing in chunks of at most `chunk` ms.
export function play(sim: Sim, inputs: Input[], from: number, to: number, chunk: number): void {
  let now = from;
  const go = (until: number) => { while (now < until) { const d = Math.min(chunk, until - now); sim.advance(d); now += d; } };
  for (const i of inputs) {
    if (i.t < from || i.t >= to) continue;
    go(i.t);
    if (i.turn) sim.turn(i.turn[0], i.turn[1]); else sim.useSkill(i.slot!);
  }
  go(to);
}

export const stateJson = (sim: Sim): string => JSON.stringify(exportState(sim));
export function detSim(b: Balance, seed: number, startLevel: number): Sim {
  const unlocked = unlockedSkills(b, 30);
  return createSim(b, seed, { startLevel, startEnergy: 50, bestLevel: 30, loadout: [unlocked[seed % unlocked.length]!, unlocked[(seed + 1) % unlocked.length]!] });
}
