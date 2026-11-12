import type Phaser from 'phaser';
import type { SimSnapshot } from '../../core';
import type { BoardLook } from './biomePalette';
import { SNAKE } from './boardParts';

// ART-001 interpolated head centre in board pixels (the capy face anchors here).
export function snakeHeadPoint(s: SimSnapshot, cell: number): { x: number; y: number } {
  const head = s.snake[0]!;
  const lerp = (a: number, b: number): number => a + (b - a) * s.tickAlpha;
  return { x: (lerp(s.headFrom.x, head.x) + 0.5) * cell, y: (lerp(s.headFrom.y, head.y) + 0.5) * cell };
}

// D3-R12 widths in px (pure, testable).
export function snakeWidths(cell: number): { body: number; outline: number; stripe: number; head: number; headOutline: number; belly: number } {
  return { body: cell * SNAKE.body, outline: cell * SNAKE.outline, stripe: cell * SNAKE.stripe, head: cell * SNAKE.head,
    headOutline: cell * SNAKE.headOutline, belly: cell * SNAKE.belly };
}

// MEC-001 interpolate the head and tail; D3-R12 outlined body, highlight stripe, 1.4-cell head disc.
export function drawSnake(g: Phaser.GameObjects.Graphics, s: SimSnapshot, cell: number, look: BoardLook, gulp: number, drawFace = true, bulge = 0): void {
  const last = s.snake[s.snake.length - 1]!;
  const lerp = (a: number, b: number): number => a + (b - a) * s.tickAlpha;
  const center = (x: number, y: number): { x: number; y: number } => ({ x: (x + 0.5) * cell, y: (y + 0.5) * cell });
  const headPt = snakeHeadPoint(s, cell);
  const tailPt = center(lerp(s.tailFrom.x, last.x), lerp(s.tailFrom.y, last.y));
  const points = [headPt, ...s.snake.slice(1).map(c => center(c.x, c.y)), tailPt];
  const w = snakeWidths(cell), headR = w.head * (1 + SNAKE.gulp * gulp);
  const pass = (color: number, width: number, pts: { x: number; y: number }[], alpha = 1): void => {
    g.lineStyle(width, color, alpha).strokePoints(pts, false); g.fillStyle(color, alpha);
    for (const pt of pts) g.fillCircle(pt.x, pt.y, width / 2);
  };
  pass(look.outline.snake, w.outline, points);
  g.fillStyle(look.outline.snake).fillCircle(headPt.x, headPt.y, headR + w.headOutline);
  pass(look.snake.body, w.body, points);
  pass(look.snake.belly, w.belly, points);
  const dy = cell * SNAKE.stripeOffset;
  if (points.length > 1) { // highlight stripe along the back, not on the head
    const hi = points.slice(1).map(pt => ({ x: pt.x, y: pt.y - dy }));
    g.lineStyle(w.stripe, 0xffffff, SNAKE.stripeAlpha).strokePoints(hi, false);
  }
  g.fillStyle(look.snake.head).fillCircle(headPt.x, headPt.y, headR);
  // MOT-3-R12 one extra disc on the first body point behind the head (render-only; the head cell does not move)
  if (bulge > 0 && points.length > 2) g.fillStyle(look.snake.body).fillCircle(points[1]!.x, points[1]!.y, w.body / 2 * (1 + bulge));
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
