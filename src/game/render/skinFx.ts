import type Phaser from 'phaser';
import { TOKENS, toInt } from '../uiTokens';
import type { Particle } from './skinFxModel';

// MEC-011-R22/R23 draws the live particles: sparks as 4-point stars, leaves as small ellipses; both fade out with age.
export function drawSkinFx(g: Phaser.GameObjects.Graphics, live: readonly Particle[], now: number, cell: number): void {
  const t = TOKENS.d3.skinFx, spark = toInt(t.spark), leaf = toInt(t.leaf), edge = toInt(t.leafEdge);
  for (const p of live) {
    const k = Math.min(1, (now - p.born) / p.life), a = 1 - k, x = (p.x + p.vx * (now - p.born)) * cell, y = (p.y + p.vy * (now - p.born)) * cell, r = p.size * cell;
    if (p.kind === 'spark') {
      g.fillStyle(spark, a);
      g.fillTriangle(x, y - r, x + r * 0.28, y, x - r * 0.28, y).fillTriangle(x, y + r, x + r * 0.28, y, x - r * 0.28, y);
      g.fillTriangle(x - r, y, x, y - r * 0.28, x, y + r * 0.28).fillTriangle(x + r, y, x, y - r * 0.28, x, y + r * 0.28);
    } else {
      g.fillStyle(edge, a).fillEllipse(x, y, r * 1.5, r); g.fillStyle(leaf, a).fillEllipse(x, y, r * 1.2, r * 0.7);
    }
  }
}
