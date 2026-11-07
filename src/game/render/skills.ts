import type Phaser from 'phaser';
import type { Balance, SimSnapshot } from '../../core';
import { drawRock } from './hazards';
import type { BoardLook } from './biomePalette';
import { P1_COLORS, type Palette } from './palette';

type Graphics = Phaser.GameObjects.Graphics;
/** Greybox blink half-period (presentation only; the blink window comes from balance). */
const BLINK_HALF_PERIOD_MS = 200;
const blinkOff = (leftMs: number, windowMs: number, time: number): boolean =>
  leftMs <= windowMs && Math.floor(time / BLINK_HALF_PERIOD_MS) % 2 === 1;

// MEC-006 §8 orbs, rain mangoes, snip walls and rubble (greybox shapes, blink = shape on/off).
export function drawSkillObjects(g: Graphics, s: SimSnapshot, cell: number, p: Palette, look: BoardLook, b: Balance, time: number): void {
  const c = (x: number): number => (x + 0.5) * cell;
  for (const w of s.snipWall) {
    const crumble = w.state === 'crumble';
    drawRock(g, { x: c(w.x), y: c(w.y) }, cell, look, 1, 'rock', crumble);   // drawRock owns the crumble fade
    g.fillStyle(P1_COLORS.snipStripe, crumble ? 0.45 : 1).fillRect(c(w.x) - cell * 0.3, c(w.y) - cell * 0.06, cell * 0.6, cell * 0.12);
  }
  for (const r of s.rubble) {
    drawRock(g, { x: c(r.x), y: c(r.y) }, cell, look, 1, 'pebble', r.state === 'crumble');
  }
  for (const o of s.orbs) {
    if (blinkOff(o.leftMs, b.energy.orbBlinkMs, time)) continue;
    g.fillStyle(P1_COLORS.orb).fillCircle(c(o.x), c(o.y), cell * 0.3);
    g.lineStyle(Math.max(2, cell * 0.06), P1_COLORS.orbLine).strokeCircle(c(o.x), c(o.y), cell * 0.3);
  }
  for (const m of s.rainMangoes) {
    if (blinkOff(m.leftMs, b.skills.mangoRain.mangoBlinkMs, time)) continue;
    g.fillStyle(p.food).fillEllipse(c(m.x), c(m.y), cell * 0.6, cell * 0.68);
    g.fillStyle(P1_COLORS.droplet).fillCircle(c(m.x) + cell * 0.18, c(m.y) - cell * 0.22, cell * 0.1);
  }
}

// MEC-006 §8 shield outline ring on the head and slow-mo blue board tint (drawn above the snake).
export function drawSkillOverlay(g: Graphics, s: SimSnapshot, cell: number, boardPx: number): void {
  if (s.slowmo) g.fillStyle(P1_COLORS.slowmo, 0.12).fillRect(0, 0, boardPx, boardPx);
  const head = s.snake[0];
  if (s.shield && head) g.lineStyle(Math.max(3, cell * 0.08), P1_COLORS.shield)
    .strokeCircle((head.x + 0.5) * cell, (head.y + 0.5) * cell, cell * 0.62);
}
