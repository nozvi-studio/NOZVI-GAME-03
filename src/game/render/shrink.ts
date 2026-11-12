import type Phaser from 'phaser';
import type { SimSnapshot } from '../../core';
import { BOARD_EDGE, PART } from './boardParts';
import { DEFAULT_LOOK, HAZARD_EDGES, type BoardLook } from './biomePalette';
import { newPulse, steadyPulse, telegraphPulse, type TelegraphCtx } from './telegraph';

type Graphics = Phaser.GameObjects.Graphics;
const SCRATCH = newPulse();

// Presentation constants; gameplay timing stays in balance.
const HATCH_STEP = 0.5;
const DIAGONAL = Math.SQRT1_2;

// MEC-018 §8 greybox ring: warn = blinking outline + inward arrows on the four sides; closed = dark hatched wall; fade = faint blink.
export function drawShrink(g: Graphics, snap: SimSnapshot, cellPx: number, timeMs: number, tel: TelegraphCtx, reducedMotion: boolean, look: BoardLook = DEFAULT_LOOK): void {
  const edge = HAZARD_EDGES.shrink(look);
  const ring = snap.families.shrink;
  if (!ring) return;
  const inset = cellPx * 0.08, size = cellPx - inset * 2, line = Math.max(1, cellPx * 0.06);
  const p = ring.state === 'warn' ? telegraphPulse(ring.leftMs, tel.warnMs.shrink, tel.cfg, reducedMotion, SCRATCH)
    : ring.state === 'fade' ? steadyPulse(timeMs, tel.cfg, reducedMotion, SCRATCH) : null;            // closed: steady wall
  const a = p ? (p.urgent ? 1 : p.alpha) : 1, k = p ? p.scale : 1, wallK = tel.beat('r');
  const cols = Math.max(...ring.cells.map(c => c.x)), rows = Math.max(...ring.cells.map(c => c.y));
  for (const c of ring.cells) {
    const x = c.x * cellPx, y = c.y * cellPx;
    if (c.on) {
      g.fillStyle(PART.shrink.wall, 0.9).fillRect(x + cellPx * (1 - wallK) / 2, y + cellPx * (1 - wallK) / 2, cellPx * wallK, cellPx * wallK);
      g.lineStyle(Math.max(1, cellPx * BOARD_EDGE), edge).strokeRect(x + cellPx * (1 - wallK) / 2, y + cellPx * (1 - wallK) / 2, cellPx * wallK, cellPx * wallK);   // D3-R2
      g.lineStyle(line, PART.shrink.hatch);
      for (let k = HATCH_STEP; k < 2; k += HATCH_STEP * 2) {
        const d = k * cellPx;
        g.lineBetween(x + Math.max(0, d - cellPx), y + Math.min(d, cellPx), x + Math.min(d, cellPx), y + Math.max(0, d - cellPx));
      }
      continue;
    }
    g.lineStyle(line, edge, a);
    g.strokeRect(x + inset, y + inset, size, size);
    if (!reducedMotion) g.lineBetween(x + inset, y + inset, x + inset + size, y + inset + size);
  }
  if (ring.state !== 'warn') return;
  // MEC-018 §8 small inward arrows in the four corner cells, pointing diagonally toward the board centre.
  const len = cellPx * 0.24 * k, wing = cellPx * 0.16 * k;
  const arrow = (cx: number, cy: number, dx: number, dy: number) => g.fillStyle(PART.shrink.arrow, 0.9 * a).fillTriangle(
    cx + dx * len, cy + dy * len, cx - dx * len - dy * wing, cy - dy * len + dx * wing, cx - dx * len + dy * wing, cy - dy * len - dx * wing);
  for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [cols, 0, -1, 1], [0, rows, 1, -1], [cols, rows, -1, -1]] as const)
    arrow((cx + 0.5) * cellPx, (cy + 0.5) * cellPx, sx * DIAGONAL, sy * DIAGONAL);
}
