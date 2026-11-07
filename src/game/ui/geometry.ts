import { ui } from './layout';
// P3-0-R7 pure widget geometry (game px derived from mockup px). No Phaser.
export interface PillGeom { w: number; h: number; radius: number; shelf: number; pressedDy: number; labelStroke: number }
export function pillGeom(wMock: number, hMock: number): PillGeom {
  const h = ui(hMock);
  return { w: ui(wMock), h, radius: h / 2, shelf: ui(5), pressedDy: ui(3), labelStroke: ui(4) };
}
/**
 * Pill hit rect (face plus the shelf below) for a container sized w x h (NOT h + shelf).
 * Phaser 3.90 InputManager.pointWithinInteractiveObject adds the container's displayOrigin (w/2, h/2)
 * to the local point before calling the hitAreaCallback, so hit space has its origin at the face's top-left:
 * local face = -h/2..h/2 becomes 0..h, the shelf runs on to h + shelf.
 */
export function pillHitRect(g: PillGeom): { x: number; y: number; w: number; h: number } {
  return { x: 0, y: 0, w: g.w, h: g.h + g.shelf };
}
/** Filled width of a progress bar, clamped to 0..wPx; max <= 0 gives 0. */
export function barFill(value: number, max: number, wPx: number): number {
  if (!(max > 0)) return 0;
  return Math.min(wPx, Math.max(0, (value / max) * wPx));
}
