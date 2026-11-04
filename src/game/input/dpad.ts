import type Phaser from 'phaser';
import type { Dir } from '../../core';
import { currentPalette } from '../render/palette';

const DIRECTIONS: { name: string; dir: Dir; col: number; row: number }[] = [
  { name: 'up', dir: { x: 0, y: -1 }, col: 1, row: 0 },
  { name: 'left', dir: { x: -1, y: 0 }, col: 0, row: 1 },
  { name: 'right', dir: { x: 1, y: 0 }, col: 2, row: 1 },
  { name: 'down', dir: { x: 0, y: 1 }, col: 1, row: 2 },
];

// GDD-13 always-visible D-pad: pointer-down turns, buffered heading and reverse hint (L708–735).
export function createDpad(scene: Phaser.Scene, rect: { x: number; y: number; width: number; height: number }, onTurn: (d: Dir) => void): { setHeading(d: Dir): void } {
  const w = rect.width / 3 - 8, h = rect.height / 3 - 8;
  const buttons = DIRECTIONS.map(({ name, dir, col, row }) => {
    const g = scene.add.graphics();
    const button = scene.add.container(rect.x + (col + .5) * rect.width / 3, rect.y + (row + .5) * rect.height / 3, [g])
      .setName(`dpad-${name}`).setSize(w, h).setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => { button.setScale(.94); onTurn(dir); });
    const release = (): void => { button.setScale(1); };
    button.on('pointerup', release); button.on('pointerout', release);
    return { button, g, dir };
  });
  return { setHeading: d => {
    const p = currentPalette();
    for (const { button, g, dir } of buttons) {
      const heading = dir.x === d.x && dir.y === d.y, blocked = dir.x === -d.x && dir.y === -d.y;
      button.setAlpha(blocked ? .35 : heading ? 1 : .85);
      g.clear().fillStyle(heading ? p.gold : p.panel).fillRoundedRect(-w / 2, -h / 2, w, h, 16)
        .lineStyle(3, p.ink).strokeRoundedRect(-w / 2, -h / 2, w, h, 16).fillStyle(p.ink)
        .fillTriangle(dir.x * 15, dir.y * 15, -dir.x * 10 - dir.y * 11, -dir.y * 10 + dir.x * 11,
          -dir.x * 10 + dir.y * 11, -dir.y * 10 - dir.x * 11);
    }
  } };
}
