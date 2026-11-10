// MOT-3 pure derivations: feedback triggers the sim does not emit as events. No Phaser; render-only counters never touch the sim RNG.
import type { HazardView, SimEvent, TimedKey } from '../../core';
import type { JuiceInput, Pt } from './types';

/** MOT-3-R9 cells of the hazard of `type` that landed most recently (smallest t - warnMs among non-warn), only `on` cells, at most `max`. */
export function landedCells(hazards: readonly HazardView[], type: TimedKey, max: number): Pt[] {
  let best: HazardView | null = null;
  for (const h of hazards) {
    if (h.type !== type || h.state === 'warn') continue;
    if (best === null || h.t - h.warnMs < best.t - best.warnMs) best = h;
  }
  if (best === null) return [];
  return best.cells.filter(c => c.on).slice(0, max).map(c => ({ x: c.x, y: c.y }));
}

/** MOT-3-R12 a turn is feedback-worthy when the requested direction differs from the head direction. */
export const isTurn = (dir: Pt, dx: number, dy: number): boolean => dx !== dir.x || dy !== dir.y;

/** MOT-3-R11 a mango (re)appeared: after a mango eat or a rot, or when it goes from absent to present. */
export function mangoSpawnInput(hadMango: boolean, events: readonly SimEvent[], mango: (Pt & { golden: boolean }) | null): JuiceInput | null {
  if (mango === null) return null;
  const respawn = events.some(e => (e.type === 'ate' && e.source === 'mango') || e.type === 'rotted');
  return respawn || !hadMango ? { type: 'mangoSpawned', x: mango.x, y: mango.y, golden: mango.golden } : null;
}

const GOLDEN_ANGLE = 2.399963229728653; // radians; spreads successive stars around the ring without randomness
export interface SparkleClock { acc: number; n: number }
export const newSparkleClock = (): SparkleClock => ({ acc: 0, n: 0 });
/** MOT-3-R13 advance by dtMs; returns the ring point (cell units) when a star is due, else null. Inactive or no mango resets the timer. */
export function sparkleStep(c: SparkleClock, dtMs: number, everyMs: number, active: boolean, mango: Pt | null, radius: number): Pt | null {
  if (!active || mango === null) { c.acc = 0; return null; }
  c.acc += dtMs;
  if (c.acc < everyMs) return null;
  c.acc -= everyMs;
  const a = c.n++ * GOLDEN_ANGLE;
  return { x: mango.x + Math.cos(a) * radius, y: mango.y + Math.sin(a) * radius };
}
