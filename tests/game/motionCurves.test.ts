import { describe, expect, it } from 'vitest';
import { backOut, clamp01, countUpValue, cubicOut, lerp, mangoGrow, pulseScale, sineInOut, staggerDelay, turnTilt } from '../../src/game/motion/curves';

describe('MOT-0 curves', () => {
  it('MOT-0-R1 easings hit 0 at t=0 and 1 at t=1 and clamp outside', () => {
    for (const f of [cubicOut, sineInOut, (t: number) => backOut(t, 1.7)]) {
      expect(f(0)).toBeCloseTo(0, 10); expect(f(1)).toBeCloseTo(1, 10);
      expect(f(-3)).toBeCloseTo(0, 10); expect(f(9)).toBeCloseTo(1, 10);
    }
  });
  it('MOT-0-R1 backOut overshoots above 1 before settling', () => {
    expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map(t => backOut(t, 1.7)))).toBeGreaterThan(1);
  });
  it('MOT-0-R3 staggerDelay grows by step and is capped', () => {
    expect([0, 1, 2].map(i => staggerDelay(i, 50, 300))).toEqual([0, 50, 100]);
    expect(staggerDelay(99, 50, 300)).toBe(300); expect(staggerDelay(-2, 50, 300)).toBe(0);
  });
  it('MOT-0-R5 countUpValue is monotone, integer and exact at the end', () => {
    const v = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].map(t => countUpValue(0, 1234, t));
    expect(v[0]).toBe(0); expect(v[v.length - 1]).toBe(1234);
    for (let i = 1; i < v.length; i++) expect(v[i]!).toBeGreaterThanOrEqual(v[i - 1]!);
    expect(v.every(Number.isInteger)).toBe(true);
    expect(countUpValue(50, 10, 1)).toBe(10); expect(countUpValue(50, 10, 0)).toBe(50);
  });
  it('MOT-0-R3 pulseScale is 1 +/- amp with the exact period', () => {
    expect(pulseScale(0, 900, 0.04)).toBeCloseTo(1, 10);
    expect(pulseScale(225, 900, 0.04)).toBeCloseTo(1.04, 10);
    expect(pulseScale(900, 900, 0.04)).toBeCloseTo(1, 10);
    expect(lerp(2, 4, 0.5)).toBe(3); expect(clamp01(2)).toBe(1);
  });
});

describe('MOT-3 curves', () => {
  it('MOT-3-R11 mangoGrow is 0.85 at birth, overshoots 1 and is exactly 1 at the end', () => {
    expect(mangoGrow(500, 500, 240, 1.7, 0.85)).toBeCloseTo(0.85, 10);
    expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map(k => mangoGrow(500 + 240 * k, 500, 240, 1.7, 0.85)))).toBeGreaterThan(1);
    expect(mangoGrow(740, 500, 240, 1.7, 0.85)).toBeCloseTo(1, 10);
    expect(mangoGrow(9999, 500, 240, 1.7, 0.85)).toBeCloseTo(1, 10);
    expect(mangoGrow(100, 500, 240, 1.7, 0.85)).toBeCloseTo(0.85, 10); // clamps before birth
  });
  it('MOT-3-R12 turnTilt starts at +-deg and returns to 0 at turnMs', () => {
    expect(turnTilt(0, 140, 10, 1.7)).toBeCloseTo(10, 10);
    expect(turnTilt(0, 140, -10, 1.7)).toBeCloseTo(-10, 10);
    expect(turnTilt(140, 140, 10, 1.7)).toBeCloseTo(0, 10);
    expect(turnTilt(999, 140, 10, 1.7)).toBeCloseTo(0, 10);
    expect(turnTilt(70, 140, 10, 1.7)).toBeLessThan(10);
  });
});
