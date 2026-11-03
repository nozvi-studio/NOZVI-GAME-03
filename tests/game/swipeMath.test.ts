// tests/game/swipeMath.test.ts
import { describe, expect, it } from 'vitest';
import { swipeDir, swipePoint, swipeThreshold } from '../../src/game/input/swipeMath';

describe('GDD-13 swipe math (L750–757)', () => {
  it('GDD-13 threshold is max(18, boardCssPx * 0.05)', () => {
    expect(swipeThreshold(300, 18, 0.05)).toBe(18);
    expect(swipeThreshold(500, 18, 0.05)).toBe(25);
  });
  it('GDD-13 below the threshold on both axes gives null', () => { expect(swipeDir(17, -17, 18)).toBeNull(); });
  it('GDD-13 larger axis wins; a tie goes vertical', () => {
    expect(swipeDir(30, 10, 18)).toEqual([1, 0]);
    expect(swipeDir(-5, -20, 18)).toEqual([0, -1]);
    expect(swipeDir(20, -20, 18)).toEqual([0, -1]);
  });
  it('GDD-13 swipe coordinates use client pixels for mouse events', () => {
    expect(swipePoint({ clientX: 125, clientY: 280 }, 0)).toEqual({ x: 125, y: 280 });
  });
  it('GDD-13 swipe coordinates select the active finger from touch events', () => {
    expect(swipePoint({ changedTouches: [
      { identifier: 4, clientX: 100, clientY: 200 }, { identifier: 7, clientX: 300, clientY: 400 },
    ] }, 7)).toEqual({ x: 300, y: 400 });
  });
  it('GDD-13 unrelated touch events do not move the active swipe', () => {
    expect(swipePoint({ changedTouches: [{ identifier: 4, clientX: 100, clientY: 200 }] }, 7)).toBeNull();
  });
});
