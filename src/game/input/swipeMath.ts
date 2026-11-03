// src/game/input/swipeMath.ts — CSS-pixel swipe rules (design §7.3, L750–757)
import type { Step } from '../../core';
export const swipeThreshold = (boardCssPx: number, minPx: number, factor: number): number => Math.max(minPx, boardCssPx * factor);
// GDD-13 choose the dominant CSS-pixel axis, with vertical ties.
export function swipeDir(dx: number, dy: number, th: number): [Step, Step] | null {
  if (Math.abs(dx) < th && Math.abs(dy) < th) return null;
  return Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx) as Step, 0] : [0, Math.sign(dy) as Step];
}

interface ClientPoint { clientX: number; clientY: number }
type SwipeEvent = ClientPoint | { changedTouches: ArrayLike<ClientPoint & { identifier: number }> };

// GDD-13 Phaser touch events carry CSS pixels on the identified touch, not the event.
export function swipePoint(event: SwipeEvent, identifier: number): { x: number; y: number } | null {
  if ('clientX' in event) return { x: event.clientX, y: event.clientY };
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i];
    if (touch.identifier === identifier) return { x: touch.clientX, y: touch.clientY };
  }
  return null;
}
