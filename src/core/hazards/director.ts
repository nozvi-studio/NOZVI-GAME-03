// src/core/hazards/director.ts — spawn timer, cap, weighted pick with retry (updateDirector L533–555). MEC-004
import type { Balance } from '../balance';
import { cellReserved } from '../cells';
import { inBounds, nearHead } from '../grid';
import { isUnlocked } from '../level';
import type { Rng } from '../rng';
import type { FamilyKey, SimState, SpawnCtx, TerrainHazard, TimedHazard } from '../types';
import { FAMILY } from './registry';

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

// MEC-004 one 1 ms step of the director
export function updateDirector(s: SimState, b: Balance, rng: Rng): void {
  const d = b.director;
  s.mazeCooldownMs -= 1;
  s.spawnInMs -= 1;
  if (s.spawnInMs > 0) return;
  s.spawnInMs = Math.max(d.intervalMinMs, d.intervalBaseMs - s.level * d.intervalPerLevelMs);
  const cap = Math.min(d.capMax, d.capBase + Math.floor(s.level / d.capPerLevels));
  const options: FamilyKey[] = [];
  if (s.hazards.filter(h => FAMILY[h.family].capClass === 'small').length < cap) {
    options.push('rock');
    if (isUnlocked(b, s.level, 'fence')) options.push('fence');
  }
  const mazeActive = s.hazards.some(h => h.family === 'maze');
  const maxTerrains = s.level >= b.terrain.lateLevel ? b.terrain.maxActiveLate : b.terrain.maxActive;
  if (isUnlocked(b, s.level, 'terrain') && !mazeActive && s.terrains.length < maxTerrains) options.push('terrain');
  if (isUnlocked(b, s.level, 'maze') && s.mazeCooldownMs <= 0 && !mazeActive && !s.terrains.length) options.push('maze');
  const ctx = spawnCtx(s, b);
  while (options.length) {
    const i = pickWeighted(options.map(k => d.weights[k]), rng);
    const k = options[i]!;
    const inst = FAMILY[k].spawn(ctx, rng);
    if (inst) {
      if (k === 'terrain') s.terrains.push(inst as TerrainHazard); else s.hazards.push(inst as TimedHazard);
      if (k === 'maze') s.mazeCooldownMs = b.maze.cooldownMs;
      if (k !== 'rock') s.events.push({ type: 'hazardIncoming', family: k });
      return;
    }
    options.splice(i, 1);                      // didn't fit: try something else
  }
}
