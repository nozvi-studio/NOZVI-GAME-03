import type Phaser from 'phaser';
import type { SimSnapshot } from '../../core';

// Presentation constants; gameplay timing and speed remain in balance.
const WARN_BLINK_MS = 250;
const MUD = { fill: 0x8b603d, detail: 0x4d3426, warning: 0x9d714b } as const;
const ICE = { fill: 0xe0f5ff, detail: 0x5199ba, warning: 0x397c9c } as const;
const DOTS = [[0.3, 0.4], [0.7, 0.35], [0.55, 0.7]] as const;
const DASHES = [0, 0.4, 0.8] as const;

// MEC-012 section 8 tiles use distinct details and warning icons, including reduced motion.
export function drawTiles(g: Phaser.GameObjects.Graphics, tiles: SimSnapshot['tiles'], cellPx: number, timeMs: number, reducedMotion = false): void {
  for (const tile of tiles) {
    const color = tile.family === 'ice' ? ICE : MUD;
    const warning = tile.state === 'warn';
    if (warning && !reducedMotion && Math.floor(timeMs / WARN_BLINK_MS) % 2 === 1) continue;
    for (const cell of tile.cells) {
      if (tile.state === 'active' && !cell.on) continue;
      const x = cell.x * cellPx, y = cell.y * cellPx, inset = cellPx * 0.08, size = cellPx - inset * 2;
      if (warning) {
        g.lineStyle(Math.max(1, cellPx * 0.06), color.warning);
        if (reducedMotion) g.strokeRect(x + inset, y + inset, size, size);
        else for (const t of DASHES) {
          const from = t * size, to = Math.min(1, t + 0.2) * size;
          g.lineBetween(x + inset + from, y + inset, x + inset + to, y + inset);
          g.lineBetween(x + inset + from, y + inset + size, x + inset + to, y + inset + size);
          g.lineBetween(x + inset, y + inset + from, x + inset, y + inset + to);
          g.lineBetween(x + inset + size, y + inset + from, x + inset + size, y + inset + to);
        }
        if (tile.family === 'ice') {
          const cx = x + cellPx * 0.5, cy = y + cellPx * 0.5, radius = cellPx * 0.22;
          g.lineBetween(cx, cy - radius, cx, cy + radius);
          g.lineBetween(cx - radius, cy - radius, cx + radius, cy + radius);
          g.lineBetween(cx - radius, cy + radius, cx + radius, cy - radius);
        } else g.fillStyle(color.warning).fillCircle(x + cellPx * 0.5, y + cellPx * 0.58, cellPx * 0.14)
          .fillTriangle(x + cellPx * 0.36, y + cellPx * 0.57, x + cellPx * 0.5, y + cellPx * 0.27, x + cellPx * 0.64, y + cellPx * 0.57);
      } else {
        const alpha = tile.state === 'fade' ? 0.25 : 0.85;
        g.fillStyle(color.fill, alpha).fillRect(x + inset, y + inset, size, size);
        if (tile.family === 'ice') {
          g.lineStyle(Math.max(1, cellPx * 0.05), color.detail, alpha);
          g.lineBetween(x + cellPx * 0.2, y + cellPx * 0.65, x + cellPx * 0.65, y + cellPx * 0.2);
          g.lineBetween(x + cellPx * 0.4, y + cellPx * 0.8, x + cellPx * 0.8, y + cellPx * 0.4);
        } else {
          g.fillStyle(color.detail, alpha);
          for (const [dx, dy] of DOTS) g.fillCircle(x + cellPx * dx, y + cellPx * dy, cellPx * 0.055);
        }
      }
    }
  }
}

// MEC-012-R9 show the current slide direction ahead of the head on the overlay layer.
export function drawIceArrow(g: Phaser.GameObjects.Graphics,
  s: Pick<SimSnapshot, 'headTile' | 'snake' | 'dir'>, cellPx: number): void {
  if (s.headTile !== 'ice') return;
  const head = s.snake[0]!, { x: dx, y: dy } = s.dir;
  const cx = (head.x + 0.5 + dx * 0.75) * cellPx, cy = (head.y + 0.5 + dy * 0.75) * cellPx;
  const length = cellPx * 0.24, wing = cellPx * 0.15;
  const tx = cx + dx * length, ty = cy + dy * length;
  g.lineStyle(Math.max(1, cellPx * 0.08), ICE.detail);
  g.lineBetween(cx - dx * length, cy - dy * length, tx, ty);
  g.lineBetween(tx, ty, cx - dy * wing, cy + dx * wing);
  g.lineBetween(tx, ty, cx + dy * wing, cy - dx * wing);
}
