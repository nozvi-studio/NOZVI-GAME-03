import type Phaser from 'phaser';
import type { Cell, Dir, NpcView, SimSnapshot } from '../../core';

import { BOARD_EDGE, PART } from './boardParts';
import { DEFAULT_LOOK, HAZARD_EDGES, type BoardLook } from './biomePalette';
import { newPulse, telegraphPulse, type TelegraphCtx } from './telegraph';

type Graphics = Phaser.GameObjects.Graphics;
const SCRATCH = newPulse();

// Presentation constants; gameplay timing stays in balance.
const WARN_BLINK_MS = 250;

/** MEC-013 §8 warning blink: 250 ms on/off; reduced motion never blinks. */
export const blinkOn = (timeMs: number, reducedMotion: boolean): boolean =>
  reducedMotion || Math.floor(timeMs / WARN_BLINK_MS) % 2 === 0;

/** MEC-013 §8 roll direction of every path cell (the last cell keeps the previous direction). */
export function pathDirs(path: readonly Cell[]): Dir[] {
  return path.map((c, i) => {
    const a = i < path.length - 1 ? c : path[i - 1]!, b = i < path.length - 1 ? path[i + 1]! : c;
    return { x: Math.sign(b.x - a.x) as Dir['x'], y: Math.sign(b.y - a.y) as Dir['y'] };
  });
}

/** MEC-013 §8 triangle vertices [x1,y1,x2,y2,x3,y3] of an arrow centred in a cell, pointing along dir. */
export function arrowTriangle(c: Cell, d: Dir, cellPx: number, scale = 1): [number, number, number, number, number, number] {
  const cx = (c.x + 0.5) * cellPx, cy = (c.y + 0.5) * cellPx, len = cellPx * 0.24 * scale, wing = cellPx * 0.16 * scale;
  return [cx + d.x * len, cy + d.y * len, cx - d.x * len - d.y * wing, cy - d.y * len + d.x * wing,
    cx - d.x * len + d.y * wing, cy - d.y * len - d.x * wing];
}

/** MEC-016 §8 shadow size factor, shrinking with leftMs / shadowMs (clamped to 0..1). */
export const shadowScale = (leftMs: number, shadowMs: number): number =>
  shadowMs <= 0 ? 0 : Math.min(1, Math.max(0, leftMs / shadowMs));

/** MEC-014/017 §8 dashes along one axis-aligned edge, as [x1,y1,x2,y2] segments. */
export function dashedSegments(x1: number, y1: number, x2: number, y2: number, dashPx: number): [number, number, number, number][] {
  const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / (len || 1), uy = (y2 - y1) / (len || 1);
  const out: [number, number, number, number][] = [];
  for (let at = 0; at < len; at += dashPx * 2) {
    const end = Math.min(len, at + dashPx);
    out.push([x1 + ux * at, y1 + uy * at, x1 + ux * end, y1 + uy * end]);
  }
  return out;
}

/** MEC-014/017 §8 dashed rectangle outline for one cell-sized box. */
export function dashedRect(g: Graphics, x: number, y: number, w: number, h: number, dashPx: number): void {
  for (const [ax, ay, bx, by] of [...dashedSegments(x, y, x + w, y, dashPx), ...dashedSegments(x + w, y, x + w, y + h, dashPx),
    ...dashedSegments(x + w, y + h, x, y + h, dashPx), ...dashedSegments(x, y + h, x, y, dashPx)]) g.lineBetween(ax, ay, bx, by);
}

// MOT-4-R4 lane warn: fill + arrows pulse with the shared tightening rhythm (remaining = warnMs - t); never hidden, outline kept under reduced motion.
function drawLane(g: Graphics, path: readonly Cell[], cellPx: number, tel: TelegraphCtx, reducedMotion: boolean, warn: boolean, t: number, warnMs: number, line: number): void {
  const p = warn ? telegraphPulse(warnMs - t, warnMs, tel.cfg, reducedMotion, SCRATCH) : null, a = p ? (p.urgent ? 1 : p.alpha) : 1, k = p ? p.scale : 1;
  const inset = cellPx * 0.08, size = cellPx - inset * 2, dirs = pathDirs(path);
  g.lineStyle(Math.max(1, cellPx * 0.06), line);
  path.forEach((c, i) => {
    g.fillStyle(PART.lane.fill, warn ? 0.45 * a : 0.18).fillRect(c.x * cellPx + inset, c.y * cellPx + inset, size, size);
    if (warn && reducedMotion) g.strokeRect(c.x * cellPx + inset, c.y * cellPx + inset, size, size);   // solid outline under reduced motion
    const [x1, y1, x2, y2, x3, y3] = arrowTriangle(c, dirs[i]!, cellPx, k);
    g.fillStyle(line, warn ? 0.9 * a : 0.5).fillTriangle(x1, y1, x2, y2, x3, y3);
  });
}

