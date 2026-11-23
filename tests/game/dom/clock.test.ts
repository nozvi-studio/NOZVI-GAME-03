// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { systemClock } from '../../../src/game/dom/clock';
import { FakeClock } from './fakeClock';

describe('D4-P2 MotionClock and FakeClock', () => {
  it('D4-P2-R3 FakeClock fires timeouts at exact due time and tracks pending timers/rAF', () => {
    const clock = new FakeClock();
    const fn = vi.fn();
    clock.setTimeout(fn, 100);
    expect(clock.pending()).toBe(1);
    clock.advance(99);
    expect(fn).not.toHaveBeenCalled();
    clock.advance(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(clock.pending()).toBe(0);
  });

  it('D4-P2-R3 cancelled rAF never runs and systemClock exposes valid random', () => {
    const clock = new FakeClock();
    const fn = vi.fn();
    const id = clock.raf(fn);
    expect(clock.pending()).toBe(1);
    clock.cancelRaf(id);
    clock.frame();
    expect(fn).not.toHaveBeenCalled();
    expect(clock.pending()).toBe(0);
    const r = systemClock.random();
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(1);
  });
});
