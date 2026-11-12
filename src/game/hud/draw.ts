import type Phaser from 'phaser';
import { FONT_UI, TOKENS, toInt } from '../uiTokens';
import { ui } from '../ui/layout';

/** Rounded token card with the soft drop shadow (px are game px; dy in mockup px). */
export function drawCard(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, radius: number, fill: string,
  o: { shadowAlpha?: number; dy?: number } = {}): void {
  g.fillStyle(toInt(TOKENS.shadow.card.color), o.shadowAlpha ?? TOKENS.shadow.card.alpha).fillRoundedRect(x, y + ui(o.dy ?? TOKENS.shadow.card.y), w, h, radius)
    .fillStyle(toInt(fill)).fillRoundedRect(x, y, w, h, radius);
}
export function hudLabel(scene: Phaser.Scene, x: number, y: number, text: string, sizeMock: number, color: string,
  weight: 700 | 800 | 900 = 800, name = ''): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { fontFamily: FONT_UI, fontSize: `${ui(sizeMock)}px`, fontStyle: String(weight), color }).setName(name);
}
