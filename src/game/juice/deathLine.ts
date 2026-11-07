import type { CauseKey } from '../../core';
import { rngFrom, seedRng } from '../../core/rng';
import { DEATH_LINES } from '../text';
// P3a-R10 seeded pick so a given run always shows the same line; this RNG is private and never touches the sim RNG.
export const pickDeathLine = (cause: CauseKey, seed: number): string => rngFrom(seedRng(seed)).pick(DEATH_LINES[cause]);
// Stable per-run seed from run facts (no clock, no sim RNG).
export const deathSeed = (score: number, level: number, timeMs: number): number =>
  (Math.imul(score + 1, 2654435761) ^ Math.imul(level + 1, 40503) ^ Math.imul(Math.floor(timeMs) + 1, 2246822519)) >>> 0;
