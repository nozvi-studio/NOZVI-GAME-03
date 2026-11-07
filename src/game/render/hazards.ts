import type Phaser from 'phaser';
import type { Balance, Cell, SimSnapshot } from '../../core';
import type { BoardLook } from './biomePalette';
import { bangGeometry, chevronPoints, PART, ROCK, rockMetrics, WARN, type RockKind } from './boardParts';
import { dashedRect } from './movers';

type Graphics = Phaser.GameObjects.Graphics;
type PopCell = { x: number; y: number; k: number };

// P3b1-R4 two-layer rounded box: edge colour underneath, fill inset by the border width (CSS border-box look).
export function boxed(g: Graphics, x: number, y: number, w: number, h: number, r: number, fill: number, edge: number, bw: number, alpha: number): void {
  g.fillStyle(edge, alpha).fillRoundedRect(x, y, w, h, r);
  g.fillStyle(fill, alpha).fillRoundedRect(x + bw, y + bw, w - 2 * bw, h - 2 * bw, Math.max(0, r - bw));
}

// P3b1-R4 Rock.dc: drop shadow, edge ring, shaded body, top face, rotated highlight; crumble adds crack and two debris chips.
export function drawRock(g: Graphics, c: Cell, size: number, look: BoardLook, alpha = 1, kind: RockKind = 'rock', crumble = false): void {
  const m = rockMetrics(kind, size), a = crumble ? alpha * ROCK.crumbleAlpha : alpha;
  const bw = m.d - 2 * m.edge, bh = m.h - 2 * m.edge;
  g.fillStyle(look.edge, ROCK.dropAlpha * a).fillEllipse(c.x, c.y + m.drop, m.d, m.h);
  g.fillStyle(look.edge, a).fillEllipse(c.x, c.y, m.d, m.h);
  g.fillStyle(PART.rock.shade, a).fillEllipse(c.x, c.y, bw, bh);
  g.fillStyle(PART.rock.fill, a).fillEllipse(c.x, c.y - m.band / 2, bw, bh - m.band);
  g.save().translateCanvas(c.x + m.hl.dx, c.y + m.hl.dy).rotateCanvas(m.hl.rot);
  g.fillStyle(ROCK.hiColor, ROCK.hiAlpha * a).fillEllipse(0, 0, m.hl.w, m.hl.h);
  g.restore();
  if (!crumble) return;
  const ox = c.x - m.d / 2, oy = c.y - m.d / 2, s = m.d / 20;
  const crack: [number, number][] = [[11, 2], [8.5, 7.5], [12, 10.5], [9, 14.5], [11, 19]];
  g.lineStyle(Math.max(1, size * ROCK.crackWidth), look.edge, a);
  for (let i = 0; i < crack.length - 1; i++) g.lineBetween(ox + crack[i]![0] * s, oy + crack[i]![1] * s, ox + crack[i + 1]![0] * s, oy + crack[i + 1]![1] * s);
  const x0 = c.x - size / 2, y0 = c.y - size / 2, bd = Math.max(1, size * ROCK.crackWidth * 0.6);
  boxed(g, x0 + size * 0.86, y0 + size * 0.66, size * 0.2, size * 0.2, size * 0.08, PART.rock.fill, look.edge, bd, a);
  boxed(g, x0 + size * 0.02, y0 + size * 0.78, size * 0.15, size * 0.15, size * 0.06, PART.rock.fill, look.edge, bd, a);
}

// P3b1-R5 MEC-004 accelerating pulse kept; the outline ring, dashes and the "!" / chevron shape never depend on colour alone.
export function drawWarn(g: Graphics, c: Cell, cell: number, ms: number, progress: number, look: BoardLook, kind: 'hazard' | 'rise', jitter: boolean, reduced: boolean): void {
  const pulse = reduced ? 1 : 0.5 + 0.5 * Math.abs(Math.sin(ms * (0.006 + 0.014 * progress)));
  const off = jitter && !reduced ? Math.sin(ms / 28) * cell * 0.04 : 0;
  const x = c.x * cell + off, y = c.y * cell, ring = cell * WARN.ring, inset = cell * WARN.inset, size = cell - 2 * inset;
  const hazard = kind === 'hazard', mark = reduced ? 1 : 0.35 + 0.65 * pulse;
  g.lineStyle(ring, look.edge, 1).strokeRoundedRect(x - ring / 2, y - ring / 2, cell + ring, cell + ring, cell * WARN.radius + ring / 2);
  g.fillStyle(hazard ? PART.warn.fill : PART.stone.warnFill, (WARN.fillBase + WARN.fillGain * progress) * pulse + (hazard ? 0 : 0.3))
    .fillRoundedRect(x + inset, y + inset, size, size, cell * WARN.tileRadius);
  g.lineStyle(Math.max(1, cell * WARN.dashWidth), hazard ? PART.warn.dash : PART.stone.warnDash, mark);
  dashedRect(g, x + inset, y + inset, size, size, cell * WARN.dash);
  if (hazard) {
    const k = bangGeometry(cell);
    g.fillStyle(PART.warn.bang, mark).fillRoundedRect(x + k.bar.x, y + k.bar.y, k.bar.w, k.bar.h, k.bar.r).fillCircle(x + k.dot.x, y + k.dot.y, k.dot.r);
  } else {
    const [a, apex, e] = chevronPoints(cell);
    g.lineStyle(cell * WARN.chevronWidth, PART.stone.chevron, mark);
    g.lineBetween(x + a[0], y + a[1], x + apex[0], y + apex[1]).lineBetween(x + apex[0], y + apex[1], x + e[0], y + e[1]);
  }
}

