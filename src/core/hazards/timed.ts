// src/core/hazards/timed.ts — shared warn → solid → crumble lifecycle of rock/fence/maze (L416–422, L557–576). MEC-004
import type { FenceKind } from '../balance';
import type { Cell, SimState, StepCtx, TimedHazard, TimedKey } from '../types';

// MEC-003-R7/R8 all timed instances become non-solid and restart their crumble timer.
export function endTimedLevel(s: SimState, family: TimedKey): void {
  for (const h of s.hazards) if (h.family === family) {
    h.state = 'crumble'; h.t = 0;
    for (const c of h.cells) c.on = false;
  }
}

// MEC-004 create a warning hazard with independently tracked landing cells.
export function makeTimed(family: TimedKey, cells: readonly Cell[], warnMs: number, lifeMs: number, kind?: FenceKind): TimedHazard {
  const h: TimedHazard = {
    family, state: 'warn', t: 0, warnMs, lifeMs, landed: false,
    cells: cells.map(c => ({ x: c.x, y: c.y, on: false, ageMs: 0 })),
  };
  if (kind) h.kind = kind;
  return h;
}

// MEC-004 one 1 ms step; a cell lands only when the snake is not on it; dust per cell, landed once
export function updateTimed(h: TimedHazard, ctx: StepCtx): 'keep' | 'remove' {
  h.t += 1;
  if (h.state === 'warn' && h.t >= h.warnMs) { h.state = 'solid'; h.t = 0; }
  else if (h.state === 'solid' && h.t >= h.lifeMs) {
    h.state = 'crumble'; h.t = 0;
    for (const c of h.cells) c.on = false;
  }
  if (h.state === 'solid') for (const c of h.cells) {
    if (!c.on && !ctx.snakeOn(c.x, c.y)) {
      c.on = true;
      ctx.emit({ type: 'dust', x: c.x, y: c.y });
      if (!h.landed) { h.landed = true; ctx.emit({ type: 'landed', hazardType: h.family }); }
    }
    if (c.on) c.ageMs += 1;
  }
  return h.state === 'crumble' && h.t >= ctx.balance.hazard.crumbleMs ? 'remove' : 'keep';
}

export const timedSolidAt = (h: TimedHazard, x: number, y: number): boolean => h.cells.some(c => c.on && c.x === x && c.y === y);
export const timedHasCell = (h: TimedHazard, x: number, y: number): boolean => h.cells.some(c => c.x === x && c.y === y);

// MEC-006-R26 Shield removes one solid cell; a hazard with no cells left is dropped.
export function breakTimed(s: SimState, family: TimedKey, x: number, y: number): void {
  for (const h of s.hazards) if (h.family === family && timedSolidAt(h, x, y)) h.cells = h.cells.filter(c => c.x !== x || c.y !== y);
  s.hazards = s.hazards.filter(h => h.cells.length > 0);
}
