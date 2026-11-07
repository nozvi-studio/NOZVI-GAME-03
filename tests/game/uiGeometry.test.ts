import { expect, it } from 'vitest';
import { pillGeom, barFill } from '../../src/game/ui/geometry';
import { ui } from '../../src/game/ui/layout';
it('P3-0-R7 pill geometry is fully rounded with a shelf', () => {
  const g = pillGeom(200, 60);
  expect(g).toEqual({ w: ui(200), h: ui(60), radius: ui(60) / 2, shelf: ui(5), pressedDy: ui(3), labelStroke: ui(4) });
});
it('P3-0-R7 bar fill clamps', () => {
  expect(barFill(5, 10, 100)).toBe(50);
  expect(barFill(15, 10, 100)).toBe(100);
  expect(barFill(-1, 10, 100)).toBe(0);
  expect(barFill(3, 0, 100)).toBe(0);
});
