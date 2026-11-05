// src/core/mango.ts — MEC-002 (prototype placeFood L381–398, rot L399–406)
import type { Balance } from './balance';
import { cellBfsWall, cellReserved } from './cells';
import { key, nearHead, reachable } from './grid';
import { familyRow } from './level';
import { rngFrom, type Rng } from './rng';
import type { Cell, MangoState, SimState, StepCtx } from './types';
import { addEnergy } from './energy';

// MEC-006-R9 golden mangoes grant energy at every level, after the ate event.
export function goldenEnergy(s: SimState, b: Balance, ctx: StepCtx): void {
  const gained = addEnergy(s, b, b.energy.goldenGain);
  if (gained > 0) ctx.emit({ type: 'energyChanged', energy: s.energy, delta: gained, source: 'golden' });
}

// MEC-002-R4 placement rot time depends only on the current level's regular mango count.
export const rotTimeMs = (b: Balance, eatenInLevel: number, golden: boolean): number =>
  Math.floor(Math.max(b.mango.rotMinMs, b.mango.rotBaseMs - b.mango.rotPerEatenMs * eatenInLevel) * (golden ? b.mango.goldenRotFactor : 1));
export const rotMsFor = rotTimeMs;

const reachSet = (s: SimState, b: Balance): Set<number> =>
  reachable(b.board.cols, b.board.rows, s.snake[0]!, (x, y) => cellBfsWall(s, x, y));
const nearForMango = (s: SimState, b: Balance, x: number, y: number): boolean =>
  nearHead(s.snake[0]!, s.dir, x, y, b.mango.nearHeadDist, b.fairness.frontLaneCells);

// MEC-002-R1/R5/R9 prefer fair candidates; an empty board slot defers without consuming RNG.
export function placeMango(s: SimState, b: Balance, rng: Rng): boolean {
  const hadMango = s.mango !== null;
  s.mango = null;
  const reach = reachSet(s, b);
  const good: Cell[] = [], any: Cell[] = [];
  for (let y = 0; y < b.board.rows; y++) for (let x = 0; x < b.board.cols; x++) {
    if (cellReserved(s, x, y)) continue;
    any.push({ x, y });
    if (reach.has(key(b.board.cols, x, y)) && !nearForMango(s, b, x, y)) good.push({ x, y });
  }
  const pool = good.length ? good : any;
  if (!pool.length) {
    s.retryMs = 0;
    if (hadMango) s.events.push({ type: 'mangoDeferred' });
    return false;
  }
  const c = rng.pick(pool);
  const golden = s.eatenInRun >= b.mango.goldenMinEaten && rng.chance(b.mango.goldenChance);
  const total = rotTimeMs(b, s.eatenInLevel, golden);
  s.mango = { x: c.x, y: c.y, golden, leftMs: total, totalMs: total };
  s.retryMs = 0;
  return true;
}

// MEC-002-R6 only enabled levels leave a fair temporary rotten rock before replacement.
export function rotMango(s: SimState, b: Balance, rng: Rng): void {
  const m = s.mango as MangoState;
  const fair = familyRow(b, s.level).rottenRocks && reachSet(s, b).has(key(b.board.cols, m.x, m.y)) && !nearForMango(s, b, m.x, m.y);
  if (fair) s.families.rottenRock.push({ family: 'rottenRock', x: m.x, y: m.y, state: 'solid', leftMs: b.mango.rottenRockLifeMs });
  s.events.push({ type: 'rotted', x: m.x, y: m.y, leftRock: fair });
  placeMango(s, b, rng); // MEC-001-R10 an empty mango slot never wins the run.
}

// MEC-002-R6/R9 step 9 runs before snake movement, and only during playing time.
export function mangoTick(s: SimState, b: Balance, _ctx: StepCtx): void {
  if (!s.mango) {
    s.retryMs += 1;
    if (s.retryMs >= b.mango.placeRetryMs) { s.retryMs = 0; placeMango(s, b, rngFrom(s.rng)); }
    return;
  }
  s.mango.leftMs -= 1;
  if (s.mango.leftMs <= 0) rotMango(s, b, rngFrom(s.rng));
}
