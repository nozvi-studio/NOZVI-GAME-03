// src/core/rng.ts — seeded mulberry32 over a plain RngState stored in SimState (design §3, §4)
export interface RngState { s: number }
export interface Rng {
  next(): number;                       // [0, 1)
  int(n: number): number;               // floor(next() * n)
  pick<T>(arr: readonly T[]): T;        // arr[int(arr.length)]; throws on an empty array
  chance(p: number): boolean;           // next() < p
}

export function seedRng(seed: number): RngState { return { s: seed >>> 0 }; }

export function rngFrom(st: RngState): Rng {
  const next = (): number => {
    st.s = (st.s + 0x6d2b79f5) >>> 0;
    let t = st.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n: number): number => Math.floor(next() * n);
  return {
    next,
    int,
    pick<T>(arr: readonly T[]): T {
      if (arr.length === 0) throw new Error('rng.pick: empty array');
      return arr[int(arr.length)] as T;
    },
    chance: (p: number): boolean => next() < p,
  };
}
