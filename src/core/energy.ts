import type { Balance } from './balance';
import { cellBfsWall } from './cells';
import { key, nearHead, reachable } from './grid';
import { isReserved } from './reserved';
import { rngFrom } from './rng';
import type { Cell, SimState, StepCtx } from './types';

// MEC-006-R2 gains stop at the cap; return only the energy actually gained.
export function addEnergy(s: SimState, b: Balance, amount: number): number {
  const before = s.energy;
  s.energy = Math.min(b.energy.max, s.energy + amount);
  return s.energy - before;
}

// MEC-006-R6 fair orb candidates are row-major, with no fallback.
export function goodCells(s: SimState, b: Balance): Cell[] {
  const head = s.snake[0]!;
  const reach = reachable(b.board.cols, b.board.rows, head, (x, y) => cellBfsWall(s, x, y));
  const good: Cell[] = [];
  for (let y = 0; y < b.board.rows; y++) for (let x = 0; x < b.board.cols; x++) {
    if (!isReserved(s, x, y) && reach.has(key(b.board.cols, x, y))
      && !nearHead(head, s.dir, x, y, b.mango.nearHeadDist, b.fairness.frontLaneCells)) good.push({ x, y });
  }
  return good;
}

// MEC-006-R4/R5/R7 age existing orbs before the periodic spawn attempt.
export function orbTick(s: SimState, b: Balance, ctx: StepCtx): void {
  if (s.level < b.energy.orbFromLevel) return;
  s.orbs = s.orbs.filter(o => {
    o.ageMs += 1;
    if (o.ageMs < b.energy.orbLifeMs) return true;
    ctx.emit({ type: 'orbExpired', x: o.x, y: o.y });
    return false;
  });
  s.orbSpawnMs += 1;
  if (s.orbSpawnMs < b.energy.orbSpawnIntervalMs) return;
  s.orbSpawnMs = 0;
  if (s.orbs.length >= b.energy.orbMax) return;
  const good = goodCells(s, b);
  if (!good.length) return;
  const { x, y } = rngFrom(s.rng).pick(good);
  s.orbs.push({ x, y, ageMs: 0 });
  ctx.emit({ type: 'orbSpawned', x, y });
}

// MEC-006-R8 an orb changes only energy, with the pickup event first.
export function eatOrb(s: SimState, b: Balance, ctx: StepCtx, x: number, y: number): void {
  const index = s.orbs.findIndex(o => o.x === x && o.y === y);
  if (index < 0) return;
  s.orbs.splice(index, 1);
  const gained = addEnergy(s, b, b.energy.orbGain);
  ctx.emit({ type: 'orbEaten', x, y, gained });
  if (gained > 0) ctx.emit({ type: 'energyChanged', energy: s.energy, delta: gained, source: 'orb' });
}
