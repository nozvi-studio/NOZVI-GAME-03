// src/core/level.ts — MEC-003 levels, 10-level prototype version (needFor L169, addProgress L601–612, updateSpeed L620–623)
import type { Balance } from './balance';
import type { SimState, UnlockKey } from './types';

const UNLOCK_ORDER: readonly UnlockKey[] = ['fence', 'terrain', 'maze'];

export const needFor = (b: Balance, level: number): number => b.level.needBase + b.level.needPerLevel * level;
export const tickMsFor = (b: Balance, level: number): number =>
  Math.max(b.speed.minMs, b.speed.startMs - b.speed.msPerLevel * level);
export const unlockedAt = (b: Balance, level: number): UnlockKey | undefined =>
  UNLOCK_ORDER.find(k => b.level.unlock[k] === level);
export const isUnlocked = (b: Balance, level: number, k: UnlockKey): boolean => level >= b.level.unlock[k];

// MEC-003 add progress; overflow carries; one levelUp per level gained; progress stays 0 at max level
export function addProgress(s: SimState, b: Balance, n: number): void {
  const max = b.level.maxLevel;
  if (s.level < max) s.progress += n;
  while (s.level < max && s.progress >= needFor(b, s.level)) {
    s.progress -= needFor(b, s.level);
    s.level += 1;
    const unlocked = unlockedAt(b, s.level);
    s.events.push(unlocked ? { type: 'levelUp', level: s.level, unlocked } : { type: 'levelUp', level: s.level });
  }
  if (s.level >= max) s.progress = 0;
}