function drawNpc(g: Graphics, n: NpcView, cellPx: number, edge: number): void {
  if (!n.cell) return;
  const x = n.cell.x * cellPx, y = n.cell.y * cellPx, cx = x + cellPx / 2, cy = y + cellPx / 2;
  if (n.variant === 'cat') {
    const inset = cellPx * 0.16, size = cellPx - inset * 2;
    g.fillStyle(PART.cat.body).fillRect(x + inset, y + inset, size, size);
    g.lineStyle(Math.max(1, cellPx * BOARD_EDGE), edge).strokeRect(x + inset, y + inset, size, size);   // D3-R2
    g.fillStyle(PART.cat.ear).fillTriangle(x + inset, y + inset, x + inset + size * 0.3, y + inset, x + inset, y + inset - cellPx * 0.18)
      .fillTriangle(x + inset + size, y + inset, x + inset + size * 0.7, y + inset, x + inset + size, y + inset - cellPx * 0.18);
    return;
  }
  const d = n.dir, r = cellPx * 0.32;
  g.fillStyle(PART.chicken.body).fillCircle(cx, cy, r);
  g.lineStyle(Math.max(1, cellPx * 0.05), edge).strokeCircle(cx, cy, r);
  const bx = cx + d.x * r, by = cy + d.y * r, tip = cellPx * 0.16, wing = cellPx * 0.09;
  g.fillStyle(PART.chicken.beak).fillTriangle(bx + d.x * tip, by + d.y * tip, bx - d.y * wing, by + d.x * wing, bx + d.y * wing, by - d.x * wing);
}

// MEC-013 / MEC-015 / MEC-016 section 8 greybox: lanes, rolling coconuts, patrol routes, NPCs and the bird shadow.
export function drawMovers(g: Graphics, snap: SimSnapshot, cellPx: number, tel: TelegraphCtx, reducedMotion = false, look: BoardLook = DEFAULT_LOOK): void {
  const coconutEdge = HAZARD_EDGES.coconut(look), npcEdge = HAZARD_EDGES.npc(look);
  const { coconut, npc, bird } = snap.families;
  for (const c of coconut) {
    drawLane(g, c.path, cellPx, tel, reducedMotion, c.state === 'warn', c.t, c.warnMs, coconutEdge);
    if (c.cell && c.state !== 'warn') {
      const cx = (c.cell.x + 0.5) * cellPx, cy = (c.cell.y + 0.5) * cellPx;
      g.fillStyle(PART.lane.coconut).fillCircle(cx, cy, cellPx * 0.36).fillStyle(PART.lane.coconutHi).fillCircle(cx - cellPx * 0.1, cy - cellPx * 0.1, cellPx * 0.1);
      g.lineStyle(Math.max(1, cellPx * BOARD_EDGE), coconutEdge).strokeCircle(cx, cy, cellPx * 0.36);   // D3-R2
    }
  }
  for (const n of npc) {
    drawLane(g, n.path, cellPx, tel, reducedMotion, n.state === 'warn', n.t, n.warnMs, npcEdge);
    drawNpc(g, n, cellPx, npcEdge);
  }
  if (bird) {
    // MEC-016 §8 the shadow is the warning: filled ellipse plus outline, shrinking as the steal nears.
    const k = shadowScale(bird.leftMs, bird.shadowMs), w = cellPx * (0.5 + 0.9 * k), h = w * 0.6;
    const cx = (bird.x + 0.5) * cellPx, cy = (bird.y + 0.5) * cellPx;
    g.fillStyle(PART.shadow, 0.35).fillEllipse(cx, cy, w, h);
    g.lineStyle(Math.max(1, cellPx * 0.05), npcEdge).strokeEllipse(cx, cy, w, h);
  }
}
