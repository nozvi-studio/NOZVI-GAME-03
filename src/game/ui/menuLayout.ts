import { WIDTH } from '../layout';
import { hitSize, ui, type ColumnSpec } from './layout';
import { TOKENS } from '../uiTokens';
import { D3_LOGO, MENU } from './menuMetrics';

/** UIFIX-R10 hit box of the "Start from L1" text link (mockup px): padded like a chip, same height as the chip row. */
export function l1Link(textWidthMock: number): { w: number; h: number } {
  return { w: textWidthMock + 2 * MENU.home.chips.padX, h: MENU.home.chipH };
}

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

/** P3b3-R3 Home: top = settings gear row + logo; middle = hero, stepper, Play, chips, hint; bottom = hill peek. */
export function homeColumn(f: { compact: boolean; stepper: boolean; extras: boolean; hint: boolean }, minShrink: number): Spec {
  const h = MENU.home, g = MENU.gap;
  const middle = h.hero.gap + h.hero.h + (f.stepper ? g + h.stepperH : 0) + g + (f.compact ? h.playHFirst : h.playH)
    + (f.extras ? g + h.chipH : 0) + (f.hint ? g + h.hintH : 0);
  return { top: head + g + MENU.logo.height, middle, bottom: h.hillPeek, minShrink };
}
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
/** Gap kept between the capy head overhang and whatever sits above the middle block (mockup px). */
const HEAD_CLEARANCE = 4;
/** Offset of the summary card inside the Results middle block: the capy head overhangs the card top, so the block reserves that room. */
export function resultsCardTop(): number {
  const r = MENU.results;
  return r.cardTop + Math.max(0, r.card.headOverlap - r.cardTop) + HEAD_CLEARANCE;
}
export function resultsColumn(f: { banner: boolean; energy: boolean }, minShrink: number): Spec {
  const r = MENU.results, g = MENU.section;
  const middle = resultsCardTop() + r.cardH + (f.energy ? g + r.energyH : 0) + (f.banner ? g + r.bannerH : 0) + g + r.progressH;
  return { top: head, middle, bottom: r.bottom + r.againH + MENU.gap, minShrink };
}
export function bootColumn(minShrink: number): Spec {
  const b = MENU.boot;
  return { top: b.top + MENU.logo.height, middle: b.heroGap + b.hero + b.barGap + b.barH + b.textGap + b.textH, bottom: 0, minShrink };
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
