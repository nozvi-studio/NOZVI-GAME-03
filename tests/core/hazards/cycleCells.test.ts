import { it, expect } from 'vitest';
import { cyclePhase, cycleWarnLeft, stepCycleCell, type CycleCell } from '../../../src/core/hazards/blocks/cycleCells';

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

it('MOT-4-R1 cycleWarnLeft is the remaining warn ms, 0 outside the warn phase and before the origin', () => {
  const p = { downMs: 1000, warnMs: 900, upMs: 500 };
  expect(cycleWarnLeft(p, -5)).toBe(0);
  expect(cycleWarnLeft(p, 500)).toBe(0);            // down
  expect(cycleWarnLeft(p, 1000)).toBe(900);         // first ms of warn
  expect(cycleWarnLeft(p, 1400)).toBe(500);
  expect(cycleWarnLeft(p, 1899)).toBe(1);
  expect(cycleWarnLeft(p, 1900)).toBe(0);           // up (or held in warn by the snake): at the hit
  expect(cycleWarnLeft(p, 2400 + 1100)).toBe(800);  // next cycle (period 2400)
});
