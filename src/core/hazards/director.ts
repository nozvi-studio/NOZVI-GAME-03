// src/core/hazards/director.ts — spawn timer, cap, weighted pick with retry (updateDirector L533–555). MEC-004
import type { Balance } from '../balance';
import { cellReserved } from '../cells';
import { inBounds, nearHead } from '../grid';
import { directorIntervalMs, familyRow, smallHazardCap } from '../level';
import { rngFrom, type Rng } from '../rng';
import type { HazardFamily, SimState, SpawnCtx } from '../types';
import { FAMILIES } from './registry';
import { candidateValid } from './placement';

export type { SpawnObserver } from '../types';

// MEC-004 prototype weighted pick: r = next() * total; walk while r > w[i]
export function pickWeighted(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((a, w) => a + w, 0);
  let r = rng.next() * total, i = 0;
  while (i < weights.length - 1 && r > weights[i]!) { r -= weights[i]!; i++; }
  return i;
}

export function spawnCtx(s: SimState, b: Balance): SpawnCtx {
  return {
    balance: b, level: s.level, rng: rngFrom(s.rng),
    candidateValid: (state, cells, opts) => candidateValid(state, b, cells, opts),
    cellFree: (x, y, d = b.fairness.nearHeadDist) =>
      inBounds(b.board.cols, b.board.rows, x, y) && !cellReserved(s, x, y)
      && !nearHead(s.snake[0]!, s.dir, x, y, d, b.fairness.frontLaneCells),
  };
}

// MEC-004-R9 every cap and gate is evaluated over the ordered registry.
export function directorOptions(s: SimState, b: Balance, fams: readonly HazardFamily[] = FAMILIES): { family: HazardFamily; weight: number }[] {
  const counts = new Map(fams.map(f => {
    // MEC-004-R9 new families provide count; the fallback covers existing state entries.
    const state = s.families[f.key as keyof SimState['families']];
    return [f, f.count?.(s) ?? (Array.isArray(state) ? state.length : state.patches.length)] as const;
  }));
  const smallCount = fams.reduce((n, f) => n + (f.capClass === 'small' ? counts.get(f)! : 0), 0);
  const bigActive = fams.some(f => f.capClass === 'big' && counts.get(f)! > 0);
  const cap = smallHazardCap(b, s.level), weights = familyRow(b, s.level).weights;
  return fams.flatMap(family => {
    const weight = weights[family.key] ?? 0;
    if (weight <= 0 || family.capClass === 'none') return [];
    if (family.capClass === 'small' && smallCount >= cap) return [];
    if (family.capClass === 'big' && bigActive) return [];
    if (family.key === 'maze' && s.mazeCooldownMs > 0) return [];
    if (family.maxActiveKey !== null) {
      let max: unknown = b;
      for (const part of family.maxActiveKey.split('.')) max = (max as Record<string, unknown>)[part];
      if (typeof max !== 'number') throw new Error('Invalid maxActiveKey: ' + family.maxActiveKey);
      if (counts.get(family)! >= max) return [];
    }
    return [{ family, weight }];
  });
}

// MEC-003-R4/R14; MEC-004-R9/R10 preserve weighted-pick and retry draws within registry order.
export function updateDirector(s: SimState, b: Balance, rng: Rng, ctx?: SpawnCtx): void {
  // MEC-003-R13 deferred mango placement freezes the director.
  if (s.mango === null) return;
  // MEC-003-R11 / MEC-003-R22 the first-spawn timer of a level starts when its slowdown ends.
  if (s.levelUpSlow !== null) return;
  s.mazeCooldownMs -= 1;
  s.spawnInMs -= 1;
  if (s.spawnInMs > 0) return;
  s.spawnInMs = directorIntervalMs(b, s.level);
  const options = directorOptions(s, b);
  const context = ctx ?? spawnCtx(s, b);
  while (options.length) {
    const i = pickWeighted(options.map(o => o.weight), rng);
    const { family } = options[i]!;
    const before = context.observer ? structuredClone(s) : undefined;
    const cells = family.spawn(s, { ...context, rng });
    if (cells) {
      if (family.key === 'maze') s.mazeCooldownMs = b.maze.cooldownMs;
      // MEC-004-R9 families declare ownership of their incoming warning.
      if (!family.emitsIncoming) s.events.push({ type: 'hazardIncoming', family: family.key });
      if (before) context.observer!.spawned(family.key, cells, before, s);
      return;
    }
    options.splice(i, 1);                      // didn't fit: try something else
  }
}
