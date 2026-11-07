import type { Balance } from '../core';

// GDD-13 shared portrait coordinates for the game and HUD scenes.
export const WIDTH = 540;
export const HEIGHT = 960;
export const BOARD = { x: 18, y: 152, size: 504 };
export const cellPx = (b: Balance): number => BOARD.size / b.board.cols;
