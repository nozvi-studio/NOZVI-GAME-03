import { describe, it, expect } from 'vitest';
import type { FamilyKey, SimSnapshot } from '../../../src/core/types';
import { checkModifierSpawn, checkShrink, runFamilyFuzz } from '../../support/familyFuzz';
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

it('MEC-018 fuzz: ring never closes on the snake or near the head; nothing collectible on an active ring', () => {
  expect(runFamilyFuzz({ family: 'shrink', mode: 'solo', startLevel: 27, seeds: 3, durationMs: 30000, escape: 'sample' })).toEqual([]);
}, 10000);

describe('MEC-018 invariants detect violations', () => {
  const b = loadBalance();
  const ring = (state: 'warn' | 'closed' | 'fade', on: boolean) => ({ state, leftMs: 0, cells: [{ x: 0, y: 5, on }] });
  const snap = (shrink: ReturnType<typeof ring>, over: object = {}) => ({
    snake: [{ x: 5, y: 5 }], dir: { x: 1, y: 0 }, mango: null, orbs: [], rainMangoes: [], families: { shrink }, ...over,
  }) as unknown as SimSnapshot;
  const run = (prev: SimSnapshot, cur: SimSnapshot) => { const out: string[] = []; checkShrink(prev, cur, b, m => out.push(m)); return out; };
  it('MEC-018-I1 a ring cell closing near the head or on the snake is reported', () => {
    const near = { snake: [{ x: 1, y: 5 }] };
    expect(run(snap(ring('warn', false), near), snap(ring('closed', true), near)).join()).toContain('MEC-018-I1');
    const on = { snake: [{ x: 9, y: 9 }, { x: 0, y: 5 }] };
    expect(run(snap(ring('warn', false), { snake: [{ x: 9, y: 9 }] }), snap(ring('closed', true), on)).join()).toContain('on the snake');
  });
  it('MEC-018-I2 a collectible on an active ring cell is reported', () => {
    expect(run(snap(ring('warn', false)), snap(ring('warn', false), { orbs: [{ x: 0, y: 5, leftMs: 1 }] })).join()).toContain('MEC-018-I2');
  });
  it('MEC-018-I3 a closed cell in the fade phase is reported', () => {
    expect(run(snap(ring('closed', true)), snap(ring('fade', true))).join()).toContain('MEC-018-I3');
  });
  it('MEC-018-I1 a legal close far from the head is clean', () => {
    expect(run(snap(ring('warn', false)), snap(ring('closed', true)))).toEqual([]);
  });
});
