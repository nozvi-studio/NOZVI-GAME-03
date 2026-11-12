import type Phaser from 'phaser';
import type { SimSnapshot } from '../../core';
import { dashedRect } from './movers';
import { BOARD_EDGE, PART } from './boardParts';
import { DEFAULT_LOOK, HAZARD_EDGES, type BoardLook } from './biomePalette';
import { newPulse, telegraphPulse, type TelegraphCtx } from './telegraph';

type Graphics = Phaser.GameObjects.Graphics;
const SCRATCH = newPulse();

// Presentation constants.
const MS_PER_DIGIT = 1000;
const BLAST_ALPHA = 0.6;

/** MEC-017 §8 countdown digit shown on a landed bomb: ceil(leftMs / 1000). */
export const bombDigit = (leftMs: number): number => Math.ceil(Math.max(0, leftMs) / MS_PER_DIGIT);

// Seven-segment layout in a unit box (x 0..1, y 0..2): a top, b top-right, c bottom-right, d bottom, e bottom-left, f top-left, g middle.
const SEG: Record<string, [number, number, number, number]> = {
  a: [0, 0, 1, 0], b: [1, 0, 1, 1], c: [1, 1, 1, 2], d: [0, 2, 1, 2], e: [0, 1, 0, 2], f: [0, 0, 0, 1], g: [0, 1, 1, 1],
};
const DIGIT_SEGS = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'] as const;

/** MEC-017 §8 segments [x1,y1,x2,y2] (unit box 1 x 2) that draw digit 0-9 without a text object. */
export const digitSegments = (digit: number): [number, number, number, number][] =>
  [...(DIGIT_SEGS[Math.min(9, Math.max(0, digit))] ?? '')].map(k => SEG[k]!);

function drawDigit(g: Graphics, digit: number, cx: number, cy: number, cellPx: number, k = 1): void {
  const w = cellPx * 0.22 * k, h = w * 2;
  g.lineStyle(Math.max(1.5, cellPx * 0.07 * k), PART.bomb.digit);
  for (const [x1, y1, x2, y2] of digitSegments(digit)) g.lineBetween(cx - w / 2 + x1 * w, cy - h / 2 + y1 * w, cx - w / 2 + x2 * w, cy - h / 2 + y2 * w);
}

// MEC-017 section 8 greybox bombs: warn like a rock, landed = black circle + digit + dashed area, active = filled area.
export function drawBlasts(g: Graphics, snap: SimSnapshot, cellPx: number, tel: TelegraphCtx, reducedMotion = false, look: BoardLook = DEFAULT_LOOK): void {
  const edge = HAZARD_EDGES.bomb(look);
  for (const b of snap.families.bomb) {
    const x = b.x * cellPx, y = b.y * cellPx, cx = x + cellPx / 2, cy = y + cellPx / 2, inset = cellPx * 0.12, size = cellPx - inset * 2;
    if (b.state === 'warn') {
      const p = telegraphPulse(b.leftMs, tel.warnMs.bomb, tel.cfg, reducedMotion, SCRATCH), a = p.urgent ? 1 : p.alpha;   // MOT-4-R3: never skipped
      g.fillStyle(PART.bomb.warn, 0.55 * a).fillCircle(cx, cy, cellPx * 0.34 * p.scale);
      g.lineStyle(Math.max(1, cellPx * 0.06), edge, a);
      if (reducedMotion) g.strokeRect(x + inset, y + inset, size, size);       // solid outline under reduced motion
      else dashedRect(g, x + inset, y + inset, size, size, cellPx * 0.12);
      continue;
    }
    if (b.state === 'active') {
      g.fillStyle(PART.bomb.blast, BLAST_ALPHA);
      for (const c of b.area) g.fillRect(c.x * cellPx, c.y * cellPx, cellPx, cellPx);
      continue;
    }
    const p = telegraphPulse(b.leftMs, tel.warnMs.bombCount, tel.cfg, reducedMotion, SCRATCH);
    g.lineStyle(Math.max(1, cellPx * 0.05), edge, p.urgent ? 1 : p.alpha);
    for (const c of b.area) dashedRect(g, c.x * cellPx + 1, c.y * cellPx + 1, cellPx - 2, cellPx - 2, cellPx * 0.14);
    const bodyR = cellPx * 0.4 * tel.beat(`b:${b.id}`);
    g.fillStyle(PART.bomb.body).fillCircle(cx, cy, bodyR);
    g.lineStyle(Math.max(1, cellPx * BOARD_EDGE), edge).strokeCircle(cx, cy, bodyR);   // D3-R2
    drawDigit(g, bombDigit(b.leftMs), cx, cy, cellPx, tel.beat(`bd:${b.id}`));
  }
}
