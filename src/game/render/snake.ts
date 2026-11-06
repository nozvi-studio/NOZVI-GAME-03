import type Phaser from 'phaser';
import type { SimSnapshot } from '../../core';
import type { Palette } from './palette';

// ART-001 interpolated head centre in board pixels (the capy face anchors here).
export function snakeHeadPoint(s: SimSnapshot, cell: number): { x: number; y: number } {
  const head = s.snake[0]!;
  const lerp = (a: number, b: number): number => a + (b - a) * s.tickAlpha;
  return { x: (lerp(s.headFrom.x, head.x) + 0.5) * cell, y: (lerp(s.headFrom.y, head.y) + 0.5) * cell };
}

// MEC-001 interpolate the head and tail; rounded joints match the canvas stroke.
export function drawSnake(g: Phaser.GameObjects.Graphics, s: SimSnapshot, cell: number, p: Palette, gulp: number, drawFace = true): void {
  const last = s.snake[s.snake.length - 1]!;
  const lerp = (a: number, b: number): number => a + (b - a) * s.tickAlpha;
  const center = (x: number, y: number): { x: number; y: number } => ({ x: (x + 0.5) * cell, y: (y + 0.5) * cell });
  const headPt = snakeHeadPoint(s, cell);
  const tailPt = center(lerp(s.tailFrom.x, last.x), lerp(s.tailFrom.y, last.y));
  const points = [headPt, ...s.snake.slice(1).map(c => center(c.x, c.y)), tailPt];
  for (const [color, width] of [[p.snake, cell * 0.78], [p.belly, cell * 0.26]]) {
    g.lineStyle(width, color).strokePoints(points, false);
    g.fillStyle(color);
    for (const pt of points) g.fillCircle(pt.x, pt.y, width / 2);
  }
  g.fillStyle(p.snake).fillCircle(headPt.x, headPt.y, cell * 0.46 * (1 + 0.18 * gulp));
  const fx = s.dir.x, fy = s.dir.y, px = -fy, py = fx;
  if (drawFace) for (const side of [-1, 1]) {
    const ex = headPt.x + fx * cell * 0.14 + px * side * cell * 0.2;
    const ey = headPt.y + fy * cell * 0.14 + py * side * cell * 0.2;
    g.fillStyle(0xffffff).fillCircle(ex, ey, cell * 0.13);
    g.fillStyle(0x1a1a2e);
    if (s.status === 'over' && s.outcome?.won === false) g.fillRect(ex - cell * 0.08, ey - cell * 0.02, cell * 0.16, cell * 0.04);
    else g.fillCircle(ex + fx * cell * 0.04, ey + fy * cell * 0.04, cell * 0.065);
  }
}
