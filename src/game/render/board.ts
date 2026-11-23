import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { BOARD, cellPx } from '../layout';
import type { BoardLook } from './biomePalette';
import { mixInt } from './biomePalette';
import { FRAME } from './boardParts';
import { D4_RUN } from '../hud/d3HudLayout';
import { TOKENS, toInt } from '../uiTokens';

export interface RoundRect { x: number; y: number; w: number; h: number; r: number; color: number; alpha: number }

// D4-P5-R1 rounded tactile board frame with 4px darker bottom lip, no heavy dark border.
export function frameRects(look: BoardLook, size: number, cell: number): { drop: RoundRect; frame: RoundRect; shadow: RoundRect } {
  const d4run = TOKENS.d4run;
  const scale = cell > 0 ? cell / 24 : 1;
  const pad = Math.min(FRAME.pad * cell, D4_RUN.board.stroke * scale);
  const lip = D4_RUN.board.lip * scale;
  const r = D4_RUN.board.radius * scale;
  const w = size + 2 * pad;
  const frame: RoundRect = { x: -pad, y: -pad, w, h: w, r, color: look.frame, alpha: 1 };
  const lipColor = mixInt(look.frame, toInt(d4run.hud.ink), 0.28);
  return {
    drop: { ...frame, y: frame.y + lip, color: lipColor, alpha: 1 },
    frame,
    shadow: { x: 0, y: 0, w: size, h: FRAME.shadowH * cell, r: FRAME.shadowRadius * cell, color: toInt(TOKENS.d3.board.frameShadow), alpha: FRAME.shadowAlpha * 0.5 },
  };
}

function fillRound(g: Phaser.GameObjects.Graphics, r: RoundRect): void {
  g.fillStyle(r.color, r.alpha).fillRoundedRect(r.x, r.y, r.w, r.h, r.r);
}

// D3-R12 draws the drop shadow and the frame (below the ground).
export function drawBoardFrame(g: Phaser.GameObjects.Graphics, look: BoardLook, size: number, cell: number): void {
  const f = frameRects(look, size, cell);
  fillRound(g, f.drop); fillRound(g, f.frame);
}

// D3-R12 inner top shadow, drawn above the ground inside the board container.
export function drawBoardShadow(g: Phaser.GameObjects.Graphics, look: BoardLook, size: number, cell: number): void {
  fillRound(g, frameRects(look, size, cell).shadow);
}

// Presentation seam fix: checker rects overlap by half a pixel so no hairline shows between cells.
const SEAM_PX = 0.5;
export interface GroundRect { x: number; y: number; w: number; h: number; color: number; alpha: number }
// P3b1-R3 BiomeBoardsD2 ground: per-cell checker, no grid lines (D3-R4).
export function groundRects(look: BoardLook, cols: number, rows: number, cell: number): GroundRect[] {
  const out: GroundRect[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    out.push({ x: x * cell, y: y * cell, w: cell + SEAM_PX, h: cell + SEAM_PX, color: (x + y) % 2 ? look.groundB : look.groundA, alpha: 1 });
  }
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
