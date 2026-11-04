import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { BOARD, cellPx } from '../layout';
import type { Palette } from './palette';

// Prototype CSS L72–73: 18px board corners, 4px external ink outline.
export const BOARD_RADIUS = 18;
export const BOARD_OUTLINE = 4;

// GDD-13 center the outline outside the board, matching the CSS box-shadow spread.
export function drawBoardBorder(g: Phaser.GameObjects.Graphics, p: Palette): void {
  const half = BOARD_OUTLINE / 2;
  g.lineStyle(BOARD_OUTLINE, p.ink).strokeRoundedRect(-half, -half,
    BOARD.size + BOARD_OUTLINE, BOARD.size + BOARD_OUTLINE, BOARD_RADIUS + half);
}

// GDD-13 cache the checkerboard, rebuilding only when its palette changes.
export function buildBoardTexture(scene: Phaser.Scene, b: Balance, p: Palette): string {
  let cache = scene.children.getByName('board-cache') as Phaser.GameObjects.RenderTexture | null;
  if (!cache) {
    if (scene.textures.exists('board')) scene.textures.remove('board');
    cache = scene.add.renderTexture(0, 0, BOARD.size, BOARD.size).setName('board-cache').setVisible(false);
    cache.saveTexture('board');
  }
  const g = scene.add.graphics();
  const cell = cellPx(b);
  for (let y = 0; y < b.board.rows; y++) for (let x = 0; x < b.board.cols; x++) {
    g.fillStyle((x + y) % 2 ? p.boardB : p.boardA).fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5);
  }
  cache.clear().draw(g);
  g.destroy();
  return 'board';
}
