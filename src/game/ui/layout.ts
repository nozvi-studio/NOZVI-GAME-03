import { HEIGHT, WIDTH } from '../layout';
import { TOKENS } from '../uiTokens';
// P3-0-R2 mockup px (390 wide) -> game px (540 wide).
export const UI_SCALE = WIDTH / TOKENS.screen.w;
export const ui = (px: number): number => px * UI_SCALE;
export interface ColumnSpec { top: number; middle: number; bottom: number; height?: number; minShrink: number }
export interface ColumnLayout { topY: number; middleY: number; middleScale: number; bottomY: number; fits: boolean }
/**
 * P3-0-R2 top anchored, bottom anchored, middle centred and shrunk to fit (spec D2).
 * middleY is the top edge of the scaled middle block; callers centre it horizontally with an x offset of WIDTH * (1 - middleScale) / 2.
 */
export function layoutColumn(s: ColumnSpec): ColumnLayout {
  const height = s.height ?? HEIGHT;
  const top = ui(s.top), bottom = ui(s.bottom), middle = ui(s.middle);
  const room = height - top - bottom;
  const need = middle > 0 ? room / middle : 1;
  const middleScale = Math.min(1, Math.max(s.minShrink, need));
  const scaled = middle * middleScale;
  return { topY: 0, middleY: top + (room - scaled) / 2, middleScale, bottomY: height - bottom, fits: need >= s.minShrink };
}
