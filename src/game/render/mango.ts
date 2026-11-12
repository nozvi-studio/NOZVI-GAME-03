import type Phaser from 'phaser';
import type { SimSnapshot } from '../../core';
import { drawRock } from './hazards';
import type { BoardLook } from './biomePalette';
import { MANGO, mangoLeaf, PART, type Pt } from './boardParts';
import type { Palette } from './palette';

// Icon polygons are rebuilt only when the cell size changes, not every frame.
interface IconPoints { cell: number; leaf: Phaser.Types.Math.Vector2Like[]; body: Pt; u: number }
let cached: IconPoints | null = null;
function iconPoints(cell: number): IconPoints {
  if (cached?.cell === cell) return cached;
  const u = (cell * MANGO.fill) / MANGO.box;                       // px per icon unit; icon centre is (16, 16)
  const pt = ([px, py]: Pt): Phaser.Types.Math.Vector2Like => ({ x: (px - MANGO.box / 2) * u, y: (py - MANGO.box / 2) * u });
  const body = pt([MANGO.body.cx, MANGO.body.cy]) as { x: number; y: number };
  cached = { cell, u, leaf: mangoLeaf().map(pt), body: [body.x, body.y] };
  return cached;
}

// MEC-002 prototype mango, leaf, ripeness arc and persistent rotten rocks.
export function drawMango(g: Phaser.GameObjects.Graphics, s: SimSnapshot, cell: number, p: Palette, look: BoardLook, time: number, reduced: boolean, grow: number): void {
  // MEC-002 crumbling rotten rocks fade (greybox).
  for (const r of s.rottenRocks) drawRock(g, { x: (r.x + 0.5) * cell, y: (r.y + 0.5) * cell }, cell, look, 1, 'rock', r.state === 'crumble');
  const food = s.mango;
  if (!food) return;
  const scale = reduced ? 1 : grow; // MOT-3-R11 the scene computes `grow` with mangoGrow (balance.motion popInMs/popFromScale/overshoot)
  const bob = reduced ? 0 : Math.sin(time / 260) * cell * 0.04;
  const x = (food.x + 0.5) * cell, y = (food.y + 0.5) * cell;
  g.fillStyle(PART.mango.halo, MANGO.haloAlpha).fillCircle(x, y, MANGO.halo * cell);   // D3-R12 halo behind the mango
  g.save().translateCanvas(x, y + bob).scaleCanvas(scale, scale);
  const icon = iconPoints(cell), { u } = icon;
  g.fillStyle(PART.mango.leaf).fillPoints(icon.leaf, true, true);
  g.save().translateCanvas(icon.body[0], icon.body[1]).rotateCanvas((MANGO.body.rotDeg * Math.PI) / 180);
  g.fillStyle(look.outline.mango).fillEllipse(0, 0, MANGO.body.rx * 2 * u * MANGO.outline, MANGO.body.ry * 2 * u * MANGO.outline);
  g.fillStyle(food.golden ? p.gold : PART.mango.body).fillEllipse(0, 0, MANGO.body.rx * 2 * u, MANGO.body.ry * 2 * u);
  g.fillStyle(PART.mango.shine, MANGO.shineAlpha).save().rotateCanvas((MANGO.shine.rotDeg * Math.PI) / 180)
    .fillEllipse(MANGO.shine.x * cell, MANGO.shine.y * cell, MANGO.shine.w * cell, MANGO.shine.h * cell);
  g.restore();
  g.restore();
  g.restore();
  const fraction = Math.max(0, food.leftMs / food.totalMs);
  const urgent = fraction < 0.3 && !reduced ? 1 + 0.5 * Math.abs(Math.sin(time / 110)) : 1;
  const width = Math.max(2, cell * 0.08) * urgent;
  const color = fraction < 0.3 ? p.danger : food.golden ? p.gold : p.leaf;
  const start = -Math.PI / 2, end = start + fraction * Math.PI * 2, radius = cell * 0.47;
  g.lineStyle(width, color).beginPath().arc(x, y, radius, start, end, false).strokePath();
  g.fillStyle(color);
  for (const angle of [start, end]) g.fillCircle(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, width / 2);
}
