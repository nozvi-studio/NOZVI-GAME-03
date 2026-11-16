import { BOARD, WIDTH } from '../layout';
import { d3, ui } from '../ui/layout';
import { D3_RUN, type D3HudLayout } from './d3HudLayout';

/** UIFIX-R1 banner strip metrics (mockup px). BAND-R1: the strip rect is the banner band above the board (game px), never on a board cell. */
export const STRIP_MOCK = { alpha: 0.85, radius: 10, pad: 10, icon: 22, iconGap: 8, title: 15, sub: 11, pillGap: 6 } as const;
export function bannerStripRect(): { x: number; y: number; w: number; h: number } {
  const h = d3(D3_RUN.band.h);
  return { x: BOARD.x, y: BOARD.y - d3(D3_RUN.band.below) - h, w: BOARD.size, h };
}
/** UIFIX-R1 text row offsets (game px from the strip top): title alone is centred; with a sub line the pair is centred as one block. */
export function stripRows(hasSub: boolean, h: number): { titleY: number; subY: number | null } {
  const t = ui(STRIP_MOCK.title), s = ui(STRIP_MOCK.sub);
  if (!hasSub) return { titleY: (h - t) / 2, subY: null };
  const top = (h - (t + s)) / 2;
  return { titleY: top, subY: top + t };
}

/** UIFIX-R2 bubble top-left for a tip whose tail points at a skill button; clamped so it never covers the board (UIFIX-R2). */
export function skillTipPlacement(l: D3HudLayout, slot: 0 | 1, w: number, h: number, m: { margin: number; tailLeft: number; tailGap: number }): { x: number; y: number } {
  const s = l.skills[slot], cx = d3(s.x + s.w / 2), groupTop = d3(s.y);
  return { x: Math.min(WIDTH - m.margin - w, Math.max(m.margin, cx - m.tailLeft)), y: Math.max(BOARD.y + BOARD.size, groupTop - m.tailGap - h) };
}
