import type Phaser from 'phaser';
import type { Balance, Cell, HazardView, SimSnapshot } from '../../core';
import type { Palette } from './palette';

type Graphics = Phaser.GameObjects.Graphics;

// MEC-004 prototype rock body and rotated highlight (L808–814).
export function drawRock(g: Graphics, c: Cell, size: number, p: Palette, alpha = 1): void {
  g.fillStyle(p.rock, alpha).fillEllipse(c.x, c.y + size * 0.04, size * 0.84, size * 0.72);
  g.save().translateCanvas(c.x - size * 0.1, c.y - size * 0.08).rotateCanvas(-0.4);
  g.fillStyle(p.rockHi, alpha).fillEllipse(0, 0, size * 0.34, size * 0.22);
  g.restore();
}

// MEC-004 rails join all four neighboring cells of the same fence.
export function drawFence(g: Graphics, c: Cell, h: HazardView, cell: number, p: Palette, k: number, alpha = 1): void {
  const x = c.x * cell, y = c.y * cell, cx = x + cell / 2, cy = y + cell / 2, t = cell * 0.11;
  const has = (dx: number, dy: number): boolean => h.cells.some(n => n.x === c.x + dx && n.y === c.y + dy);
  g.fillStyle(p.woodHi, alpha);
  if (has(1, 0)) { g.fillRect(cx, cy - cell * 0.2, cell / 2 + 0.5, t); g.fillRect(cx, cy + cell * 0.09, cell / 2 + 0.5, t); }
  if (has(-1, 0)) { g.fillRect(x, cy - cell * 0.2, cell / 2, t); g.fillRect(x, cy + cell * 0.09, cell / 2, t); }
  if (has(0, 1)) { g.fillRect(cx - cell * 0.2, cy, t, cell / 2 + 0.5); g.fillRect(cx + cell * 0.09, cy, t, cell / 2 + 0.5); }
  if (has(0, -1)) { g.fillRect(cx - cell * 0.2, y, t, cell / 2); g.fillRect(cx + cell * 0.09, y, t, cell / 2); }
  const post = cell * 0.42 * k;
  g.fillStyle(p.wood, alpha).fillRoundedRect(cx - post / 2, cy - post / 2, post, post, post * 0.25);
}

// MEC-004 hedge body and three leaf highlights.
export function drawHedge(g: Graphics, c: Cell, cell: number, p: Palette, k: number, alpha = 1): void {
  const size = cell * 0.92 * k, x = (c.x + 0.5) * cell - size / 2, y = (c.y + 0.5) * cell - size / 2;
  g.fillStyle(p.hedge, alpha).fillRoundedRect(x, y, size, size, size * 0.28);
  g.fillStyle(p.hedgeHi, alpha);
  for (const [ox, oy] of [[0.3, 0.32], [0.68, 0.3], [0.48, 0.68]]) g.fillCircle(x + size * ox, y + size * oy, size * 0.11);
}

// MEC-004 accelerate the warning pulse as landing approaches.
export function drawWarn(g: Graphics, c: Cell, cell: number, ms: number, progress: number, color: number, jitter: boolean, reduced: boolean): void {
  const pulse = reduced ? 1 : 0.5 + 0.5 * Math.abs(Math.sin(ms * (0.006 + 0.014 * progress)));
  const off = jitter && !reduced ? Math.sin(ms / 28) * cell * 0.04 : 0;
  g.fillStyle(color, (0.3 + 0.55 * progress) * pulse)
    .fillRoundedRect(c.x * cell + cell * 0.08 + off, c.y * cell + cell * 0.08, cell * 0.84, cell * 0.84, cell * 0.18);
}

// MEC-004 draw rising-ground zone marks, warning and raised tiles.
export function drawTerrains(g: Graphics, terrains: SimSnapshot['terrains'], cell: number, p: Palette, b: Balance, reduced: boolean): void {
  for (const terrain of terrains) {
    const a = Math.min(1, terrain.t / b.ui.terrainFadeInMs) * (terrain.t > terrain.lifeMs
      ? Math.max(0, 1 - (terrain.t - terrain.lifeMs) / b.terrain.fadeOutMs) : 1);
    for (const c of terrain.cells) {
      const x = c.x * cell, y = c.y * cell;
      g.fillStyle(p.earthSide, 0.4 * a).fillRoundedRect(x + cell * 0.1, y + cell * 0.1, cell * 0.8, cell * 0.8, cell * 0.15);
      if (c.vis === 'warn') {
        const downMs = b.terrain.periodMs - b.terrain.upMs - b.terrain.warnMs;
        const ct = Math.max(0, terrain.t - b.terrain.startDelayMs - c.delay) % b.terrain.periodMs - downMs;
        drawWarn(g, c, cell, Math.max(0, ct), Math.min(1, Math.max(0, ct) / b.terrain.warnMs), p.warn, true, reduced);
      } else if (c.vis === 'up') {
        g.fillStyle(p.earthSide).fillRoundedRect(x + cell * 0.06, y + cell * 0.16, cell * 0.88, cell * 0.8, cell * 0.16);
        g.fillStyle(p.earth).fillRoundedRect(x + cell * 0.06, y + cell * 0.02, cell * 0.88, cell * 0.72, cell * 0.16);
      }
    }
  }
}

// MEC-004 warnings, landing pop, expiry flicker and crumble remain cosmetic.
export function drawHazards(g: Graphics, hazards: SimSnapshot['hazards'], cell: number, p: Palette, b: Balance, reduced: boolean): void {
  for (const h of hazards) for (const c of h.cells) {
    if (h.state === 'warn' || (h.state === 'solid' && !c.on)) {
      const ms = h.state === 'warn' ? h.t : h.warnMs;
      drawWarn(g, c, cell, ms, Math.min(1, ms / h.warnMs), p.danger, false, reduced);
      continue;
    }
    let k = reduced ? 1 : Math.min(1, 0.6 + c.ageMs / 250), alpha = 1;
    if (h.state === 'crumble') { alpha = Math.max(0, 1 - h.t / b.hazard.crumbleMs); k = Math.max(0.15, alpha); }
    else if (h.lifeMs - h.t < b.ui.hazardFlickerMs && !reduced) alpha = 0.55 + 0.45 * Math.abs(Math.sin(h.t / 90));
    if (h.type === 'rock') drawRock(g, { x: (c.x + 0.5) * cell, y: (c.y + 0.5) * cell }, cell * k, p, alpha);
    else if (h.type === 'fence') drawFence(g, c, h, cell, p, k, alpha);
    else drawHedge(g, c, cell, p, k, alpha);
  }
}
