// tests/support/fuzz.ts — seeded invariant fuzz (design §9 item 2). No new dependency.
import { timedHazards } from '../../src/core/hazards/timed';
import type { Balance } from '../../src/core/balance';
import { cellReserved, snakeOn } from '../../src/core/cells';
import { key, nearHead } from '../../src/core/grid';
import { placeMango } from '../../src/core/mango';
import { rngFrom, seedRng } from '../../src/core/rng';
import { restoreSim, stateOf } from '../../src/core/sim';
import type { Cell, TableFamily, Sim, SimSnapshot, SimState, Step } from '../../src/core/types';
import { buildState } from './state';

export interface FuzzReport { violations: string[]; steps: number; maxLevel: number; spawned: Record<TableFamily, number> }
const DIRS: [Step, Step][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

type CoconutRoll = SimState['families']['coconut']['rolls'][number];

// MEC-013-R2/EC1 harness-only spawn history: only the original mango at its spawn-time position is exempt.
export class CoconutSpawnTracker {
  private readonly mangoes = new WeakMap<CoconutRoll, { mango: SimState['mango']; position: Cell | null }>();

  record(before: SimState, after: SimState): number {
    const previousIds = new Set(before.families.coconut.rolls.map(r => r.id));
    let spawned = 0;
    for (const roll of after.families.coconut.rolls) {
      if (previousIds.has(roll.id) || this.mangoes.has(roll)) continue;
      // The observer's before state is cloned; after retains the live mango identity until it is replaced.
      this.mangoes.set(roll, { mango: after.mango,
        position: before.mango && { x: before.mango.x, y: before.mango.y } });
      spawned++;
    }
    return spawned;
  }

  mangoReserved(s: SimState): boolean {
    const mango = s.mango;
    if (!mango) return false;
    const rolls = s.families.coconut.rolls.filter(roll => {
      const existing = this.mangoes.get(roll);
      return !(existing?.mango === mango && existing.position?.x === mango.x && existing.position.y === mango.y);
    });
    return cellReserved({ ...s, mango: null, families: { ...s.families,
      coconut: { ...s.families.coconut, rolls } } }, mango.x, mango.y);
  }
}

export interface MoverMark {
  id: string; family: 'coconut' | 'npc'; cause: 'coconut' | 'cat' | 'chicken';
  cell: number; phase: 'warn' | 'mover'; warnMs: number; elapsedMs?: number;
}

// MEC-013-R2/R3 MEC-015-R3 TR-B4: the entire warning path precedes one occupied moving cell.
export function moverCells(snap: SimSnapshot, cols: number): MoverMark[] {
  const rolls = [...snap.families.coconut.map(r => ({ ...r, family: 'coconut' as const, cause: 'coconut' as const })),
    ...snap.families.npc.map(r => ({ ...r, family: 'npc' as const, cause: r.variant }))];
  return rolls.flatMap(r => {
    // MEC-015-R5 a body/solid can delay first entry beyond warnMs; retain the telegraphed route until entry.
    const warning = r.state === 'warn' || (r.state === 'move' && r.cell === null);
    const phase = warning ? 'warn' as const : 'mover' as const;
    const cells = warning ? r.path : r.state === 'move' && r.cell ? [r.cell] : [];
    return cells.map(c => ({ id: r.family + ':' + r.id, family: r.family, cause: r.cause,
      cell: key(cols, c.x, c.y), phase, warnMs: r.warnMs,
      ...(warning ? { elapsedMs: r.state === 'warn' ? r.t : r.warnMs } : {}) }));
  });
}

// MEC-013-R2/R4 TR-B4: body-only I1 on entry, and one full-path warning per roll for I3.
export function checkMoverTransitions(previous: readonly MoverMark[], current: readonly MoverMark[],
  warnSince: Map<string, number>, body: ReadonlySet<number>, time: number, bad: (m: string) => void): void {
  const live = new Set(current.map(m => m.id));
  for (const id of warnSince.keys()) if (!live.has(id)) warnSince.delete(id);
  for (const mark of current) {
    if (mark.phase === 'warn') {
      // The director spawns before the same millisecond's hazard update (first observed t is 1).
      if (!warnSince.has(mark.id)) warnSince.set(mark.id, time - (mark.elapsedMs ?? 0));
      continue;
    }
    const old = previous.find(m => m.id === mark.id && m.phase === 'mover');
    if (old?.cell === mark.cell) continue;
    if (body.has(mark.cell)) bad(`I1 ${mark.id} moved into the body`);
    if (!old && (!previous.some(m => m.id === mark.id && m.phase === 'warn')
      || time - (warnSince.get(mark.id) ?? time) < mark.warnMs))
      bad(`I3 ${mark.id} moved without ${mark.warnMs} ms path warning`);
  }
}

export function snapHash(sim: Sim): string {          // FNV-1a over the snapshot JSON
  const str = JSON.stringify(sim.snapshot());
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}

/** Runs consecutive runs until simMs of sim time are played. Runs start at a seeded level 0…10 so late hazards are covered. */
export function fuzzSeed(b: Balance, seed: number, simMs: number): FuzzReport {
  const input = rngFrom(seedRng(seed ^ 0x9e3779b9));      // input RNG, separate from the Sim RNG
  const rep: FuzzReport = { violations: [], steps: 0, maxLevel: 0, spawned: { rock: 0, fence: 0, maze: 0, terrain: 0, mud: 0, ice: 0, coconut: 0, gate: 0, spike: 0, npc: 0, bird: 0, bomb: 0, shrink: 0 } };
  const seen = new WeakSet<object>();
  let played = 0, run = 0;
  while (played < simMs) {
    const s0 = buildState(b, { seed: seed * 1000 + run, level: 1 + input.int(b.level.maxLevel), spawnInMs: b.director.firstSpawnMs });
    placeMango(s0, b, rngFrom(s0.rng));
    const coconuts = new CoconutSpawnTracker();
    const sim = restoreSim(b, s0, { observer: { spawned(family, _cells, before, after) {
      if (family === 'coconut') rep.spawned.coconut += coconuts.record(before, after);
      if (family === 'npc') rep.spawned.npc++;
      if (family === 'bird') rep.spawned.bird++;
      if (family === 'bomb') rep.spawned.bomb++;
      if (family === 'shrink') rep.spawned.shrink++;
    } } }), s = stateOf(sim);
    run++;
    while (s.status === 'playing' && played < simMs) {
      if (played % 16 === 0) steer(sim, s, b, input);
      const head = { ...s.snake[0]! }, dir = { ...s.dir };
      sim.advance(1); played++;
      checkSpawns(s, b, head, dir, seen, rep);
      const moved = s.snake[0]!.x !== head.x || s.snake[0]!.y !== head.y;
      if (moved) rep.steps++;
      if (moved || played % 16 === 0) checkState(s, rep, played, coconuts);
      rep.maxLevel = Math.max(rep.maxLevel, s.level);
    }
    if (s.status === 'over') {                              // the snake never moves after over
      const before = JSON.stringify(sim.snapshot()); sim.advance(1000); sim.turn(0, 1);
      if (JSON.stringify(sim.snapshot()) !== before) rep.violations.push(`seed ${seed}: state changed after over`);
    }
  }
  return rep;
}

function steer(sim: Sim, s: SimState, b: Balance, input: ReturnType<typeof rngFrom>): void {
  // 70%: a safe direction toward the mango if any; else a random safe direction; else random
  const h = s.snake[0]!;
  const safe = DIRS.filter(([dx, dy]) => {
    const x = h.x + dx, y = h.y + dy;
    return x >= 0 && y >= 0 && x < b.board.cols && y < b.board.rows && !(dx === -s.dir.x && dy === -s.dir.y)
      && !snakeOn(s, x, y) && !cellReserved({ ...s, mango: null }, x, y);
  });
  const m = s.mango, toward = m ? safe.filter(([dx, dy]) => Math.abs(h.x + dx - m.x) + Math.abs(h.y + dy - m.y) < Math.abs(h.x - m.x) + Math.abs(h.y - m.y)) : [];
  const pool = toward.length && input.chance(0.7) ? toward : safe.length ? safe : DIRS;
  const [dx, dy] = input.pick(pool);
  sim.turn(dx, dy);
}

function checkSpawns(s: SimState, b: Balance, head: { x: number; y: number }, dir: SimState['dir'], seen: WeakSet<object>, rep: FuzzReport): void {
  for (const h of [...timedHazards(s), ...s.families.terrain]) {
    if (seen.has(h)) continue;
    seen.add(h); rep.spawned[h.family]++;
    const d = h.family === 'terrain' ? b.fairness.terrainNearHeadDist : b.fairness.nearHeadDist;
    for (const c of h.cells) if (nearHead(head, dir, c.x, c.y, d, b.fairness.frontLaneCells))
      rep.violations.push(`${h.family} spawned near the head at (${c.x},${c.y})`);
  }
}

function checkState(s: SimState, rep: FuzzReport, t: number, coconuts: CoconutSpawnTracker): void {
  const m = s.mango;
  if (m && coconuts.mangoReserved(s)) rep.violations.push(`t=${t}: mango on a reserved cell (${m.x},${m.y})`);
  for (const c of s.snake) {
    if (timedHazards(s).some(h => h.cells.some(k => k.on && k.x === c.x && k.y === c.y))
      || s.families.terrain.some(T => T.cells.some(k => k.up && k.x === c.x && k.y === c.y))
      || s.families.bomb.bombs.some(m => m.landed && m.blast?.phase === 'count' && m.x === c.x && m.y === c.y))
      rep.violations.push(`t=${t}: solid cell under the snake at (${c.x},${c.y})`);
  }
}
