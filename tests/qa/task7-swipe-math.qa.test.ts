// tests/qa/task7-swipe-math.qa.test.ts — independent black-box QA tests for Task 7 swipe math
import { describe, expect, it } from 'vitest';
import { swipeDir, swipePoint, swipeThreshold } from '../../src/game/input/swipeMath';

describe('QA Task 7: Swipe Math (Black-Box)', () => {
  it('QA-T7-33 P0-Design §7.3 swipeThreshold takes max of minPx and scaled board dimension', () => {
    // 300 * 0.05 = 15 < 18 -> 18
    expect(swipeThreshold(300, 18, 0.05)).toBe(18);
    // 500 * 0.05 = 25 > 18 -> 25
    expect(swipeThreshold(500, 18, 0.05)).toBe(25);
    // 800 * 0.05 = 40 > 18 -> 40
    expect(swipeThreshold(800, 18, 0.05)).toBe(40);
    // 0 board px -> minPx
    expect(swipeThreshold(0, 18, 0.05)).toBe(18);
  });

  it('QA-T7-34 P0-Design §7.3 swipeDir returns null if both dx and dy are below threshold', () => {
    expect(swipeDir(0, 0, 18)).toBeNull();
    expect(swipeDir(17, 0, 18)).toBeNull();
    expect(swipeDir(0, -17.9, 18)).toBeNull();
    expect(swipeDir(15, -15, 18)).toBeNull();
    expect(swipeDir(-17, 17, 18)).toBeNull();
  });

  it('QA-T7-35 P0-Design §7.3 swipeDir returns horizontal directions when |dx| > |dy|', () => {
    // Right swipe
    expect(swipeDir(30, 10, 18)).toEqual([1, 0]);
    expect(swipeDir(18, 0, 18)).toEqual([1, 0]);
    expect(swipeDir(25, -12, 18)).toEqual([1, 0]);

    // Left swipe
    expect(swipeDir(-30, 5, 18)).toEqual([-1, 0]);
    expect(swipeDir(-18, 0, 18)).toEqual([-1, 0]);
    expect(swipeDir(-22, -10, 18)).toEqual([-1, 0]);
  });

  it('QA-T7-36 P0-Design §7.3 swipeDir returns vertical directions when |dy| > |dx|', () => {
    // Down swipe
    expect(swipeDir(5, 30, 18)).toEqual([0, 1]);
    expect(swipeDir(0, 18, 18)).toEqual([0, 1]);
    expect(swipeDir(-10, 25, 18)).toEqual([0, 1]);

    // Up swipe
    expect(swipeDir(8, -30, 18)).toEqual([0, -1]);
    expect(swipeDir(0, -18, 18)).toEqual([0, -1]);
    expect(swipeDir(-12, -25, 18)).toEqual([0, -1]);
  });

  it('QA-T7-37 P0-Design §7.3 swipeDir tie rule: equal magnitude (|dx| === |dy| >= th) resolves vertical', () => {
    // Down ties
    expect(swipeDir(20, 20, 18)).toEqual([0, 1]);
    expect(swipeDir(-20, 20, 18)).toEqual([0, 1]);
    expect(swipeDir(18, 18, 18)).toEqual([0, 1]);
    expect(swipeDir(-18, 18, 18)).toEqual([0, 1]);

    // Up ties
    expect(swipeDir(20, -20, 18)).toEqual([0, -1]);
    expect(swipeDir(-20, -20, 18)).toEqual([0, -1]);
    expect(swipeDir(18, -18, 18)).toEqual([0, -1]);
    expect(swipeDir(-18, -18, 18)).toEqual([0, -1]);
  });

  it('QA-T7-38 P0-Design §7.3 swipePoint extracts coordinates from mouse/pointer event', () => {
    const mouseEvt = { clientX: 120, clientY: 340 };
    expect(swipePoint(mouseEvt as any, 0)).toEqual({ x: 120, y: 340 });
  });

  it('QA-T7-39 P0-Design §7.3 swipePoint extracts coordinates from touch list by identifier', () => {
    const touchEvt = {
      changedTouches: [
        { identifier: 1, clientX: 50, clientY: 80 },
        { identifier: 2, clientX: 200, clientY: 450 },
      ],
    };
    expect(swipePoint(touchEvt as any, 2)).toEqual({ x: 200, y: 450 });
    expect(swipePoint(touchEvt as any, 1)).toEqual({ x: 50, y: 80 });
    expect(swipePoint(touchEvt as any, 999)).toBeNull();
  });
});
