import type Phaser from 'phaser';
import type { SimSnapshot } from '../../core';
import { blinkOn } from './movers';

type Graphics = Phaser.GameObjects.Graphics;

// Presentation constants.
const WOOD = { post: 0x8b603d, bar: 0x5a3a22, warn: 0xd18b2f } as const;
const SPIKE = { fill: 0x707a85, edge: 0x3c434b, warn: 0xd1572f } as const;
const CRUMBLE_ALPHA = 0.4;

// MEC-014 §8 lock icon: body plus a shackle, centred in the cell.
function drawLock(g: Graphics, cx: number, cy: number, cellPx: number): void {
  const w = cellPx * 0.26, h = cellPx * 0.2;
  g.fillStyle(WOOD.warn).fillRect(cx - w / 2, cy - h * 0.2, w, h);
  g.lineStyle(Math.max(1, cellPx * 0.05), WOOD.warn);
  g.lineBetween(cx - w * 0.3, cy - h * 0.2, cx - w * 0.3, cy - h * 0.8);
  g.lineBetween(cx + w * 0.3, cy - h * 0.2, cx + w * 0.3, cy - h * 0.8);
  g.lineBetween(cx - w * 0.3, cy - h * 0.8, cx + w * 0.3, cy - h * 0.8);
}

// MEC-014 §8 gate greybox: fence posts, then the gate bar open (dashed), warning (blinking + lock) or closed (solid).
function drawGates(g: Graphics, gates: SimSnapshot['families']['gate'], cellPx: number, timeMs: number, reducedMotion: boolean): void {
  for (const gate of gates) {
    const alpha = gate.state === 'crumble' ? CRUMBLE_ALPHA : 1, inset = cellPx * 0.18, post = cellPx - inset * 2;
    for (const f of gate.fence) {
      if (f.on) g.fillStyle(WOOD.post, alpha).fillRect(f.x * cellPx + inset, f.y * cellPx + inset, post, post);
    }
    for (const c of gate.gate) {
      const x = c.x * cellPx, y = c.y * cellPx, by = y + cellPx * 0.4, bh = cellPx * 0.2;
      if (c.vis === 'down') {
        g.lineStyle(Math.max(1, cellPx * 0.06), WOOD.bar, alpha);
        for (let at = 0; at < cellPx; at += cellPx * 0.4) g.lineBetween(x + at, y + cellPx / 2, x + Math.min(cellPx, at + cellPx * 0.2), y + cellPx / 2);
      } else if (c.vis === 'warn') {
        if (!blinkOn(timeMs, reducedMotion)) continue;
        g.fillStyle(WOOD.warn, alpha).fillRect(x, by, cellPx, bh);
        if (reducedMotion) g.lineStyle(Math.max(1, cellPx * 0.06), WOOD.bar).strokeRect(x + 1, by - 1, cellPx - 2, bh + 2);
        drawLock(g, x + cellPx / 2, y + cellPx * 0.7, cellPx);
      } else g.fillStyle(WOOD.bar, alpha).fillRect(x, by, cellPx, bh);
    }
  }
}

// MEC-014 §8 spike greybox: down = small dots, warning = blinking triangles, up = solid triangles.
function drawSpikes(g: Graphics, groups: SimSnapshot['families']['spike'], cellPx: number, timeMs: number, reducedMotion: boolean): void {
  for (const group of groups) {
    const alpha = group.ending ? CRUMBLE_ALPHA : 1;
    for (const c of group.cells) {
      const x = c.x * cellPx, y = c.y * cellPx;
      if (c.vis === 'down') {
        g.fillStyle(SPIKE.edge, alpha);
        for (const [dx, dy] of [[0.3, 0.7], [0.5, 0.35], [0.7, 0.7]] as const) g.fillCircle(x + cellPx * dx, y + cellPx * dy, cellPx * 0.05);
        continue;
      }
      if (c.vis === 'warn' && !blinkOn(timeMs, reducedMotion)) continue;
      const m = cellPx * 0.12, step = (cellPx - m * 2) / 3;
      for (let i = 0; i < 3; i++) {
        const x1 = x + m + step * i, x2 = x1 + step, top = y + cellPx * 0.2, base = y + cellPx - m;
        if (c.vis === 'up') g.fillStyle(SPIKE.fill, alpha).fillTriangle(x1, base, x2, base, (x1 + x2) / 2, top);
        else g.lineStyle(Math.max(1, cellPx * 0.06), SPIKE.warn).strokeTriangle(x1, base, x2, base, (x1 + x2) / 2, top);
      }
    }
  }
}

// MEC-014 section 8 greybox gates and spikes.
export function drawCycles(g: Graphics, snap: SimSnapshot, cellPx: number, timeMs: number, reducedMotion = false): void {
  drawGates(g, snap.families.gate, cellPx, timeMs, reducedMotion);
  drawSpikes(g, snap.families.spike, cellPx, timeMs, reducedMotion);
}
