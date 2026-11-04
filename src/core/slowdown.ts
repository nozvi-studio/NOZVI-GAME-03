// src/core/slowdown.ts — level-up slowdown tiers and easing (MEC-003-R22). Pure; no Phaser.
import type { Balance } from './balance';
import type { SimState } from './types';

// MEC-003-R22 tier of the level just reached; null when that level has no slowdown.
export function slowdownTier(b: Balance, level: number): { factor: number; easeMs: number } | null {
  const t = b.levelUpSlowdown.tiers.find(r => level >= r.from && level <= r.to);
  return t ? { factor: t.factor, easeMs: t.easeMs } : null;
}

// MEC-003-R22 a level up (re)starts the slowdown with the new level's tier.
export function startLevelUpSlow(s: SimState, b: Balance): void {
  const t = slowdownTier(b, s.level);
  s.levelUpSlow = t ? { factor: t.factor, easeMs: t.easeMs, leftMs: t.easeMs } : null;
}

// MEC-003-R22 one sim ms; the slowdown ends exactly easeMs ms after the level up.
export function levelUpSlowTick(s: SimState): void {
  if (s.levelUpSlow && --s.levelUpSlow.leftMs <= 0) s.levelUpSlow = null;
}

// MEC-003-R22 curFactor = 1 + (factor - 1) * leftMs / easeMs.
export function levelUpSlowFactor(s: SimState): number {
  const w = s.levelUpSlow;
  return w ? 1 + (w.factor - 1) * w.leftMs / w.easeMs : 1;
}