// P3b1-R4 Task 5 replaces these stubs with the fence and hedge art.
function drawFence(_g: Graphics, _c: readonly PopCell[], _cell: number, _look: BoardLook, _alpha: number): void {}
function drawHedge(_g: Graphics, _c: readonly PopCell[], _cell: number, _look: BoardLook, _alpha: number): void {}

// MEC-004 draw rising-ground zone marks, warning and raised tiles.
export function drawTerrains(g: Graphics, terrains: SimSnapshot['terrains'], cell: number, look: BoardLook, b: Balance, reduced: boolean): void {
  for (const terrain of terrains) {
    const a = Math.min(1, terrain.t / b.ui.terrainFadeInMs) * (terrain.t > terrain.lifeMs
      ? Math.max(0, 1 - (terrain.t - terrain.lifeMs) / b.terrain.fadeOutMs) : 1);
    for (const c of terrain.cells) {
      const x = c.x * cell, y = c.y * cell;
      g.fillStyle(look.edge, 0.4 * a).fillRoundedRect(x + cell * 0.1, y + cell * 0.1, cell * 0.8, cell * 0.8, cell * 0.15);
      if (c.vis === 'warn') {
        const downMs = b.terrain.periodMs - b.terrain.upMs - b.terrain.warnMs;
        const ct = Math.max(0, terrain.t - b.terrain.startDelayMs - c.delay) % b.terrain.periodMs - downMs;
        drawWarn(g, c, cell, Math.max(0, ct), Math.min(1, Math.max(0, ct) / b.terrain.warnMs), look, 'rise', true, reduced);
      } else if (c.vis === 'up') {
        g.fillStyle(look.edge).fillRoundedRect(x + cell * 0.06, y + cell * 0.16, cell * 0.88, cell * 0.8, cell * 0.16);
        g.fillStyle(PART.stone.front).fillRoundedRect(x + cell * 0.06, y + cell * 0.02, cell * 0.88, cell * 0.72, cell * 0.16);
      }
    }
  }
}

// P3b1-R4 MEC-004 warnings, landing pop, expiry flicker and crumble stay cosmetic; art follows BiomeBoardsD2.
export function drawHazards(g: Graphics, hazards: SimSnapshot['hazards'], cell: number, look: BoardLook, b: Balance, reduced: boolean): void {
  for (const h of hazards) {
    const crumble = h.state === 'crumble';
    let alpha = 1, crumbleK = 1;
    if (crumble) { alpha = Math.max(0, 1 - h.t / b.hazard.crumbleMs); crumbleK = Math.max(0.15, alpha); }
    else if (h.lifeMs - h.t < b.ui.hazardFlickerMs && !reduced) alpha = 0.55 + 0.45 * Math.abs(Math.sin(h.t / 90));
    const solid: PopCell[] = [];
    for (const c of h.cells) {
      if (h.state === 'warn' || (h.state === 'solid' && !c.on)) {
        const ms = h.state === 'warn' ? h.t : h.warnMs;
        if (h.type === 'rock') drawRock(g, { x: (c.x + 0.5) * cell, y: (c.y + 0.5) * cell }, cell, look, ROCK.previewAlpha);
        drawWarn(g, c, cell, ms, Math.min(1, ms / h.warnMs), look, 'hazard', false, reduced);
        continue;
      }
      solid.push({ x: c.x, y: c.y, k: crumble ? crumbleK : reduced ? 1 : Math.min(1, 0.6 + c.ageMs / 250) });
    }
    if (h.type === 'rock') for (const c of solid) drawRock(g, { x: (c.x + 0.5) * cell, y: (c.y + 0.5) * cell }, cell * c.k, look, alpha, 'rock', crumble);
    else if (h.type === 'fence') drawFence(g, solid, cell, look, alpha);
    else drawHedge(g, solid, cell, look, alpha);
  }
}
