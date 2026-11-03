// tests/qa/task7-clock.qa.test.ts — independent black-box QA tests for Task 7 clock
import { describe, expect, it } from 'vitest';
import { clockStep, createClock, type FrameClock } from '../../src/game/flow/clock';

describe('QA Task 7: Frame Clock (Black-Box)', () => {
  it('QA-T7-01 P0-Design §4 createClock initializes frame clock with zero carry', () => {
    const clock = createClock();
    expect(clock).toBeDefined();
    expect(clock.carry).toBe(0);
  });

  it('QA-T7-02 P0-Design §4 integer delta within maxMs advances exact integer ms', () => {
    const clock = createClock();
    const ms = clockStep(clock, 16, 100);
    expect(ms).toBe(16);
    expect(clock.carry).toBe(0);
  });

  it('QA-T7-03 P0-Design §4 delta exceeding maxMs is clamped to maxMs (100 ms limit)', () => {
    const clock = createClock();
    const ms = clockStep(clock, 250, 100);
    expect(ms).toBe(100);
    expect(clock.carry).toBe(0);

    const huge = clockStep(clock, 10000, 100);
    expect(huge).toBe(100);
  });

  it('QA-T7-04 P0-Design §4 negative delta is clamped to zero without reducing carry', () => {
    const clock = createClock();
    clockStep(clock, 0.75, 100); // carry becomes 0.75
    expect(clock.carry).toBeCloseTo(0.75, 5);

    const ms = clockStep(clock, -50, 100);
    expect(ms).toBe(0);
    expect(clock.carry).toBeCloseTo(0.75, 5);
  });

  it('QA-T7-05 P0-Design §4 zero delta returns zero and preserves existing carry', () => {
    const clock = createClock();
    clockStep(clock, 0.4, 100);
    const ms = clockStep(clock, 0, 100);
    expect(ms).toBe(0);
    expect(clock.carry).toBeCloseTo(0.4, 5);
  });

  it('QA-T7-06 P0-Design §4 fractional delta carries over to preserve exact cumulative time', () => {
    const clock = createClock();
    // 60 FPS typical deltas: 16.666... ms
    const d = 1000 / 60; // ~16.666667
    const steps: number[] = [];
    for (let i = 0; i < 60; i++) {
      steps.push(clockStep(clock, d, 100));
    }
    const totalMs = steps.reduce((a, b) => a + b, 0);
    expect(totalMs).toBe(1000);
    expect(clock.carry).toBeCloseTo(0, 5);
  });

  it('QA-T7-07 P0-Design §4 sub-millisecond deltas accumulate until reaching 1 ms', () => {
    const clock = createClock();
    expect(clockStep(clock, 0.3, 100)).toBe(0);
    expect(clockStep(clock, 0.3, 100)).toBe(0);
    expect(clockStep(clock, 0.3, 100)).toBe(0);
    expect(clockStep(clock, 0.3, 100)).toBe(1); // 0.3 * 4 = 1.2 -> returns 1, carry 0.2
    expect(clock.carry).toBeCloseTo(0.2, 5);
  });

  it('QA-T7-08 P0-Design §4 clamping with fractional carry handles boundary conditions', () => {
    const clock = createClock();
    clockStep(clock, 0.9, 100); // carry 0.9
    // delta 100 clamped to 100 -> 100 + 0.9 = 100.9 -> returns 100, carry 0.9
    const ms = clockStep(clock, 100, 100);
    expect(ms).toBe(100);
    expect(clock.carry).toBeCloseTo(0.9, 5);
  });

  it('QA-T7-09 P0-Design §4 distinct clock instances do not share state', () => {
    const c1: FrameClock = createClock();
    const c2: FrameClock = createClock();
    clockStep(c1, 0.8, 100);
    expect(c1.carry).toBeCloseTo(0.8, 5);
    expect(c2.carry).toBe(0);
  });
});
