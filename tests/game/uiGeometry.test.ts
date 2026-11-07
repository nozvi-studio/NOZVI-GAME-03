import { expect, it } from 'vitest';
import { pillGeom, pillHitRect, barFill } from '../../src/game/ui/geometry';
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
it('P3-0-R7 pill hit rect covers the face and the shelf below, in container hit space', () => {
  const g = pillGeom(200, 60);
  // Phaser adds displayOrigin (w/2, h/2 of the container sized w x h) before the hit test.
  const r = pillHitRect(g);
  expect(r).toEqual({ x: 0, y: 0, w: g.w, h: g.h + g.shelf });
  const toLocal = (hx: number, hy: number) => ({ x: hx - g.w / 2, y: hy - g.h / 2 });
  expect(toLocal(r.x, r.y).y).toBe(-g.h / 2); // top edge = top of face
  expect(toLocal(r.x, r.y + r.h).y).toBeCloseTo(g.h / 2 + g.shelf, 9); // bottom edge = bottom of shelf
});
