import type Phaser from 'phaser';
import type { SimSnapshot } from '../../core';

// Presentation constants; gameplay timing and speed remain in balance.
const WARN_BLINK_MS = 250;
const MUD = { fill: 0x8b603d, detail: 0x4d3426, warning: 0x9d714b } as const;
const DOTS = [[0.3, 0.4], [0.7, 0.35], [0.55, 0.7]] as const;
const DASHES = [0, 0.4, 0.8] as const;

// MEC-012 section 8 mud cells use dots, warning dashes and a drop, including reduced motion.
export function drawTiles(g: Phaser.GameObjects.Graphics, tiles: SimSnapshot['tiles'], cellPx: number, timeMs: number, reducedMotion = false): void {
  for (const tile of tiles) {
    if (tile.family !== 'mud') continue;
    const warning = tile.state === 'warn';
    if (warning && !reducedMotion && Math.floor(timeMs / WARN_BLINK_MS) % 2 === 1) continue;
    for (const cell of tile.cells) {
      if (tile.state === 'active' && !cell.on) continue;
      const x = cell.x * cellPx, y = cell.y * cellPx, inset = cellPx * 0.08, size = cellPx - inset * 2;
      if (warning) {
        g.lineStyle(Math.max(1, cellPx * 0.06), MUD.warning);
        if (reducedMotion) g.strokeRect(x + inset, y + inset, size, size);
        else for (const t of DASHES) {
          const from = t * size, to = Math.min(1, t + 0.2) * size;
          g.lineBetween(x + inset + from, y + inset, x + inset + to, y + inset);
          g.lineBetween(x + inset + from, y + inset + size, x + inset + to, y + inset + size);
          g.lineBetween(x + inset, y + inset + from, x + inset, y + inset + to);
          g.lineBetween(x + inset + size, y + inset + from, x + inset + size, y + inset + to);
        }
        g.fillStyle(MUD.warning).fillCircle(x + cellPx * 0.5, y + cellPx * 0.58, cellPx * 0.14)
          .fillTriangle(x + cellPx * 0.36, y + cellPx * 0.57, x + cellPx * 0.5, y + cellPx * 0.27, x + cellPx * 0.64, y + cellPx * 0.57);
      } else {
        const alpha = tile.state === 'fade' ? 0.25 : 0.85;
        g.fillStyle(MUD.fill, alpha).fillRect(x + inset, y + inset, size, size);
        g.fillStyle(MUD.detail, alpha);
        for (const [dx, dy] of DOTS) g.fillCircle(x + cellPx * dx, y + cellPx * dy, cellPx * 0.055);
      }
    }
  }
}
