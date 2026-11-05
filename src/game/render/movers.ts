import type Phaser from 'phaser';
import type { Cell, Dir, NpcView, SimSnapshot } from '../../core';

type Graphics = Phaser.GameObjects.Graphics;

// Presentation constants; gameplay timing stays in balance.
const WARN_BLINK_MS = 250;
const LANE = { fill: 0xffd45e, line: 0x8a5a00, coconut: 0x7b4a22, coconutHi: 0xa8713c } as const;
const CAT = { body: 0x9a9a9a, ear: 0x6f6f6f } as const;
const CHICKEN = { body: 0xffffff, edge: 0x9a9a9a, beak: 0xf08a1c } as const;
const SHADOW = 0x1c1c1c;

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
export function arrowTriangle(c: Cell, d: Dir, cellPx: number): [number, number, number, number, number, number] {
  const cx = (c.x + 0.5) * cellPx, cy = (c.y + 0.5) * cellPx, len = cellPx * 0.24, wing = cellPx * 0.16;
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

function drawLane(g: Graphics, path: readonly Cell[], cellPx: number, timeMs: number, reducedMotion: boolean, warn: boolean): void {
  if (warn && !blinkOn(timeMs, reducedMotion)) return;
  const inset = cellPx * 0.08, size = cellPx - inset * 2, dirs = pathDirs(path);
  g.lineStyle(Math.max(1, cellPx * 0.06), LANE.line);
  path.forEach((c, i) => {
    g.fillStyle(LANE.fill, warn ? 0.45 : 0.18).fillRect(c.x * cellPx + inset, c.y * cellPx + inset, size, size);
    if (warn && reducedMotion) g.strokeRect(c.x * cellPx + inset, c.y * cellPx + inset, size, size);   // solid outline, no blink
    const [x1, y1, x2, y2, x3, y3] = arrowTriangle(c, dirs[i]!, cellPx);
    g.fillStyle(LANE.line, warn ? 0.9 : 0.5).fillTriangle(x1, y1, x2, y2, x3, y3);
  });
}

// MEC-015 §8 beak direction: toward the next route cell.
function facing(n: NpcView): Dir {
  const i = n.path.findIndex(c => c.x === n.cell?.x && c.y === n.cell?.y);
  return pathDirs(n.path)[Math.max(0, i)]!;
}

function drawNpc(g: Graphics, n: NpcView, cellPx: number): void {
  if (!n.cell) return;
  const x = n.cell.x * cellPx, y = n.cell.y * cellPx, cx = x + cellPx / 2, cy = y + cellPx / 2;
  if (n.variant === 'cat') {
    const inset = cellPx * 0.16, size = cellPx - inset * 2;
    g.fillStyle(CAT.body).fillRect(x + inset, y + inset, size, size);
    g.fillStyle(CAT.ear).fillTriangle(x + inset, y + inset, x + inset + size * 0.3, y + inset, x + inset, y + inset - cellPx * 0.18)
      .fillTriangle(x + inset + size, y + inset, x + inset + size * 0.7, y + inset, x + inset + size, y + inset - cellPx * 0.18);
    return;
  }
  const d = facing(n), r = cellPx * 0.32;
  g.fillStyle(CHICKEN.body).fillCircle(cx, cy, r);
  g.lineStyle(Math.max(1, cellPx * 0.05), CHICKEN.edge).strokeCircle(cx, cy, r);
  const bx = cx + d.x * r, by = cy + d.y * r, tip = cellPx * 0.16, wing = cellPx * 0.09;
  g.fillStyle(CHICKEN.beak).fillTriangle(bx + d.x * tip, by + d.y * tip, bx - d.y * wing, by + d.x * wing, bx + d.y * wing, by - d.x * wing);
}

// MEC-013 / MEC-015 / MEC-016 section 8 greybox: lanes, rolling coconuts, patrol routes, NPCs and the bird shadow.
export function drawMovers(g: Graphics, snap: SimSnapshot, cellPx: number, timeMs: number, reducedMotion = false): void {
  const { coconut, npc, bird } = snap.families;
  for (const c of coconut) {
    drawLane(g, c.path, cellPx, timeMs, reducedMotion, c.state === 'warn');
    if (c.cell && c.state !== 'warn') {
      const cx = (c.cell.x + 0.5) * cellPx, cy = (c.cell.y + 0.5) * cellPx;
      g.fillStyle(LANE.coconut).fillCircle(cx, cy, cellPx * 0.36).fillStyle(LANE.coconutHi).fillCircle(cx - cellPx * 0.1, cy - cellPx * 0.1, cellPx * 0.1);
    }
  }
  for (const n of npc) {
    drawLane(g, n.path, cellPx, timeMs, reducedMotion, n.state === 'warn');
    drawNpc(g, n, cellPx);
  }
  if (bird) {
    // MEC-016 §8 the shadow is the warning: filled ellipse plus outline, shrinking as the steal nears.
    const k = shadowScale(bird.leftMs, bird.shadowMs), w = cellPx * (0.5 + 0.9 * k), h = w * 0.6;
    const cx = (bird.x + 0.5) * cellPx, cy = (bird.y + 0.5) * cellPx;
    g.fillStyle(SHADOW, 0.35).fillEllipse(cx, cy, w, h);
    g.lineStyle(Math.max(1, cellPx * 0.05), SHADOW).strokeEllipse(cx, cy, w, h);
  }
}
