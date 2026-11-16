// src/game/render/fixedTerrain.ts - MEC-019-R9 fixed terrain drawn with the biome's rock and fence art.
import type Phaser from 'phaser';
import type { Balance, SimSnapshot } from '../../core';
import type { BoardLook } from './biomePalette';
import { drawFence, drawRock, drawWarn } from './hazards';
import type { TelegraphCtx } from './telegraph';

type Graphics = Phaser.GameObjects.Graphics;
const MIN_CRUMBLE_SCALE = 0.15;

export function drawFixedTerrain(g: Graphics, view: SimSnapshot['fixedTerrain'], cell: number, look: BoardLook, b: Balance, reduced: boolean, tel: TelegraphCtx): void {
  const fences: { x: number; y: number; k: number }[] = [];
  for (const c of view.cells) {
    if (c.state === 'warn') {
      drawWarn(g, c, cell, b.fixedTerrain.warnMs - c.leftMs, b.fixedTerrain.warnMs, look, 'hazard', false, reduced, tel.cfg);
      continue;
    }
    const crumble = c.state === 'crumble', a = crumble ? Math.max(0, c.leftMs / b.hazard.crumbleMs) : 1;
    if (c.kind === 'R') drawRock(g, { x: (c.x + 0.5) * cell, y: (c.y + 0.5) * cell }, cell, look, a, 'rock', crumble);
    else if (crumble) drawFence(g, [{ x: c.x, y: c.y, k: Math.max(MIN_CRUMBLE_SCALE, a) }], cell, look, a);
    else fences.push({ x: c.x, y: c.y, k: 1 });
  }
  if (fences.length) drawFence(g, fences, cell, look, 1);
}

// MEC-019-R7 the invulnerable snake blinks; reduced motion shows a steady lower alpha.
export function invulnAlpha(invuln: { leftMs: number } | null, timeMs: number, reduced: boolean, cfg: { invulnBlinkMs: number; invulnLowAlpha: number }): number {
  if (!invuln) return 1;
  if (reduced) return cfg.invulnLowAlpha;
  return Math.floor(timeMs / cfg.invulnBlinkMs) % 2 === 1 ? cfg.invulnLowAlpha : 1;
}
