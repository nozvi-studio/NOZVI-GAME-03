import { WIDTH } from '../layout';
import { hitSize, ui, type ColumnSpec } from './layout';
import { TOKENS } from '../uiTokens';
import { D3_BOOT, D3_HOME, D3_LOGO, MENU } from './menuMetrics';

export interface HeaderButton { cx: number; cy: number; hit: number }
/** UIFIX-R7 round header button (Settings gear on the right, back on the left): mockup centre, >= 48 CSS px hit area. */
export function headerButton(side: 'left' | 'right'): HeaderButton {
  const off = ui(MENU.side + MENU.round / 2);
  return { cx: side === 'left' ? off : WIDTH - off, cy: ui(MENU.padTop + MENU.round / 2), hit: hitSize(ui(MENU.round)) };
}

type Spec = ColumnSpec;
const head = MENU.padTop + MENU.round; // 66
/** Trail samples per px of corner arc (smooth enough at phone width, cheap to draw). */
const ARC_SAMPLES_PER_PX = 1.6;

/** UIFIX-R9 canvas CSS height below which Loadout cards use the compact metrics. */
export const isCompactHeight = (cssHeight: number): boolean => cssHeight < MENU.loadout.compactBelowCssH;
export function loadoutCards(compact: boolean): { cardH: number; cardGap: number } {
  const l = MENU.loadout;
  return compact ? l.compact : { cardH: l.cardH, cardGap: l.cardGap };
}
/** P3b3-R3 Loadout: header on top, Go! pinned bottom; slots, chips and the 4 cards in the middle (the mockup note line is dropped, C9). UIFIX-R9: compact cards. */
export function loadoutColumn(minShrink: number, compact = false): Spec {
  const l = MENU.loadout, g = MENU.gap, c = loadoutCards(compact);
  const middle = g + l.slotsH + g + l.chipsH + g + l.cards * c.cardH + (l.cards - 1) * c.cardGap;
  return { top: head, middle, bottom: l.goBottom + l.goH + g, minShrink };
}
export function settingsColumn(minShrink: number): Spec {
  const s = MENU.settings, g = MENU.section;
  const rows = s.rows * s.rowH; // each row box is rowH tall and includes its divider
  return { top: head, middle: g + rows + g + s.captionH, bottom: 0, minShrink };
}
// D3-R10 Boot rects (mock px): board positions shifted down by half the spare height.
export function bootRects(hm: number): { logo: Rect & { scale: number }; bar: Rect; text: Rect } {
  const B = D3_BOOT, off = Math.max(0, (hm - B.h) / 2);
  return {
    logo: { x: (360 - D3_LOGO.w * B.logoScale) / 2, y: B.logoTop + off, w: D3_LOGO.w * B.logoScale, h: D3_LOGO.h * B.logoScale, scale: B.logoScale }, // y = viewBox top
    bar: { x: B.barX, y: B.barY + off, w: 360 - 2 * B.barX, h: B.barH },
    text: { x: 0, y: B.textY + off, w: 360, h: B.textH },
  };
}

export interface LogoLetter { ch: string; color: string; rotDeg: number; dy: number }
/** P3b3-R13 letter styles from the mockup: colour cycles from `colorOffset`, tilt and lift alternate; a space is a gap. */
export function logoLetters(text: string, colorOffset: number): LogoLetter[] {
  const cols = TOKENS.menu.logoColors;
  let n = 0;
  return [...text].map((ch, i) => {
    if (ch === ' ') return { ch, color: '', rotDeg: 0, dy: 0 };
    const idx = n++;
    return { ch, color: cols[(idx + colorOffset) % cols.length]!, rotDeg: i % 2 ? 3 : -3, dy: i % 2 ? 2 : -2 };
  });
}

export interface LogoLine { key: 'logo.mango' | 'logo.snake'; y: number; backY: number; fill: string; stroke: string; strokePx: number; back: string; backStrokePx: number }
export interface LogoSpec { w: number; h: number; fontPx: number; lines: LogoLine[] }
// D3-R11 two-line logo in mock px from the logo top; y values are cap centres (text origin 0.5, 0.5).
export function logoSpec(scale: number): LogoSpec {
  const L = D3_LOGO, d = TOKENS.d3, mid = L.capMid * L.font;
  const line = (key: LogoLine['key'], base: number, fill: string, stroke: string): LogoLine => ({
    key, y: (base - mid) * scale, backY: (base - mid + L.drop) * scale, fill, stroke, strokePx: L.stroke * scale, back: d.inkDeep, backStrokePx: L.backStroke * scale });
  return { w: L.w * scale, h: L.h * scale, fontPx: L.font * scale,
    lines: [line('logo.mango', L.base[0], d.logo.mango, d.logo.mangoLine), line('logo.snake', L.base[1], d.white, d.ink)] };
}

