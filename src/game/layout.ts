import type { Balance } from '../core';

// GDD-13 shared portrait coordinates for the game and HUD scenes.
export const WIDTH = 540;
// D3-R7 logical canvas height bounds; the height is picked once at boot (src/game/viewport.ts).
export const VIEW = { minH: 960, maxH: 1200 } as const;
/** D3-R7 live binding: read it inside functions only (guard: tests/game/heightGuard.test.ts). */
export let HEIGHT: number = VIEW.minH;
export function setHeight(h: number): void { HEIGHT = h; }
/** D3-R9 live binding (canvas px), set by initViewport from boardRect; read inside functions only (guard: tests/game/heightGuard.test.ts). */
export let BOARD: { x: number; y: number; size: number } = { x: 15, y: 168, size: 510 };
export function setBoard(b: { x: number; y: number; size: number }): void { BOARD = b; }
export const cellPx = (b: Balance): number => BOARD.size / b.board.cols;
