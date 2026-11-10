// D3-R7 adaptive canvas height: 540 wide, height from the viewport aspect, set before new Phaser.Game.
import { setHeight, VIEW, WIDTH } from './layout';

export function viewHeight(vw: number, vh: number): number {
  if (!(vw > 0) || !(vh > 0)) return VIEW.minH;
  return Math.min(VIEW.maxH, Math.max(VIEW.minH, Math.round(WIDTH * vh / vw)));
}

export function initViewport(win: { innerWidth: number; innerHeight: number } | undefined =
  typeof window !== 'undefined' ? window : undefined): number {
  const h = win ? viewHeight(win.innerWidth, win.innerHeight) : VIEW.minH;
  setHeight(h);
  return h;
}

/** D3-R7 colour of the page bands around the canvas (outer stop of the current biome background). */
export function setBandColor(hex: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.background = hex;
  document.body.style.background = hex;
}
