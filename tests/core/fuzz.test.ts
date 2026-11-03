// tests/core/fuzz.test.ts
import { describe, expect, it } from 'vitest';
import { fuzzSeed } from '../support/fuzz';
import { loadBalance } from '../support/balance';

const b = loadBalance();
const SEEDS = import.meta.env.MODE === 'fuzz' ? 200 : 50;

describe('MEC-004 fuzz invariants', () => {
  it(`MEC-004 fuzz: ${SEEDS} seeds × 120 s keep every invariant`, () => {
    const spawned = { rock: 0, fence: 0, maze: 0, terrain: 0 };
    let steps = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = fuzzSeed(b, seed, 120_000);
      expect(r.violations, `seed ${seed}`).toEqual([]);
      steps += r.steps;
      for (const k of Object.keys(spawned) as (keyof typeof spawned)[]) spawned[k] += r.spawned[k];
    }
    expect(steps).toBeGreaterThan(SEEDS * 500);                        // the harness really moved the snake
    expect(Object.values(spawned).every(n => n > 0)).toBe(true);       // every family was exercised
  }, 60_000);
});
