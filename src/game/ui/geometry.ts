import { ui } from './layout';
// P3-0-R7 pure widget geometry (game px derived from mockup px). No Phaser.
export interface PillGeom { w: number; h: number; radius: number; shelf: number; pressedDy: number; labelStroke: number }
export function pillGeom(wMock: number, hMock: number): PillGeom {
  const h = ui(hMock);
  return { w: ui(wMock), h, radius: h / 2, shelf: ui(5), pressedDy: ui(3), labelStroke: ui(4) };
}
/** Filled width of a progress bar, clamped to 0..wPx; max <= 0 gives 0. */
export function barFill(value: number, max: number, wPx: number): number {
  if (!(max > 0)) return 0;
  return Math.min(wPx, Math.max(0, (value / max) * wPx));
}
