import type { Balance } from '../core';

// GDD-13 shared portrait coordinates for the game and HUD scenes.
export const WIDTH = 540;
export const HEIGHT = 960;
export const HEADER = { x: 18, y: 0, width: 504, height: 88 };
export const LEVEL_BAR = { x: 18, y: 96, width: 504, height: 44 };
export const BOARD = { x: 18, y: 152, size: 504 };
export const DPAD = { x: 130, y: 680, width: 280, height: 260 };
export const cellPx = (b: Balance): number => BOARD.size / b.board.cols;
