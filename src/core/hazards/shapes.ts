// src/core/hazards/shapes.ts — rock/fence pools, line fence, transform, maze cells (L423–506). MEC-004
import type { Balance, FenceKind, MazeLayout, Pair, RockShapeKey } from '../balance';
import { familyRow, fenceFirstLevel } from '../level';
import type { Rng } from '../rng';
import type { Cell } from '../types';

// MEC-003-R15 rock shapes come from the level table.
export const rockPool = (b: Balance, level: number): RockShapeKey[] =>
  familyRow(b, level).rockShapes as RockShapeKey[];
// MEC-003-R15 fence shapes come from the level table.
export const fencePool = (b: Balance, level: number): FenceKind[] =>
  familyRow(b, level).fenceShapes as FenceKind[];

// MEC-003-R15 straight fence; length ≥ gapMinLen gets one gap (L449–455)
export function lineFence(b: Balance, level: number, rng: Rng): Pair[] {
  const f = b.fence;
  const len = f.lineBase + rng.int(1 + Math.min(f.lineExtraMax, level - fenceFirstLevel(b)));
  const gapAt = len >= f.gapMinLen ? 1 + rng.int(len - 2) : -1;
  const out: Pair[] = [];
  for (let i = 0; i < len; i++) if (i !== gapAt) out.push([i, 0]);
  return out;
}

// MEC-004 random quarter turns, optional mirror, shift to the origin (L457–463)
export function transform(shape: readonly Pair[], rng: Rng, mirrorChance: number): Pair[] {
  let pts: Pair[] = shape.map(([x, y]) => [x, y]);
  for (let r = rng.int(4); r > 0; r--) pts = pts.map(([x, y]) => [-y, x]);
  if (rng.chance(mirrorChance)) pts = pts.map(([x, y]) => [-x, y]);
  const mx = Math.min(...pts.map(p => p[0])), my = Math.min(...pts.map(p => p[1]));
  return pts.map(([x, y]) => [x - mx + 0, y - my + 0]);          // + 0 turns -0 into 0 for toEqual
}

// MEC-004 expand segments (x outer, y inner, as seg() L478–483) and drop excluded cells
export function mazeCells(layout: MazeLayout): Cell[] {
  const out: Cell[] = [];
  for (const [x1, y1, x2, y2] of layout.segments)
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
        if (!layout.exclude.some(([ex, ey]) => ex === x && ey === y)) out.push({ x, y });
  return out;
}
