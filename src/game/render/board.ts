import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { BOARD, cellPx } from '../layout';
import type { BoardLook } from './biomePalette';
import { GRID_LINE } from './boardParts';
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

// Presentation seam fix: checker rects overlap by half a pixel so no hairline shows between cells.
const SEAM_PX = 0.5;
export interface GroundRect { x: number; y: number; w: number; h: number; color: number; alpha: number }
// P3b1-R3 BiomeBoardsD2 ground: per-cell checker, then a translucent grid line on the trailing edge of every cell.
export function groundRects(look: BoardLook, cols: number, rows: number, cell: number): GroundRect[] {
  const out: GroundRect[] = [], line = cell * GRID_LINE;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    out.push({ x: x * cell, y: y * cell, w: cell + SEAM_PX, h: cell + SEAM_PX, color: (x + y) % 2 ? look.groundB : look.groundA, alpha: 1 });
  }
  for (let i = 1; i <= cols; i++) out.push({ x: i * cell - line, y: 0, w: line, h: rows * cell, color: look.grid, alpha: look.gridAlpha });
  for (let j = 1; j <= rows; j++) out.push({ x: 0, y: j * cell - line, w: cols * cell, h: line, color: look.grid, alpha: look.gridAlpha });
  return out;
}

// P3b1-R3 cache the ground, rebuilding when the look (biome or theme) changes.
export function buildBoardTexture(scene: Phaser.Scene, b: Balance, look: BoardLook): string {
  let cache = scene.children.getByName('board-cache') as Phaser.GameObjects.RenderTexture | null;
  if (!cache) {
    if (scene.textures.exists('board')) scene.textures.remove('board');
    cache = scene.add.renderTexture(0, 0, BOARD.size, BOARD.size).setName('board-cache').setVisible(false);
    cache.saveTexture('board');
  }
  const g = scene.add.graphics();
  for (const r of groundRects(look, b.board.cols, b.board.rows, cellPx(b))) g.fillStyle(r.color, r.alpha).fillRect(r.x, r.y, r.w, r.h);
  cache.clear().draw(g);
  g.destroy();
  return 'board';
}
