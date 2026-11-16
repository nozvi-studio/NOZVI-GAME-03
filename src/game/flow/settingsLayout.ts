import { MENU } from '../ui/menuMetrics';
import type { Rect } from '../ui/menuLayout';
const S = MENU.settings.d3, W = 360;
export interface SettingsLayout { back: Rect; title: Rect; panel: Rect; rows: Rect[]; tile: Rect[]; toggle: Rect[]; caption: Rect }
export const knobTravel = (trackW: number, knobD: number): number => (trackW - knobD) / 2;
// D3-R19 / U6-R6 Settings rects in mock px (hm accepted for symmetry with the other layouts; the board is top-anchored).
export function settingsLayout(_hm: number, rowCount: number): SettingsLayout {
  const panel = { x: S.panelX, y: S.panelY, w: W - 2 * S.panelX, h: 2 * S.panelPadY + rowCount * S.rowH + (rowCount - 1) * S.divider };
  const rows = Array.from({ length: rowCount }, (_, i) => ({ x: panel.x, y: panel.y + S.panelPadY + i * (S.rowH + S.divider), w: panel.w, h: S.rowH }));
  return {
    back: { x: S.backX, y: S.backY, w: S.round, h: S.round }, title: { x: S.titleSide, y: S.titleY, w: W - 2 * S.titleSide, h: S.titleH }, panel, rows,
    tile: rows.map(r => ({ x: r.x + S.rowPadX, y: r.y + (r.h - S.tile) / 2, w: S.tile, h: S.tile })),
    toggle: rows.map(r => ({ x: r.x + r.w - S.rowPadX - S.toggleW, y: r.y + (r.h - S.toggleH) / 2, w: S.toggleW, h: S.toggleH })),
    caption: { x: 0, y: panel.y + panel.h + S.captionGap, w: W, h: S.captionH },
  };
}
