import { expect, it } from 'vitest';
import { loadBalance } from '../support/balance';
import { sweepAllowed, sweepCycle, sweepX } from '../../src/game/flow/sweepModel';

it('D3-R21 one sweep per pulse period: the cycle index steps every periodMs from t0', () => {
  expect(sweepCycle(1000, 1000, 900)).toBe(0); expect(sweepCycle(1899, 1000, 900)).toBe(0); expect(sweepCycle(1900, 1000, 900)).toBe(1);
});
it('D3-R21 the band crosses the face left to right in sweepMs, then hides', () => {
  expect(sweepX(0, 420, 280, 50)).toBeCloseTo(-140 - 50);
  expect(sweepX(420, 420, 280, 50)).toBeCloseTo(140 + 50);
  expect(sweepX(210, 420, 280, 50)).toBeCloseTo(0);
  expect(sweepX(421, 420, 280, 50)).toBeNull(); expect(sweepX(-1, 420, 280, 50)).toBeNull();
});
it('D3-R28 no sweep under reduced motion or motion=off', () => {
  expect(sweepAllowed(false, false)).toBe(true); expect(sweepAllowed(true, false)).toBe(false); expect(sweepAllowed(false, true)).toBe(false);
});
it('D3-R21 the sweep eases in and out (slow at the edges, fastest in the middle)', () => {
  const at = (ms: number): number => sweepX(ms, 1000, 280, 50)!;
  expect(at(100) - at(0)).toBeLessThan(0.5 * (at(550) - at(450)));
  expect(at(1000) - at(900)).toBeLessThan(0.5 * (at(550) - at(450)));
});
it('D3-R21 Home sweep lasts long enough to read and fits inside one pulse period', () => {
  const m = loadBalance().motion;
  expect(m.d3.sweepMs).toBeGreaterThanOrEqual(800);
  expect(m.d3.sweepMs).toBeLessThan(m.pulsePeriodMs * m.d3.sweepEveryPulses);
});
