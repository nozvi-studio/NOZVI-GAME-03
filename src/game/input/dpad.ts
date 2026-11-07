import type Phaser from 'phaser';
import type { Dir } from '../../core';
import { TOKENS, toInt } from '../uiTokens';
import { ui } from '../ui/layout';

const DIRECTIONS: { name: string; dir: Dir; col: number; row: number }[] = [
  { name: 'up', dir: { x: 0, y: -1 }, col: 1, row: 0 },
  { name: 'left', dir: { x: -1, y: 0 }, col: 0, row: 1 },
  { name: 'right', dir: { x: 1, y: 0 }, col: 2, row: 1 },
  { name: 'down', dir: { x: 0, y: 1 }, col: 1, row: 2 },
];
// Mockup px of the button drawing (GameDpadD2).
const M = { icon: 26, iconBox: 24, stroke: 3, back: 3, side: 5, tip: 2, shelf: 5, glow: 4, glowGap: 2, press: 0.94, idle: 0.85, blocked: 0.35 } as const;

// GameDpadD2: four round buttons on a grid, chevron icon, shelf shadow; GDD §3 optional D-pad (settings.dpad); pointer-down turns, buffered heading, reverse hint.
export function createDpad(scene: Phaser.Scene, spec: { x: number; y: number; btn: number; step: number },
  onTurn: (d: Dir) => void): { setHeading(d: Dir): void; setVisible(v: boolean): void } {
  const r = spec.btn / 2, k = ui(M.icon) / M.iconBox;
  const buttons = DIRECTIONS.map(({ name, dir, col, row }) => {
    const g = scene.add.graphics();
    const button = scene.add.container(spec.x + col * spec.step + r, spec.y + row * spec.step + r, [g])
      .setName(`dpad-${name}`).setSize(spec.btn, spec.btn).setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => { button.setScale(M.press); onTurn(dir); });
    const release = (): void => { button.setScale(1); };
    button.on('pointerup', release); button.on('pointerout', release);
    return { button, g, dir };
  });
  const paint = (g: Phaser.GameObjects.Graphics, d: Dir, heading: boolean): void => {
    const p = { x: -d.y, y: d.x };
    g.clear().fillStyle(toInt(TOKENS.hud.shelf), TOKENS.hud.shelfAlpha).fillCircle(0, ui(M.shelf), r);
    if (heading) g.lineStyle(ui(M.glow), toInt(TOKENS.hud.glow), TOKENS.hud.glowAlpha).strokeCircle(0, 0, r + ui(M.glowGap));
    g.fillStyle(toInt(TOKENS.surface.card)).fillCircle(0, 0, r);
    g.lineStyle(M.stroke * k, toInt(TOKENS.text.primary)).beginPath()
      .moveTo((-M.back * d.x + M.side * p.x) * k, (-M.back * d.y + M.side * p.y) * k).lineTo(M.tip * d.x * k, M.tip * d.y * k)
      .lineTo((-M.back * d.x - M.side * p.x) * k, (-M.back * d.y - M.side * p.y) * k).strokePath();
  };
  for (const { g, dir } of buttons) paint(g, dir, false);
  return {
    setHeading: d => {
      for (const { button, g, dir } of buttons) {
        const heading = dir.x === d.x && dir.y === d.y, blocked = dir.x === -d.x && dir.y === -d.y;
        button.setAlpha(blocked ? M.blocked : heading ? 1 : M.idle); paint(g, dir, heading);
      }
    },
    setVisible: v => { for (const { button } of buttons) { button.setVisible(v); if (button.input) button.input.enabled = v; } },
  };
}
