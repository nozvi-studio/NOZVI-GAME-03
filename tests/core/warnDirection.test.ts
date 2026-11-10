import '../../src/core/simInternal'; // loads the hazard registry before the family modules (import cycle)
import { expect, it } from 'vitest';
import { bombSnapshot } from '../../src/core/hazards/bomb';
import { shrinkSnapshot } from '../../src/core/hazards/shrink';
import { makeTimed, updateTimed } from '../../src/core/hazards/timed';
import type { SimState, StepCtx } from '../../src/core/types';
import { loadBalance } from '../support/balance';

const b = loadBalance();

it('MOT-4-R1 a warning hazard t counts ELAPSED warn ms (remaining = warnMs - t) and resets to 0 on the live edge', () => {
  const h = makeTimed('rock', [{ x: 1, y: 1 }], 1000, 5000);
  const ctx = { snakeOn: () => false, emit: () => {}, balance: b } as unknown as StepCtx;
  for (let i = 0; i < 250; i++) updateTimed(h, ctx);
  expect(h.state).toBe('warn');
  expect(h.t).toBe(250);
  expect(h.warnMs - h.t).toBe(750);
  for (let i = 0; i < 750; i++) updateTimed(h, ctx);
  expect(h.state).toBe('solid');
  expect(h.t).toBeLessThan(5);
});

it('MOT-4-R1 a warning bomb snapshot leftMs is REMAINING warn ms', () => {
  const s = { families: { bomb: { bombs: [{ id: 1, x: 2, y: 2, t: 400, warnMs: 1000, landed: false, blast: null }] } } } as unknown as SimState;
  expect(bombSnapshot(s)[0]).toMatchObject({ state: 'warn', leftMs: 600 });
});

it('MOT-4-R1 a warning ring snapshot leftMs is REMAINING phase ms', () => {
  const s = { families: { shrink: { active: { t: 500, phase: 'warn', cells: [] } } } } as unknown as SimState;
  expect(shrinkSnapshot(s, b)).toMatchObject({ state: 'warn', leftMs: b.shrink.warnMs - 500 });
});
