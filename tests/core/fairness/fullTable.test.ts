import { it, expect } from 'vitest';
import { runFamilyFuzz } from '../../support/familyFuzz';

it('MEC-004-R17 full shipped table at L30 keeps invariants I1-I7 and escape for every family', () => {
  expect(runFamilyFuzz({ family: 'shrink', mode: 'full', startLevel: 30, seeds: 3, durationMs: 30000, escape: 'sample' })).toEqual([]);
}, 10000);
