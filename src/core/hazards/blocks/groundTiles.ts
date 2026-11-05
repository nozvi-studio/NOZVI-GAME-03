import type { Cell } from '../../types';

export interface TilePatch {
  id: number;
  state: 'warn' | 'active' | 'fade';
  t: number;
  warnMs: number;
  lifeMs: number;
  cells: { x: number; y: number; on: boolean }[];
  ring?: Cell[];
}

// MEC-012-R1 patches own their cells and optional ice exit ring.
export function newPatch(id: number, cells: readonly Cell[], warnMs: number, lifeMs: number, ring?: readonly Cell[]): TilePatch {
  return { id, state: 'warn', t: 0, warnMs, lifeMs,
    cells: cells.map(({ x, y }) => ({ x, y, on: false })),
    ...(ring === undefined ? {} : { ring: ring.map(cell => ({ ...cell })) }),
  };
}

// MEC-012-R2 / MEC-004-R5 advance one sim ms; each cell activates once the snake leaves.
export function stepPatch(p: TilePatch, crumbleMs: number, snakeOn: (x: number, y: number) => boolean): boolean {
  p.t += 1;
  if (p.state === 'warn' && p.t >= p.warnMs) {
    p.state = 'active';
    p.t = 0;
  } else if (p.state === 'active' && p.t >= p.lifeMs) {
    p.state = 'fade';
    p.t = 0;
    for (const cell of p.cells) cell.on = false;
  } else if (p.state === 'fade' && p.t >= crumbleMs) {
    return false;
  }
  if (p.state === 'active') {
    for (const cell of p.cells) if (!cell.on && !snakeOn(cell.x, cell.y)) cell.on = true;
  }
  return true;
}

// MEC-012-R2 only active, individually enabled cells apply a tile effect.
export function patchCellOn(p: TilePatch, x: number, y: number): boolean {
  return p.state === 'active' && p.cells.some(cell => cell.x === x && cell.y === y && cell.on);
}

// MEC-012-R5/R8 patch cells remain reserved in every lifecycle state.
export function patchHas(p: TilePatch, x: number, y: number): boolean {
  return p.cells.some(cell => cell.x === x && cell.y === y);
}

// MEC-004-R7 the max skill/level slowdown and tile factor multiply before rounding.
export function scaleTick(baseTickMs: number, slowFactor: number, tileFactor: number): number {
  return Math.round(baseTickMs * slowFactor * tileFactor);
}
