// D3-R7 adaptive canvas height: 540 wide, height from the viewport aspect, set before new Phaser.Game.
import { setBoard, setHeight, VIEW, WIDTH } from './layout';
import { boardRect } from './hud/d3HudLayout';
import { d3, d3Height } from './ui/layout';

let bandLocked = false;

export function viewHeight(vw: number, vh: number): number {
  if (!(vw > 0) || !(vh > 0)) return VIEW.minH;
  return Math.min(VIEW.maxH, Math.max(VIEW.minH, Math.round(WIDTH * vh / vw)));
}

export function initViewport(win: { innerWidth: number; innerHeight: number } | undefined =
  typeof window !== 'undefined' ? window : undefined): number {
  const h = win ? viewHeight(win.innerWidth, win.innerHeight) : VIEW.minH;
  setHeight(h);
  const r = boardRect(d3Height()); // D3-R9
  setBoard({ x: d3(r.x), y: d3(r.y), size: d3(r.size) });
  return h;
}

function paintBand(hex: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.background = hex;
  document.body.style.background = hex;
}

// D4-P1-R1 DOM menus own the page background while open.
export function setBandLock(locked: boolean, hex?: string): void {
  bandLocked = locked;
  if (locked && hex) paintBand(hex);
}

/** D3-R7 colour of the page bands around the canvas (outer stop of the current biome background). */
export function setBandColor(hex: string): void {
  if (bandLocked) return;
  paintBand(hex);
}
