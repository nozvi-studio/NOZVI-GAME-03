// tests/game/clock.test.ts
import { describe, expect, it } from 'vitest';
import { clockStep, createClock } from '../../src/game/flow/clock';

describe('GDD-13 frame clock', () => {
  it('GDD-13 clock clamps the frame delta to 100 ms (L989)', () => {
    expect(clockStep(createClock(), 5000, 100)).toBe(100);
  });
  it('GDD-13 clock carries fractions so total ms are exact', () => {
    const c = createClock();
    const out = [16.7, 16.7, 16.6].map(d => clockStep(c, d, 100));
    expect(out).toEqual([16, 17, 17]);
    expect(c.carry).toBeCloseTo(0, 9);
  });
  it('GDD-13 clock ignores negative deltas', () => { expect(clockStep(createClock(), -5, 100)).toBe(0); });
});
