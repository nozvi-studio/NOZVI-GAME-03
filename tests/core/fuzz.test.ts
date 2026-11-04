// tests/core/fuzz.test.ts
import { describe, expect, it } from 'vitest';
import { fuzzSeed } from '../support/fuzz';
import { loadBalance } from '../support/balance';
import { detSim, p1FuzzSeed, play, script, START_LEVELS, stateJson } from '../support/p1fuzz';
import { exportState } from '../../src/core/sim';

const b = loadBalance();
const SEEDS = import.meta.env.MODE === 'fuzz' ? 200 : 5;

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

// P1 design §10.3: npm test 20 seeds × 10 s; npm run test:fuzz 200 seeds × 20 s (plan 30 s; wall-time rule).
const P1_SEEDS = import.meta.env.MODE === 'fuzz' ? 200 : 20;
const P1_MS = import.meta.env.MODE === 'fuzz' ? 20_000 : 10_000;   // plan: 30 s; lowered so test:fuzz stays < 60 s (DECISIONS)

describe('P1 skill fuzz', () => {
  const reports = Array.from({ length: P1_SEEDS }, (_, i) => p1FuzzSeed(b, i + 1, P1_MS));
  const all = reports.flatMap(r => r.violations);
  const only = (re: RegExp) => all.filter(v => re.test(v));
  it('MEC-006-R2 fuzz: energy stays in [0, energy.max]', () => { expect(only(/energy/)).toEqual([]); });
  it('MEC-001-R7 fuzz: snake length never below minLength', () => { expect(only(/length/)).toEqual([]); });
  it('MEC-001-R9 fuzz: no snake step and no death during the transition', () => { expect(only(/transition/)).toEqual([]); });
  it('P0 fuzz: at most one snake step per 1 ms step', () => { expect(only(/jumped/)).toEqual([]); });
  it('MEC-002-R2 no placement ever uses a reserved cell', () => { expect(only(/reserved/)).toEqual([]); });
  it(`MEC-006-R6 fuzz: orbs never on reserved, unreachable or near-head cells (${P1_SEEDS} seeds)`, () => {
    expect(only(/unfair/)).toEqual([]);
    expect(reports.reduce((n, r) => n + r.orbs, 0)).toBeGreaterThan(0);
  });
  it('MEC-006-R32 fuzz: rain progress per cast never exceeds its budget', () => {
    expect(only(/budget/)).toEqual([]);
    expect(reports.reduce((n, r) => n + r.rainDrops, 0)).toBeGreaterThan(0);
  });
  it('MEC-001-R11 snake never moves after died', () => { expect(only(/after over/)).toEqual([]); });
  it('P1 fuzz: no other violation; skills, shield breaks and level-ups were exercised', () => {
    expect(all).toEqual([]);
    expect(reports.reduce((n, r) => n + r.skillsUsed, 0)).toBeGreaterThan(P1_SEEDS / 2);
    expect(reports.reduce((n, r) => n + r.shieldBreaks, 0)).toBeGreaterThan(0);
    if (import.meta.env.MODE === 'fuzz') expect(reports.reduce((n, r) => n + r.levelUps, 0)).toBeGreaterThan(0);
  });
});

describe('P1 determinism', () => {
  const T = 10_000;
  it('MEC-006-R35 determinism: same seed + same timed turn/useSkill calls → same snapshot hash, any advance chunking', () => {
    for (const [i, level] of START_LEVELS.entries()) {
      const seed = 7 + i, inputs = script(seed, T);
      const out = [1, 7, 16, 1000].map(chunk => { const sim = detSim(b, seed, level); play(sim, inputs, 0, T, chunk); return stateJson(sim); });
      expect(new Set(out).size).toBe(1);
      // clone at T/2, same inputs → equal; advancing the clone leaves the original unchanged
      const orig = detSim(b, seed, level); play(orig, inputs, 0, T / 2, 16);
      const atHalf = stateJson(orig), copy = orig.clone();
      play(copy, inputs, T / 2, T, 16);
      expect(stateJson(orig)).toBe(atHalf);
      play(orig, inputs, T / 2, T, 1000);
      expect(stateJson(copy)).toBe(stateJson(orig));
      expect(stateJson(orig)).toBe(out[0]);
      const st = exportState(orig);
      expect(JSON.parse(JSON.stringify(st))).toEqual(st);
    }
  });
  it('MEC-003 determinism extended: start levels 1, 4, 12, 26 replay identically', () => {
    for (const level of START_LEVELS) {
      const run = () => { const sim = detSim(b, 99, level); play(sim, script(99, T), 0, T, 33); return stateJson(sim); };
      expect(run()).toBe(run());
    }
  });
});
