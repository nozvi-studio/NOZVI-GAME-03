import { timedHazards } from '../../src/core/hazards/timed';
// tests/support/fuzz.ts — seeded invariant fuzz (design §9 item 2). No new dependency.
import type { Balance } from '../../src/core/balance';
import { cellReserved, snakeOn } from '../../src/core/cells';
import { nearHead } from '../../src/core/grid';
import { placeMango } from '../../src/core/mango';
import { rngFrom, seedRng } from '../../src/core/rng';
import { restoreSim, stateOf } from '../../src/core/sim';
import type { TableFamily, Sim, SimState, Step } from '../../src/core/types';
import { buildState } from './state';

export interface FuzzReport { violations: string[]; steps: number; maxLevel: number; spawned: Record<TableFamily, number> }
const DIRS: [Step, Step][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function snapHash(sim: Sim): string {          // FNV-1a over the snapshot JSON
  const str = JSON.stringify(sim.snapshot());
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}

/** Runs consecutive runs until simMs of sim time are played. Runs start at a seeded level 0…10 so late hazards are covered. */
export function fuzzSeed(b: Balance, seed: number, simMs: number): FuzzReport {
  const input = rngFrom(seedRng(seed ^ 0x9e3779b9));      // input RNG, separate from the Sim RNG
  const rep: FuzzReport = { violations: [], steps: 0, maxLevel: 0, spawned: { rock: 0, fence: 0, maze: 0, terrain: 0 } };
  const seen = new WeakSet<object>();
  let played = 0, run = 0;
  while (played < simMs) {
    const s0 = buildState(b, { seed: seed * 1000 + run, level: 1 + input.int(b.level.maxLevel), spawnInMs: b.director.firstSpawnMs });
    placeMango(s0, b, rngFrom(s0.rng));
    const sim = restoreSim(b, s0), s = stateOf(sim);
    run++;
    while (s.status === 'playing' && played < simMs) {
      if (played % 16 === 0) steer(sim, s, b, input);
      const head = { ...s.snake[0]! }, dir = { ...s.dir };
      sim.advance(1); played++;
      checkSpawns(s, b, head, dir, seen, rep);
      const moved = s.snake[0]!.x !== head.x || s.snake[0]!.y !== head.y;
      if (moved) rep.steps++;
      if (moved || played % 16 === 0) checkState(s, rep, played);
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

function checkState(s: SimState, rep: FuzzReport, t: number): void {
  const m = s.mango;
  if (m && cellReserved({ ...s, mango: null }, m.x, m.y)) rep.violations.push(`t=${t}: mango on a reserved cell (${m.x},${m.y})`);
  for (const c of s.snake) {
    if (timedHazards(s).some(h => h.cells.some(k => k.on && k.x === c.x && k.y === c.y))
      || s.families.terrain.some(T => T.cells.some(k => k.up && k.x === c.x && k.y === c.y)))
      rep.violations.push(`t=${t}: solid cell under the snake at (${c.x},${c.y})`);
  }
}
