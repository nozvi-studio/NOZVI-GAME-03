import type Phaser from 'phaser';
import type { Dir } from '../../core';
import { TOKENS, toInt } from '../uiTokens';
import { ui } from '../ui/layout';
import { hostOf, lipPx, skinTexture } from '../ui/skin';
import { dpadStyle, type DpadState } from './dpadStyle';

export interface DpadRect { x: number; y: number; w: number; h: number }
export interface DpadKeys { up: DpadRect; left: DpadRect; right: DpadRect; down: DpadRect }
const DIRECTIONS: { name: keyof DpadKeys; dir: Dir }[] = [
  { name: 'up', dir: { x: 0, y: -1 } }, { name: 'left', dir: { x: -1, y: 0 } },
  { name: 'right', dir: { x: 1, y: 0 } }, { name: 'down', dir: { x: 0, y: 1 } },
];
// Mockup px of the chevron drawing (GameDpadD2); the face is the light `round` skin (D3-R9).
const M = { icon: 26, iconBox: 24, stroke: 3, back: 3, side: 5, tip: 2, glow: 4, glowGap: 2, press: 0.94 } as const;

// D3-R9 D-pad: four round light keys placed in canvas-px rects; pointer-down turns, buffered heading, reverse hint; place() re-places them (R4).
export function createDpad(scene: Phaser.Scene, keys: DpadKeys, onTurn: (d: Dir) => void):
  { setHeading(d: Dir): void; setVisible(v: boolean): void; place(keys: DpadKeys): void } {
  const host = hostOf(scene), unit = ui(1);
  let r = keys.up.w / 2;
  const centre = (k: DpadRect): { x: number; y: number } => ({ x: k.x + k.w / 2, y: k.y + k.h / 2 });
  const buttons = DIRECTIONS.map(({ name, dir }) => {
    const rect = keys[name], d = rect.w, c = centre(rect);
    const lip = scene.add.image(0, lipPx('round', 'light', unit), skinTexture(host, 'round', 'light', d, d, 'lip', unit));
    const face = scene.add.image(0, 0, skinTexture(host, 'round', 'light', d, d, 'rest', unit));
    const g = scene.add.graphics();
    const button = scene.add.container(c.x, c.y, [lip, face, g])
      .setName(`dpad-${name}`).setSize(d, d).setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => { button.setScale(M.press); onTurn(dir); });
    const release = (): void => { button.setScale(1); };
    button.on('pointerup', release); button.on('pointerout', release);
    return { button, g, dir, name, state: 'idle' as DpadState };
  });
  const k = ui(M.icon) / M.iconBox;
  const paint = (g: Phaser.GameObjects.Graphics, d: Dir, state: DpadState): void => {
    const p = { x: -d.y, y: d.x }, st = dpadStyle(state);
    g.clear();
    if (st.glow) g.lineStyle(ui(M.glow), toInt(TOKENS.hud.glow), TOKENS.hud.glowAlpha).strokeCircle(0, 0, r + ui(M.glowGap));
    g.lineStyle(M.stroke * k, toInt(TOKENS.text.primary)).beginPath()
      .moveTo((-M.back * d.x + M.side * p.x) * k, (-M.back * d.y + M.side * p.y) * k).lineTo(M.tip * d.x * k, M.tip * d.y * k)
      .lineTo((-M.back * d.x - M.side * p.x) * k, (-M.back * d.y - M.side * p.y) * k).strokePath();
  };
  for (const b of buttons) paint(b.g, b.dir, 'idle');
  return {
    setHeading: d => {
      for (const b of buttons) {
        const heading = b.dir.x === d.x && b.dir.y === d.y, blocked = b.dir.x === -d.x && b.dir.y === -d.y;
        b.state = heading ? 'heading' : blocked ? 'blocked' : 'idle';
        b.button.setAlpha(dpadStyle(b.state).alpha); paint(b.g, b.dir, b.state);
      }
    },
    setVisible: v => { for (const { button } of buttons) { button.setVisible(v); if (button.input) button.input.enabled = v; } },
    place: next => {
      r = next.up.w / 2;
      for (const b of buttons) { const c = centre(next[b.name]); b.button.setPosition(c.x, c.y); paint(b.g, b.dir, b.state); }
    },
  };
}
