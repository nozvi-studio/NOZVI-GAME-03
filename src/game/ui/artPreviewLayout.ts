import { HEIGHT, WIDTH } from '../layout';
import { ui } from './layout';
import type { PillTone } from './widgets';

// Debug-only layout for the owner's phone check (ART-001 sizes 24 / 40 / 124 / 256 CSS px, each on light and dark).
export const PREVIEW = {
  page: 0xcfcfcf, light: 0xf6eedc, dark: 0x1f2433, cols: 3, cellW: 180, gridTop: 100, rowH: 76,
  swatchW: 84, swatchH: 56, swatchGap: 4, small: 24, mid: 40, smallDx: -18, midDx: 18, swatchDy: 28, labelDy: 66, labelSize: 13,
  titleY: 20, titleSize: 20, btnY: 60, btnW: 100, btnH: 40, btnSize: 18, btnXs: [70, 190, 310, 430],
  headRowY: 410, homeSize: 124, headSwatch: 130, headDx: 70, bodyRowY: 548, bodyW: 80, bodySwatchW: 90, bodySwatchH: 130,
  bodyDx: 50, bodyCols: 4, bodyPad: 5,
  bigSize: 256, liveTop: 680, liveY: 828,
  // UIFIX-R11 widget column in the left margin of the live panel (x stays left of the capy box). Positions in game px; w/h in mockup px (ui() inside the widgets).
  wPills: [{ x: 38, y: 716, tone: 'green' }, { x: 100, y: 716, tone: 'orange' }, { x: 38, y: 758, tone: 'cream' }] as readonly { x: number; y: number; tone: PillTone }[],
  wPillW: 40, wPillH: 22, wCardX: 72, wCardY: 742, wCardW: 40, wCardH: 28,
  wChipX: 50, wChipY: 808, wChipW: 78, wChipH: 36,                       // chip box is an estimate: text width + ui(20)
  wBarX: 10, wBarY: 840, wBarW: 60, wBarH: 10,
  wTitleX: 10, wTitleY: 866, wTitleSize: 10, wTitleChars: 11, wTitleCharEm: 0.6, wTitleLine: 1.4, // title box is an estimate: chars * em * font px
  liveMargin: 12,
  // Remotion POC (disposable, debug only): pre-rendered idle/eat/dead clip, 10 x 9 grid of 128 px frames at 30 fps.
  rmKey: 'capy-remotion', rmUrl: 'art/capy-remotion.png', rmFrame: 128, rmFrames: 90, rmFps: 30,
  rmX: 470, rmY: 828, rmSize: 120, rmLabelY: 900, rmLabel: 'Remotion',
} as const;

export interface Rect { name: string; x0: number; y0: number; x1: number; y1: number }
/** UIFIX-R11 boxes (game px) used by the overlap test: widget column, live capy (with margin) and the Remotion sprite. */
export function previewRects(): { widgets: Rect[]; live: Rect; remotion: Rect } {
  const P = PREVIEW, pw = ui(P.wPillW), ph = ui(P.wPillH);
  const widgets: Rect[] = P.wPills.map(p => ({ name: `pill-${p.tone}`, x0: p.x - pw / 2, y0: p.y - ph / 2, x1: p.x + pw / 2, y1: p.y + ph / 2 }));
  widgets.push({ name: 'card', x0: P.wCardX, y0: P.wCardY, x1: P.wCardX + ui(P.wCardW), y1: P.wCardY + ui(P.wCardH) });
  widgets.push({ name: 'chip', x0: P.wChipX - P.wChipW / 2, y0: P.wChipY - P.wChipH / 2, x1: P.wChipX + P.wChipW / 2, y1: P.wChipY + P.wChipH / 2 });
  widgets.push({ name: 'bar', x0: P.wBarX, y0: P.wBarY, x1: P.wBarX + ui(P.wBarW), y1: P.wBarY + ui(P.wBarH) });
  const tf = ui(P.wTitleSize);
  widgets.push({ name: 'title', x0: P.wTitleX, y0: P.wTitleY, x1: P.wTitleX + P.wTitleChars * P.wTitleCharEm * tf, y1: P.wTitleY + tf * P.wTitleLine });
  const half = P.bigSize / 2 + P.liveMargin;
  return {
    widgets,
    live: { name: 'live', x0: WIDTH / 2 - half, y0: P.liveY - half, x1: WIDTH / 2 + half, y1: Math.min(HEIGHT, P.liveY + half) },
    remotion: { name: 'remotion', x0: P.rmX - P.rmSize / 2, y0: P.rmY - P.rmSize / 2, x1: P.rmX + P.rmSize / 2, y1: P.rmY + P.rmSize / 2 },
  };
}
