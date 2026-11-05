// MEC-003 1-based levels and the per-level family table.
import type { Balance } from './balance';
import type { IntroKey, LevelRow, TableFamily } from './types';

const TABLE_ORDER: readonly TableFamily[] = ['rock', 'fence', 'terrain', 'maze', 'mud', 'ice', 'coconut'];
export const biome = (b: Balance, n: number): number => Math.floor((n - 1) / b.level.perBiome) + 1; // MEC-003-R1
export const isChallenge = (b: Balance, n: number): boolean => n % b.level.perBiome === 0; // MEC-003-R1
export const quota = (b: Balance, n: number): number => b.level.needBase + Math.floor((n - 1) / b.level.needStepLevels); // MEC-003-R2
export const levelTickMs = (b: Balance, n: number): number => Math.max(b.speed.minMs, b.speed.startMs - b.speed.msPerLevel * (n - 1)); // MEC-003-R3
export function directorIntervalMs(b: Balance, n: number): number { // MEC-003-R4
  const d = b.director, base = Math.max(d.intervalMinMs, d.intervalBaseMs - d.intervalPerLevelMs * n);
  return isChallenge(b, n) ? Math.floor(base * d.challengeIntervalFactor) : base;
}
export function smallHazardCap(b: Balance, n: number): number { // MEC-003-R4
  const d = b.director, base = Math.min(d.capMax, d.capBase + Math.floor(n / d.capPerLevels));
  return isChallenge(b, n) ? base + d.challengeCapBonus : base;
}
export const familyRow = (b: Balance, n: number): LevelRow => b.level.table.find(r => r.from <= n && n <= r.to)!; // MEC-003-R14
export const enabledFamilies = (b: Balance, n: number): TableFamily[] => // MEC-003-R14
  TABLE_ORDER.filter(k => (familyRow(b, n).weights[k] ?? 0) > 0);
export function introducedAt(b: Balance, n: number): IntroKey | undefined { // MEC-003-R16 first enable, even after a disabled row
  const row = familyRow(b, n);
  const current: IntroKey[] = [...enabledFamilies(b, n), ...(row.rottenRocks ? ['rottenRock' as const] : [])];
  return current.find(k => !b.level.table.some(r => r.to < n && (k === 'rottenRock' ? r.rottenRocks : (r.weights[k] ?? 0) > 0)) && n === row.from);
}
export const fenceFirstLevel = (b: Balance): number => b.level.table.find(r => (r.weights.fence ?? 0) > 0)?.from ?? Infinity; // MEC-003-R15

// P0 public names retained for its existing consumers; all now take 1-based levels.
export const needFor = quota;
export const tickMsFor = levelTickMs;
export const unlockedAt = introducedAt;
export const isUnlocked = (b: Balance, n: number, k: IntroKey): boolean =>
  k === 'rottenRock' ? familyRow(b, n).rottenRocks : enabledFamilies(b, n).includes(k);
