import { describe, it, expect } from 'vitest';
import type { FamilyKey } from '../../../src/core/types';
import { runFamilyFuzz } from '../../support/familyFuzz';
const FUZZ = import.meta.env.MODE === 'fuzz';
const INTRO = { rock: 1, fence: 6, terrain: 11, maze: 26 } as const;
describe('MEC-004-R17 per-family fuzz', () => {
  for (const [family, level] of Object.entries(INTRO)) {
    it(`MEC-004-R17 fuzz invariants I1-I7 hold for ${family}`, () => {
      const runs = FUZZ
        ? (['solo', 'full'] as const).flatMap(mode => [level, 30].map(startLevel => ({ mode, startLevel })))
        : [{ mode: 'solo' as const, startLevel: level }];
      for (const r of runs) {
        expect(runFamilyFuzz({ family: family as FamilyKey, ...r, seeds: FUZZ ? 200 : 2,
          durationMs: FUZZ ? 120000 : 20000, escape: FUZZ ? 'all' : 'sample' })).toEqual([]);
      }
    }, FUZZ ? 0 : 10000);
  }
});
