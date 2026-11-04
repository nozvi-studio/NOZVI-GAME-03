// src/core/hazards/director.ts — spawn timer, cap, weighted pick with retry (updateDirector L533–555). MEC-004
import type { Balance } from '../balance';
import { cellReserved } from '../cells';
import { inBounds, nearHead } from '../grid';
import { directorIntervalMs, enabledFamilies, familyRow, smallHazardCap } from '../level';
import type { Rng } from '../rng';
import type { TableFamily, SimState, SpawnCtx } from '../types';
import { FAMILIES, FAMILY } from './registry';

// MEC-004 prototype weighted pick: r = next() * total; walk while r > w[i]
export function pickWeighted(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((a, w) => a + w, 0);
  let r = rng.next() * total, i = 0;
  while (i < weights.length - 1 && r > weights[i]!) { r -= weights[i]!; i++; }
  return i;
}

export function spawnCtx(s: SimState, b: Balance): SpawnCtx {
  return {
    balance: b, level: s.level,
    cellFree: (x, y, d = b.fairness.nearHeadDist) =>
      inBounds(b.board.cols, b.board.rows, x, y) && !cellReserved(s, x, y)
      && !nearHead(s.snake[0]!, s.dir, x, y, d, b.fairness.frontLaneCells),
  };
}

// MEC-003-R4/R14 table-driven director; preserves P0 weighted-pick and retry RNG order
export function updateDirector(s: SimState, b: Balance, rng: Rng): void {
  // MEC-003-R13 deferred mango placement freezes the director.
  if (s.mango === null) return;
  // MEC-003-R11 / MEC-003-R22 the first-spawn timer of a level starts when its slowdown ends.
  if (s.levelUpSlow !== null) return;
  s.mazeCooldownMs -= 1;
  s.spawnInMs -= 1;
  if (s.spawnInMs > 0) return;
  s.spawnInMs = directorIntervalMs(b, s.level);
  const cap = smallHazardCap(b, s.level);
  let smallCount = 0;
  for (const f of FAMILIES) if (f.capClass === 'small') smallCount += f.count?.(s) ?? s.families[f.key].length;
  const mazeActive = s.families.maze.length > 0;
  const options: TableFamily[] = enabledFamilies(b, s.level).filter(k => {
    if (k === 'rock' || k === 'fence') return smallCount < cap;
    if (k === 'terrain') return !mazeActive && s.families.terrain.length < b.terrain.maxActive;
    return s.mazeCooldownMs <= 0 && !mazeActive && !s.families.terrain.length;
  });
  const weights = familyRow(b, s.level).weights;
  const ctx = spawnCtx(s, b);
  while (options.length) {
    const i = pickWeighted(options.map(k => weights[k]!), rng);
    const k = options[i]!;
    const inst = FAMILY[k].spawn(s, { ...ctx, rng });
    if (inst) {
      if (k === 'maze') s.mazeCooldownMs = b.maze.cooldownMs;
      if (k !== 'rock') s.events.push({ type: 'hazardIncoming', family: k });
      return;
    }
    options.splice(i, 1);                      // didn't fit: try something else
  }
}
