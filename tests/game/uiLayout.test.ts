import { expect, it } from 'vitest';
import { UI_SCALE, ui, layoutColumn } from '../../src/game/ui/layout';
it('P3-0-R2 ui() maps 390 mockup px to the 540 game width', () => {
  expect(UI_SCALE).toBeCloseTo(540 / 390);
  expect(ui(390)).toBeCloseTo(540);
  expect(ui(16)).toBeCloseTo(22.15, 2);
});
it('P3-0-R2 middle block centres in the free space when it fits', () => {
  const l = layoutColumn({ top: 100, middle: 200, bottom: 100, minShrink: 0.85 });
  expect(l.topY).toBe(0);
  expect(l.bottomY).toBeCloseTo(960 - ui(100));
  expect(l.middleScale).toBe(1);
  expect(l.middleY).toBeCloseTo(ui(100) + (960 - ui(100) - ui(100) - ui(200)) / 2);
  expect(l.middleY + ui(200)).toBeLessThanOrEqual(l.bottomY);
  expect(l.middleY).toBeGreaterThanOrEqual(ui(100));
  expect(l.fits).toBe(true);
});
it('P3-0-R2 middle block shrinks uniformly when too tall, never below minShrink', () => {
  const l = layoutColumn({ top: 150, middle: 500, bottom: 150, minShrink: 0.85 });
  const room = 960 - ui(300);
  expect(l.middleScale).toBeCloseTo(Math.max(0.85, room / ui(500)));
  expect(l.fits).toBe(room / ui(500) >= 0.85);
});
it('P3-0-R2 a column that cannot fit even at minShrink reports fits=false', () => {
  expect(layoutColumn({ top: 300, middle: 600, bottom: 300, minShrink: 0.85 }).fits).toBe(false);
});
