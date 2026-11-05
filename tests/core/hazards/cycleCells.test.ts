import { it, expect } from 'vitest';
import { cyclePhase, stepCycleCell, type CycleCell } from '../../../src/core/hazards/blocks/cycleCells';

const P = { downMs: 2400, warnMs: 900, upMs: 1500 };
it('MEC-004-R5 cyclePhase walks down warn up and repeats', () => {
  for (const [t, phase] of [[-1, 'down'], [0, 'down'], [2399, 'down'], [2400, 'warn'],
    [3299, 'warn'], [3300, 'up'], [4799, 'up'], [4800, 'down']] as const)
    expect(cyclePhase(P, t)).toBe(phase);
});
it('MEC-004-R5 a cycle cell under the snake stays warn until the snake leaves', () => {
  const c: CycleCell = { x: 1, y: 1, delay: 0, up: false, vis: 'down' };
  stepCycleCell(c, P, 3300, () => true);
  expect(c).toMatchObject({ up: false, vis: 'warn' });
  stepCycleCell(c, P, 3301, () => false);
  expect(c).toMatchObject({ up: true, vis: 'up' });
  stepCycleCell(c, P, 4800, () => false);
  expect(c).toMatchObject({ up: false, vis: 'down' });
  stepCycleCell(c, P, 7200, () => false);
  expect(c).toMatchObject({ up: false, vis: 'warn' });
});
