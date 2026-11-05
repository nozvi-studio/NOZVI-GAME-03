import type Phaser from 'phaser';
import type { SimSnapshot } from '../../core';
import { blinkOn } from './movers';

type Graphics = Phaser.GameObjects.Graphics;

// Presentation constants; gameplay timing stays in balance.
const RING = { warn: 0xd1352f, wall: 0x3a1010, hatch: 0x8a2020, arrow: 0xd1352f } as const;
const HATCH_STEP = 0.5;
const DIAGONAL = Math.SQRT1_2;

// MEC-018 §8 greybox ring: warn = blinking outline + inward arrows on the four sides; closed = dark hatched wall; fade = faint blink.
export function drawShrink(g: Graphics, snap: SimSnapshot, cellPx: number, timeMs: number, reducedMotion: boolean): void {
  const ring = snap.families.shrink;
  if (!ring) return;
  const inset = cellPx * 0.08, size = cellPx - inset * 2, line = Math.max(1, cellPx * 0.06);
  const blink = blinkOn(timeMs, reducedMotion);
  const cols = Math.max(...ring.cells.map(c => c.x)), rows = Math.max(...ring.cells.map(c => c.y));
  for (const c of ring.cells) {
    const x = c.x * cellPx, y = c.y * cellPx;
    if (c.on) {
      g.fillStyle(RING.wall, 0.9).fillRect(x, y, cellPx, cellPx);
      g.lineStyle(line, RING.hatch);
      for (let k = HATCH_STEP; k < 2; k += HATCH_STEP * 2) {
        const d = k * cellPx;
        g.lineBetween(x + Math.max(0, d - cellPx), y + Math.min(d, cellPx), x + Math.min(d, cellPx), y + Math.max(0, d - cellPx));
      }
      continue;
    }
    if (!blink) continue;
    g.lineStyle(line, RING.warn);
    g.strokeRect(x + inset, y + inset, size, size);
    if (!reducedMotion) g.lineBetween(x + inset, y + inset, x + inset + size, y + inset + size);
  }
  if (ring.state !== 'warn' || !blink) return;
  // MEC-018 §8 small inward arrows in the four corner cells, pointing diagonally toward the board centre.
  const len = cellPx * 0.24, wing = cellPx * 0.16;
  const arrow = (cx: number, cy: number, dx: number, dy: number) => g.fillStyle(RING.arrow, 0.9).fillTriangle(
    cx + dx * len, cy + dy * len, cx - dx * len - dy * wing, cy - dy * len + dx * wing, cx - dx * len + dy * wing, cy - dy * len - dx * wing);
  for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [cols, 0, -1, 1], [0, rows, 1, -1], [cols, rows, -1, -1]] as const)
    arrow((cx + 0.5) * cellPx, (cy + 0.5) * cellPx, sx * DIAGONAL, sy * DIAGONAL);
}
