import type Phaser from 'phaser';
import type { SimSnapshot } from '../../core';
import { drawRock } from './hazards';
import type { Palette } from './palette';

// MEC-002 prototype mango, leaf, ripeness arc and persistent rotten rocks.
export function drawMango(g: Phaser.GameObjects.Graphics, s: SimSnapshot, cell: number, p: Palette, time: number, reduced: boolean, bornAt: number): void {
  // MEC-002 crumbling rotten rocks fade (greybox).
  for (const r of s.rottenRocks) drawRock(g, { x: (r.x + 0.5) * cell, y: (r.y + 0.5) * cell }, cell, p, r.state === 'crumble' ? 0.45 : 1);
  const food = s.mango;
  if (!food) return;
  const grow = reduced ? 1 : Math.min(1, Math.max(0, time - bornAt) / 220);
  const bob = reduced ? 0 : Math.sin(time / 260) * cell * 0.04;
  const x = (food.x + 0.5) * cell, y = (food.y + 0.5) * cell;
  g.save().translateCanvas(x, y + bob).scaleCanvas(grow, grow);
  g.save().translateCanvas(0, cell * 0.04).rotateCanvas(-0.35);
  g.fillStyle(food.golden ? p.gold : p.food).fillEllipse(0, 0, cell * 0.6, cell * 0.68);
  g.restore();
  g.save().translateCanvas(cell * 0.13, -cell * 0.3).rotateCanvas(-0.6);
  g.fillStyle(p.leaf).fillEllipse(0, 0, cell * 0.28, cell * 0.12);
  g.restore().restore();
  const fraction = Math.max(0, food.leftMs / food.totalMs);
  const urgent = fraction < 0.3 && !reduced ? 1 + 0.5 * Math.abs(Math.sin(time / 110)) : 1;
  const width = Math.max(2, cell * 0.08) * urgent;
  const color = fraction < 0.3 ? p.danger : food.golden ? p.gold : p.leaf;
  const start = -Math.PI / 2, end = start + fraction * Math.PI * 2, radius = cell * 0.47;
  g.lineStyle(width, color).beginPath().arc(x, y, radius, start, end, false).strokePath();
  g.fillStyle(color);
  for (const angle of [start, end]) g.fillCircle(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, width / 2);
}