export interface Pt { x: number; y: number }
/** P3b3-R13 HomeD2 snake trail: polyline with quadratic-rounded corners, sampled every ~step px. */
export function smoothPath(pts: readonly Pt[], r: number, step: number): Pt[] {
  const out: Pt[] = [pts[0]!];
  const line = (to: Pt): void => {
    const from = out[out.length - 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / step));
    for (let i = 1; i <= n; i++) out.push({ x: from.x + (to.x - from.x) * i / n, y: from.y + (to.y - from.y) * i / n });
  };
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i - 1]!, c = pts[i]!, nx = pts[i + 1]!;
    const l1 = Math.hypot(p.x - c.x, p.y - c.y), l2 = Math.hypot(nx.x - c.x, nx.y - c.y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a = { x: c.x + (p.x - c.x) / l1 * rr, y: c.y + (p.y - c.y) / l1 * rr };
    const b = { x: c.x + (nx.x - c.x) / l2 * rr, y: c.y + (nx.y - c.y) / l2 * rr };
    line(a);
    const steps = Math.max(2, Math.ceil(rr * ARC_SAMPLES_PER_PX / step));
    for (let s = 1; s <= steps; s++) {
      const u = s / steps;
      out.push({ x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * c.x + u * u * b.x, y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * c.y + u * u * b.y });
    }
  }
  line(pts[pts.length - 1]!);
  return out;
}

export interface Rect { x: number; y: number; w: number; h: number }
export interface HomeFlags { start: boolean; stepper: boolean; l1: boolean; loadout: boolean; hint: boolean }
export interface HomeRects {
  best: Rect; settings: Rect; logo: Rect & { scale: number }; hero: Rect; play: Rect;
  start?: Rect; prev?: Rect; next?: Rect; hint?: Rect; l1?: Rect; loadout?: Rect;
}
// D3-R11/R7 Home rects in mock px for a canvas `hm` mock px tall: anchors interpolate (and extrapolate up to 800) between the two boards.
export function homeRects(hm: number, f: HomeFlags): HomeRects {
  const D = D3_HOME, s = D.short, l = D.tall, u = (hm - s.h) / (l.h - s.h);
  const at = (k: keyof typeof s): number => s[k] + (l[k] - s[k]) * u;
  const W = 360, heroW = at('heroW');
  const r: HomeRects = {
    best: { x: D.side, y: at('chip') + D.bestDy, w: D.bestW, h: D.bestH },
    settings: { x: W - D.side - D.round, y: at('chip'), w: D.round, h: D.round },
    // inked text box only (D3_LOGO.textTop..textBottom); the logo viewBox top is y - textTop * scale
    logo: { x: (W - D3_LOGO.inkW * D.logoScale) / 2, y: at('logo') + D3_LOGO.textTop * D.logoScale, w: D3_LOGO.inkW * D.logoScale,
      h: (D3_LOGO.textBottom - D3_LOGO.textTop) * D.logoScale, scale: D.logoScale },
    hero: { x: (W - heroW) / 2, y: at('hero'), w: heroW, h: heroW * D.heroAspect },
    play: { x: D.playX, y: at('play'), w: W - 2 * D.playX, h: D.playH },
  };
  const sy = at('start');
  if (f.start) {
    r.start = { x: D.startX, y: sy, w: W - 2 * D.startX, h: D.startH };
    if (f.stepper) {
      r.prev = { x: D.startX - D.arrowGap - D.arrow, y: sy, w: D.arrow, h: D.arrow };
      r.next = { x: W - D.startX + D.arrowGap, y: sy, w: D.arrow, h: D.arrow };
    }
  } else if (f.hint) r.hint = { x: D.hintX, y: sy + (D.startH - D.hintH) / 2, w: W - 2 * D.hintX, h: D.hintH };
  const ly = at('links'), side = at('linkSide'), lw = at('linkW');
  if (f.l1 && f.loadout) { r.l1 = { x: side, y: ly, w: lw, h: D.linkH }; r.loadout = { x: W - side - lw, y: ly, w: lw, h: D.linkH }; }
  else if (f.l1) r.l1 = { x: (W - lw) / 2, y: ly, w: lw, h: D.linkH };
  else if (f.loadout) r.loadout = { x: (W - lw) / 2, y: ly, w: lw, h: D.linkH };
  return r;
}
