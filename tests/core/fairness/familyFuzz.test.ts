import { describe, it, expect } from 'vitest';
import type { FamilyKey } from '../../../src/core/types';
import { checkModifierSpawn, runFamilyFuzz } from '../../support/familyFuzz';
import { loadBalance } from '../../support/balance';
import { buildBoard } from '../../support/board';
const FUZZ = import.meta.env.MODE === 'fuzz';
// Fuzz-mode size; override with VITE_FUZZ_SEEDS / VITE_FUZZ_MS (full matrix 200 x 120000 for overnight runs).
const FUZZ_SEEDS = Number(import.meta.env.VITE_FUZZ_SEEDS ?? 200);
const FUZZ_MS = Number(import.meta.env.VITE_FUZZ_MS ?? 120000);
const INTRO = { rock: 1, fence: 6, terrain: 11, maze: 26, mud: 7, ice: 13, coconut: 16, gate: 17, spike: 18, npc: 21, bird: 22, bomb: 23, shrink: 27 } as const;
describe('MEC-004-R17 per-family fuzz', () => {
  for (const [family, level] of Object.entries(INTRO)) {
    it(`MEC-004-R17 fuzz invariants I1-I7 hold for ${family}`, () => {
      const runs = FUZZ
        ? (['solo', 'full'] as const).flatMap(mode => [level, 30].map(startLevel => ({ mode, startLevel })))
        : [{ mode: 'solo' as const, startLevel: level }];
      for (const r of runs) {
        expect(runFamilyFuzz({ family: family as FamilyKey, ...r, seeds: FUZZ ? FUZZ_SEEDS : 2,
          durationMs: FUZZ ? FUZZ_MS : 20000, escape: FUZZ ? 'all' : 'sample' })).toEqual([]);
      }
    }, FUZZ ? 0 : 10000);
  }
});

it('MEC-012-R10 fuzz: every slide exit is in bounds and holds no hazard mango orb or rain mango', () => {
  expect(runFamilyFuzz({ family: 'ice', mode: 'solo', startLevel: 13, seeds: 2,
    durationMs: 20000, escape: 'sample' })).toEqual([]);
});

it.each([13, 30])('MEC-012-EC10 a mud patch never touches an ice patch at L%s', startLevel => {
  expect(runFamilyFuzz({ family: 'ice', mode: 'full', startLevel, seeds: 2,
    durationMs: 20000, escape: 'off' })).toEqual([]);
});

it('MEC-004-R17 a modifier family with no explicit invariant fails the fuzz instead of skipping', () => {
  const b = loadBalance(), s = buildBoard({ head: [8, 8], mango: [12, 8], level: 22 });
  const bad: string[] = [];
  checkModifierSpawn('bird', s, b, m => bad.push(m), {});
  expect(bad).toEqual(['modifier bird has no invariant']);
  const ok: string[] = [];
  checkModifierSpawn('bird', s, b, m => ok.push(m), { bird: { holds: () => true, fail: 'x' } });
  expect(ok).toEqual([]);
});
