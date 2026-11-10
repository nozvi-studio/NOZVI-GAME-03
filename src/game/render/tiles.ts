import type Phaser from 'phaser';
import type { SimSnapshot } from '../../core';
import { PART, TILE } from './boardParts';
import { DEFAULT_LOOK, type BoardLook } from './biomePalette';
import { newPulse, telegraphPulse, type TelegraphCtx } from './telegraph';

// Presentation constants; gameplay timing and speed remain in balance.
const DASHES = [0, 0.4, 0.8] as const;
const SCRATCH = newPulse();

// MEC-012 section 8 tiles use distinct details and warning icons, including reduced motion.
// MOT-4-R3 the warning is drawn on every frame (shared tightening pulse on alpha/scale; no blink-off frame).
export function drawTiles(g: Phaser.GameObjects.Graphics, tiles: SimSnapshot['tiles'], cellPx: number, tel: TelegraphCtx, reducedMotion = false, look: BoardLook = DEFAULT_LOOK): void {
  for (const tile of tiles) {
    const edge = tile.family === 'ice' ? look.edge : look.woodEdge;
    const warning = tile.state === 'warn';
    const p = warning ? telegraphPulse(tile.leftMs, tel.warnMs[tile.family], tel.cfg, reducedMotion, SCRATCH) : null, a = p ? (p.urgent ? 1 : p.alpha) : 1, s = p ? p.scale : 1;
    for (const cell of tile.cells) {
      if (tile.state === 'active' && !cell.on) continue;
      const x = cell.x * cellPx, y = cell.y * cellPx, inset = cellPx * 0.08, size = cellPx - inset * 2;
      if (warning) {
        g.lineStyle(Math.max(1, cellPx * 0.06), edge, a);
        if (reducedMotion) g.strokeRect(x + inset, y + inset, size, size);
        else for (const t of DASHES) {
          const from = t * size, to = Math.min(1, t + 0.2) * size;
          g.lineBetween(x + inset + from, y + inset, x + inset + to, y + inset);
          g.lineBetween(x + inset + from, y + inset + size, x + inset + to, y + inset + size);
          g.lineBetween(x + inset, y + inset + from, x + inset, y + inset + to);
          g.lineBetween(x + inset + size, y + inset + from, x + inset + size, y + inset + to);
        }
        if (tile.family === 'ice') {
          const cx = x + cellPx * 0.5, cy = y + cellPx * 0.5, radius = cellPx * 0.22 * s;
          g.lineBetween(cx, cy - radius, cx, cy + radius);
          g.lineBetween(cx - radius, cy - radius, cx + radius, cy + radius);
          g.lineBetween(cx - radius, cy + radius, cx + radius, cy - radius);
        } else {
          const cx = x + cellPx * 0.5, cy = y + cellPx * 0.58;
          g.fillStyle(edge, a).fillCircle(cx, cy, cellPx * 0.14 * s)
            .fillTriangle(cx - cellPx * 0.14 * s, y + cellPx * 0.57, cx, cy - cellPx * 0.31 * s, cx + cellPx * 0.14 * s, y + cellPx * 0.57);
        }
      } else {
        const alpha = tile.state === 'fade' ? 0.25 : 0.85;
        const i = cellPx * TILE.inset, m = cellPx - 2 * i, r = cellPx * TILE.radius;
        if (tile.family === 'ice') {
          g.fillStyle(PART.ice.fill, alpha).fillRoundedRect(x + i, y + i, m, m, r);
          g.lineStyle(cellPx * TILE.border, look.edge, alpha).strokeRoundedRect(x + i, y + i, m, m, r);
          g.lineStyle(Math.max(1, cellPx * 0.05), PART.ice.shine, alpha);
          g.lineBetween(x + cellPx * 0.2, y + cellPx * 0.65, x + cellPx * 0.65, y + cellPx * 0.2);
          g.lineBetween(x + cellPx * 0.4, y + cellPx * 0.8, x + cellPx * 0.8, y + cellPx * 0.4);
        } else {
          // Tile.html mud: plain rounded fill, no wood ring (warn states keep the wood edge).
          g.fillStyle(PART.mud.fill, alpha).fillRoundedRect(x + i, y + i, m, m, r);
          g.fillStyle(PART.mud.puddle, alpha).fillEllipse(x + i + m * 0.5, y + i + m * 0.5, m * TILE.mud.puddle.w, m * TILE.mud.puddle.h);
          g.fillStyle(PART.mud.fill, alpha);
          for (const q of TILE.mud.bubbles) g.fillCircle(x + i + m * q.x + cellPx * q.r, y + i + m * q.y + cellPx * q.r, cellPx * q.r);
        }
      }
    }
  }
}

// MEC-012-R9 show the current slide direction ahead of the head on the overlay layer.
export function drawIceArrow(g: Phaser.GameObjects.Graphics,
  s: Pick<SimSnapshot, 'headTile' | 'snake' | 'dir'>, cellPx: number, look: BoardLook = DEFAULT_LOOK): void {
  if (s.headTile !== 'ice') return;
  const head = s.snake[0]!, { x: dx, y: dy } = s.dir;
  const cx = (head.x + 0.5 + dx * 0.75) * cellPx, cy = (head.y + 0.5 + dy * 0.75) * cellPx;
  const length = cellPx * 0.24, wing = cellPx * 0.15;
  const tx = cx + dx * length, ty = cy + dy * length;
  g.lineStyle(Math.max(1, cellPx * 0.08), look.edge);
  g.lineBetween(cx - dx * length, cy - dy * length, tx, ty);
  g.lineBetween(tx, ty, cx - dy * wing, cy + dx * wing);
  g.lineBetween(tx, ty, cx + dy * wing, cy - dx * wing);
}
