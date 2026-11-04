import type { Rng } from '../../src/core/rng';

/** Scripted RNG answers with call recording for shape, hazard and terrain tests. */
export function fixed(ints: number[], chances: boolean[] = [], nexts: number[] = []) {
  const calls: string[] = [];
  const rng: Rng = {
    next: () => { calls.push('next'); return nexts.shift() ?? 0; },
    int: n => { calls.push(`int(${n})`); return ints.shift() ?? 0; },
    pick<T>(a: readonly T[]): T { calls.push(`pick(${a.length})`); return a[ints.shift() ?? 0] as T; },
    chance: p => { calls.push(`chance(${p})`); return chances.shift() ?? false; },
  };
  return { rng, calls };
}

